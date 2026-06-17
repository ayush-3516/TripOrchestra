import {
  type CallToolOptions,
  type LLMClient,
  type StreamTextOptions,
  LLMError,
} from './client';

/**
 * Groq is intentionally a documented stub. The whole point of the LLMClient
 * interface is that this is the *only* file you'd write to switch providers.
 *
 * Groq exposes an OpenAI-compatible Chat Completions API, so a real impl would:
 *   - POST https://api.groq.com/openai/v1/chat/completions
 *   - map ToolSpec -> `tools: [{ type:'function', function:{ name, description,
 *     parameters } }]` (our JsonSchema is already OpenAI-shaped) and force the
 *     call with `tool_choice: { type:'function', function:{ name } }`
 *   - read `choices[0].message.tool_calls[0].function.arguments` (JSON.parse) for callTool()
 *   - set `stream: true` and yield `choices[0].delta.content` chunks for streamText()
 * Model e.g. `llama-3.3-70b-versatile`, key from GROQ_API_KEY.
 */
export class GroqClient implements LLMClient {
  readonly model = 'llama-3.3-70b-versatile';

  async callTool<T>(_opts: CallToolOptions): Promise<T> {
    throw new LLMError(
      'Groq provider is a stub. Set LLM_PROVIDER=gemini, or implement groq.ts (see comments).',
    );
  }

  // eslint-disable-next-line require-yield
  async *streamText(_opts: StreamTextOptions): AsyncIterable<string> {
    throw new LLMError(
      'Groq provider is a stub. Set LLM_PROVIDER=gemini, or implement groq.ts (see comments).',
    );
  }
}
