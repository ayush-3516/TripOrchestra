import type { DestinationOutput, TripBrief } from '@shared/types';
import { getLLM, type ToolSpec } from '../llm';
import { validateDestination } from './validators';
import { withCorrectiveRetry } from './runner';

const SYSTEM = `You are the Destination Agent in a multi-agent trip planner.
Your only job is to suggest 2-4 real destinations that fit the traveller's stated preferences.

Hard rules you MUST obey:
- Every suggestion's "justification" must reference at least one preference the traveller actually
  stated (their climate, interests, budget band, region, or trip length). No generic praise.
- NEVER suggest a destination that breaks a hard constraint the traveller gave (e.g. a place they
  said to avoid, or outside a region they required).
- If a region is specified, every suggestion must be inside that region.
- Keep justifications concrete and specific (one or two sentences).`;

const tool: ToolSpec = {
  name: 'provide_destinations',
  description: 'Return destination suggestions that fit the traveller preferences.',
  parameters: {
    type: 'object',
    properties: {
      suggestions: {
        type: 'array',
        description: '2-4 destination suggestions, best fit first.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'City or place name.' },
            country: { type: 'string' },
            justification: {
              type: 'string',
              description: 'Why it fits, referencing a specific stated preference.',
            },
            estCostBand: {
              type: 'string',
              enum: ['budget', 'moderate', 'premium'],
              description: 'Rough price tier for this destination given the trip.',
            },
          },
          required: ['name', 'country', 'justification', 'estCostBand'],
        },
      },
      notes: {
        type: 'string',
        description: 'A short overall note, e.g. trade-offs or seasonal caveats.',
      },
    },
    required: ['suggestions', 'notes'],
  },
};

function buildPrompt(brief: TripBrief): string {
  const lines = [
    'Traveller preferences:',
    `- Region/area: ${brief.region ?? 'no specific region given'}`,
    `- Climate wanted: ${brief.climate ?? 'unspecified'}`,
    `- Interests: ${brief.interests.length ? brief.interests.join(', ') : 'unspecified'}`,
    `- Trip length: ${brief.tripLengthDays ? `${brief.tripLengthDays} days` : 'unspecified'}`,
    `- Budget: ${brief.budget ? `${brief.budget.amount} ${brief.budget.currency}` : 'unspecified'}`,
    `- Departing from: ${brief.origin ?? 'unspecified'}`,
    `- Hard constraints (must never break): ${
      brief.hardConstraints.length ? brief.hardConstraints.join('; ') : 'none'
    }`,
    '',
    'Suggest destinations that fit. Justify each against a stated preference.',
  ];
  return lines.join('\n');
}

export async function runDestinationAgent(brief: TripBrief): Promise<DestinationOutput> {
  const llm = getLLM();
  const base = buildPrompt(brief);
  return withCorrectiveRetry(async (corrective) => {
    const out = await llm.callTool<DestinationOutput>({
      systemPrompt: SYSTEM,
      userPrompt: base + corrective,
      tool,
      temperature: 0.7,
    });
    validateDestination(out, brief);
    return out;
  });
}
