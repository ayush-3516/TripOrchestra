import type { TripBrief } from '@shared/types';
import { getLLM, type ToolSpec } from '../llm';

/** Flat shape the model fills — flatter than TripBrief so it's easy for the model. */
interface RawBrief {
  destination?: string;
  region?: string;
  origin?: string;
  tripLengthDays?: number;
  budgetAmount?: number;
  budgetCurrency?: string;
  climate?: string;
  interests?: string[];
  hardConstraints?: string[];
}

const SYSTEM = `You normalise a traveller's free-text request into a structured brief.
Only fill a field if the user actually stated or clearly implied it — otherwise leave it out.
- "destination" is a specific place they already chose; leave empty if they want suggestions.
- "region" is an area limit like "Europe" or "Southeast Asia".
- "hardConstraints" are strict limits they gave, e.g. "no flight over 3 hours", "not Italy", "must be vegetarian-friendly".
- "interests" are themes like food, history, beaches, nightlife, hiking.`;

const tool: ToolSpec = {
  name: 'extract_trip_brief',
  description: 'Extract structured trip preferences from the request.',
  parameters: {
    type: 'object',
    properties: {
      destination: { type: 'string', description: 'A specific destination already chosen, if any.' },
      region: { type: 'string', description: 'A region/area constraint, e.g. Europe.' },
      origin: { type: 'string', description: 'Departure city/country, if mentioned.' },
      tripLengthDays: { type: 'integer', description: 'Number of days, if stated.' },
      budgetAmount: { type: 'number', description: 'Numeric budget, if stated.' },
      budgetCurrency: { type: 'string', description: 'ISO currency code, e.g. GBP, USD, EUR.' },
      climate: { type: 'string', description: 'Desired climate, e.g. warm, tropical, cool.' },
      interests: { type: 'array', items: { type: 'string' } },
      hardConstraints: { type: 'array', items: { type: 'string' } },
    },
    required: [],
  },
};

function detectCurrency(query: string): string {
  if (/£|\bgbp\b|pound/i.test(query)) return 'GBP';
  if (/\$|\busd\b|dollar/i.test(query)) return 'USD';
  if (/€|\beur\b|euro/i.test(query)) return 'EUR';
  return 'GBP';
}

const clean = (s?: string): string | null => (s && s.trim() ? s.trim() : null);

export async function runIntake(query: string): Promise<TripBrief> {
  const llm = getLLM();
  const raw = await llm.callTool<RawBrief>({
    systemPrompt: SYSTEM,
    userPrompt: `Traveller request:\n"${query}"`,
    tool,
    temperature: 0,
  });

  const currency = clean(raw.budgetCurrency) ?? detectCurrency(query);

  return {
    destination: clean(raw.destination),
    region: clean(raw.region),
    origin: clean(raw.origin),
    tripLengthDays: typeof raw.tripLengthDays === 'number' ? raw.tripLengthDays : null,
    budget: typeof raw.budgetAmount === 'number' ? { amount: raw.budgetAmount, currency } : null,
    climate: clean(raw.climate),
    interests: Array.isArray(raw.interests) ? raw.interests.filter(Boolean) : [],
    hardConstraints: Array.isArray(raw.hardConstraints) ? raw.hardConstraints.filter(Boolean) : [],
  };
}
