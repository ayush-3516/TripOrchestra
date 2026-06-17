/**
 * Provider-agnostic LLM interface. The orchestrator and agents depend only on
 * this contract, so swapping Gemini for Groq is a one-file change (see groq.ts)
 * selected by the LLM_PROVIDER env var.
 *
 * Two capabilities, matching how the app uses the model:
 *  - callTool():   force a single function call and return its typed arguments.
 *                  This is how every agent and the router produce structured
 *                  output — no brittle "parse JSON out of prose".
 *  - streamText(): stream a plain-text completion token-by-token, used by the
 *                  synthesizer to drive the realtime typing effect over SSE.
 */

/** A minimal JSON-Schema node (the universal vocabulary; each adapter maps it). */
export interface JsonSchema {
  type?: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array';
  description?: string;
  enum?: string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
}

export interface ToolSpec {
  name: string;
  description: string;
  /** Top-level object schema describing the function's arguments. */
  parameters: JsonSchema;
}

export interface CallToolOptions {
  systemPrompt: string;
  userPrompt: string;
  tool: ToolSpec;
  temperature?: number;
}

export interface StreamTextOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface LLMClient {
  readonly model: string;
  /** Forces the model to call `tool` and returns the parsed arguments as T. */
  callTool<T>(opts: CallToolOptions): Promise<T>;
  /** Streams a plain-text completion. */
  streamText(opts: StreamTextOptions): AsyncIterable<string>;
}

/** Thrown for any model-call failure: timeout, transport error, or no/invalid call. */
export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
  }
}

/** Rejects if `p` doesn't settle within `ms`. Used to bound every model call. */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new LLMError(`${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export const LLM_TIMEOUT_MS = 25_000;
