import type { AgentName, StructuredOutputs, TripBrief } from '@shared/types';
import { getLLM } from '../llm';

const SYSTEM = `You are TripOrchestra's synthesizer. You merge the specialist agents' structured
findings into ONE warm, clear answer for the traveller, formatted in markdown.

Rules:
- Open with a one or two sentence summary of the recommendation.
- Add a "##" section only for agents that actually ran: Destination, Itinerary, Budget.
- Reference the real data. Summarise the arc of the itinerary (don't list every single line).
  For budget, state the total, whether it fits the budget, and the cheaper alternative if it is over.
- If there are uncertainty notes, surface them honestly under the itinerary.
- Never invent data the agents didn't provide. Be concise but genuinely useful.`;

function buildPrompt(query: string, brief: TripBrief, outputs: StructuredOutputs): string {
  return [
    `Traveller's original request: "${query}"`,
    `Structured brief: ${JSON.stringify(brief)}`,
    '',
    'Agent findings (only the agents that ran are present):',
    JSON.stringify(outputs, null, 2),
    '',
    'Write the synthesised answer now.',
  ].join('\n');
}

/** Streams the synthesised markdown answer token-by-token. */
export async function* synthesize(opts: {
  query: string;
  brief: TripBrief;
  outputs: StructuredOutputs;
  agentsUsed: AgentName[];
}): AsyncGenerator<string> {
  const llm = getLLM();
  yield* llm.streamText({
    systemPrompt: SYSTEM,
    userPrompt: buildPrompt(opts.query, opts.brief, opts.outputs),
    temperature: 0.7,
  });
}
