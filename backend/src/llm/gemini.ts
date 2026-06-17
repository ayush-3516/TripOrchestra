import {
  GoogleGenAI,
  Type,
  FunctionCallingConfigMode,
  type Schema,
} from '@google/genai';
import { config } from '../config';
import {
  type CallToolOptions,
  type JsonSchema,
  type LLMClient,
  type StreamTextOptions,
  LLMError,
  withTimeout,
  LLM_TIMEOUT_MS,
} from './client';

const TYPE_MAP: Record<NonNullable<JsonSchema['type']>, Type> = {
  object: Type.OBJECT,
  string: Type.STRING,
  number: Type.NUMBER,
  integer: Type.INTEGER,
  boolean: Type.BOOLEAN,
  array: Type.ARRAY,
};

/** Translates our portable JsonSchema into the Gemini SDK's Schema shape. */
function toGeminiSchema(node: JsonSchema): Schema {
  const out: Schema = {};
  if (node.type) out.type = TYPE_MAP[node.type];
  if (node.description) out.description = node.description;
  if (node.enum) out.enum = node.enum;
  if (node.properties) {
    out.properties = Object.fromEntries(
      Object.entries(node.properties).map(([k, v]) => [k, toGeminiSchema(v)]),
    );
  }
  if (node.required) out.required = node.required;
  if (node.items) out.items = toGeminiSchema(node.items);
  return out;
}

export class GeminiClient implements LLMClient {
  readonly model: string;
  private readonly ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    this.model = config.geminiModel;
  }

  async callTool<T>({ systemPrompt, userPrompt, tool, temperature }: CallToolOptions): Promise<T> {
    const response = await withTimeout(
      this.ai.models.generateContent({
        model: this.model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: temperature ?? 0.6,
          tools: [
            {
              functionDeclarations: [
                {
                  name: tool.name,
                  description: tool.description,
                  parameters: toGeminiSchema(tool.parameters),
                },
              ],
            },
          ],
          // Force exactly this function call — no free-text fallback.
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.ANY,
              allowedFunctionNames: [tool.name],
            },
          },
        },
      }),
      LLM_TIMEOUT_MS,
      `callTool(${tool.name})`,
    );

    const call = response.functionCalls?.[0];
    if (!call || call.name !== tool.name || !call.args) {
      throw new LLMError(
        `Model did not call ${tool.name}. Text was: ${response.text ?? '(none)'}`,
      );
    }
    return call.args as T;
  }

  async *streamText({ systemPrompt, userPrompt, temperature }: StreamTextOptions): AsyncIterable<string> {
    const stream = await this.ai.models.generateContentStream({
      model: this.model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: temperature ?? 0.8,
      },
    });
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }
}
