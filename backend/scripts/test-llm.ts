/**
 * Standalone check that the LLM key + function calling + streaming all work
 * BEFORE any agent is built on top. Run: npm run test:llm
 */
import { getLLM } from '../src/llm';

async function main() {
  const llm = getLLM();
  console.log(`Provider model: ${llm.model}\n`);

  // 1) Forced function call -> typed args
  console.log('[1] callTool (forced function calling)…');
  const args = await llm.callTool<{ city: string; country: string }>({
    systemPrompt: 'You extract structured travel data. Always call the function.',
    userPrompt: 'I want to visit the city of lights, the capital of France.',
    tool: {
      name: 'record_city',
      description: 'Record a city and its country.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name' },
          country: { type: 'string', description: 'Country name' },
        },
        required: ['city', 'country'],
      },
    },
  });
  console.log('    ->', args, '\n');

  // 2) Streaming text -> token-by-token
  console.log('[2] streamText (token stream):');
  process.stdout.write('    ');
  let chars = 0;
  for await (const t of llm.streamText({
    systemPrompt: 'You are a concise, friendly travel assistant.',
    userPrompt: 'Welcome a traveler to TripOrchestra in exactly two short sentences.',
  })) {
    process.stdout.write(t);
    chars += t.length;
  }
  console.log(`\n\n[ok] streamed ${chars} characters. LLM client is working.`);
}

main().catch((err) => {
  console.error('\n[fail]', err);
  process.exit(1);
});
