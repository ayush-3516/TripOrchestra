import 'dotenv/config';

/** Throws a friendly error if a required secret is missing at the moment it's needed. */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required env var ${name}. Copy backend/.env.example to backend/.env and fill it in.`,
    );
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  llmProvider: (process.env.LLM_PROVIDER ?? 'gemini').toLowerCase() as 'gemini' | 'groq',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  /** Allowed CORS origins in production (empty in dev — Vite proxy serves same-origin). */
  corsOrigins: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Secrets are read lazily so the health check and scaffold run without them.
  get geminiApiKey(): string {
    return required('GEMINI_API_KEY');
  },
  get mongoUri(): string {
    return required('MONGODB_URI');
  },
};
