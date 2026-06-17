import { config } from '../config';
import type { LLMClient } from './client';
import { GeminiClient } from './gemini';
import { GroqClient } from './groq';

export * from './client';

let singleton: LLMClient | null = null;

/** Returns the configured LLM client (constructed once). */
export function getLLM(): LLMClient {
  if (singleton) return singleton;
  singleton = config.llmProvider === 'groq' ? new GroqClient() : new GeminiClient();
  return singleton;
}
