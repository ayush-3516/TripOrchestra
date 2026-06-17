import type { DestinationOutput, ItineraryOutput } from '@shared/types';
import { getLLM, type ToolSpec } from '../llm';
import { validateItinerary } from './validators';
import { withCorrectiveRetry } from './runner';

export interface ItineraryInput {
  destination: string;
  tripLengthDays: number;
  interests: string[];
  /** Optional context if the Destination agent ran first in the chain. */
  destinationContext?: DestinationOutput;
}

const SYSTEM = `You are the Itinerary Agent in a multi-agent trip planner.
You build a realistic day-by-day plan for ONE destination and a given trip length.

Hard rules you MUST obey:
- Be realistic about travel time and sequencing. Set "travelTimeMinutes" honestly for getting
  between consecutive activities; do not cram a day with activities that are far apart.
- You MUST flag uncertainty in "uncertaintyNotes": anything you are unsure about — seasonal
  opening hours, possible closures, tight timing, or anything that might not be realistic.
  Only leave it empty if you are genuinely certain about everything.
- 3-5 activities per day is sensible. Give each day a short theme.`;

const tool: ToolSpec = {
  name: 'provide_itinerary',
  description: 'Return a realistic day-by-day itinerary for the destination.',
  parameters: {
    type: 'object',
    properties: {
      destination: { type: 'string' },
      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'integer', description: 'Day number, starting at 1.' },
            theme: { type: 'string', description: 'Short theme for the day.' },
            activities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string', description: 'e.g. "09:00" or "Morning".' },
                  activity: { type: 'string' },
                  location: { type: 'string' },
                  travelTimeMinutes: {
                    type: 'integer',
                    description: 'Minutes to travel here from the previous activity (0 for the first).',
                  },
                },
                required: ['time', 'activity', 'location', 'travelTimeMinutes'],
              },
            },
          },
          required: ['day', 'theme', 'activities'],
        },
      },
      uncertaintyNotes: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Things you are uncertain about (seasonal hours, tight timing, closures). Empty only if truly none.',
      },
    },
    required: ['destination', 'days', 'uncertaintyNotes'],
  },
};

function buildPrompt(input: ItineraryInput): string {
  const ctx = input.destinationContext?.suggestions
    ?.map((s) => `${s.name}, ${s.country} — ${s.justification}`)
    .join('\n');
  return [
    `Destination: ${input.destination}`,
    `Trip length: ${input.tripLengthDays} days`,
    `Traveller interests: ${input.interests.length ? input.interests.join(', ') : 'general sightseeing'}`,
    ctx ? `\nContext from the Destination agent:\n${ctx}` : '',
    '\nBuild a realistic day-by-day plan. Flag anything uncertain.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function runItineraryAgent(input: ItineraryInput): Promise<ItineraryOutput> {
  const llm = getLLM();
  const base = buildPrompt(input);
  return withCorrectiveRetry(async (corrective) => {
    const out = await llm.callTool<ItineraryOutput>({
      systemPrompt: SYSTEM,
      userPrompt: base + corrective,
      tool,
      temperature: 0.7,
    });
    validateItinerary(out);
    return out;
  });
}
