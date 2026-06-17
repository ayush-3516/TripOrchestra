import type { BudgetOutput, ItineraryOutput } from '@shared/types';
import { getLLM, type ToolSpec } from '../llm';
import { reconcileBudget } from './validators';
import { withCorrectiveRetry } from './runner';

export interface BudgetInput {
  itinerary: ItineraryOutput;
  budget: { amount: number; currency: string } | null;
  origin: string | null;
  tripLengthDays: number;
}

const SYSTEM = `You are the Budget Agent in a multi-agent trip planner.
You estimate the total cost of a plan and check it against the traveller's budget.

Hard rules you MUST obey:
- NEVER silently exceed the budget. If your estimated total is above the stated budget, set
  withinBudget to false AND provide a concrete "cheaperAlternative" (a specific way to cut cost —
  cheaper lodging tier, fewer paid activities, shoulder-season travel, a nearer destination, etc.).
- Break the cost down into flights, lodging, food, activities, and transport, in the budget's
  currency. Use sensible per-day estimates for a mid-range traveller.
- Be realistic, not optimistic.`;

const tool: ToolSpec = {
  name: 'provide_budget',
  description: "Return a cost estimate and whether it fits the traveller's budget.",
  parameters: {
    type: 'object',
    properties: {
      estimatedTotal: { type: 'number', description: 'Total estimated cost.' },
      currency: { type: 'string', description: 'ISO currency code, e.g. GBP.' },
      withinBudget: { type: 'boolean' },
      breakdown: {
        type: 'object',
        properties: {
          flights: { type: 'number' },
          lodging: { type: 'number' },
          food: { type: 'number' },
          activities: { type: 'number' },
          transport: { type: 'number' },
        },
        required: ['flights', 'lodging', 'food', 'activities', 'transport'],
      },
      overageAmount: {
        type: 'number',
        description: 'How far over budget, if over. Omit or 0 if within budget.',
      },
      cheaperAlternative: {
        type: 'string',
        description: 'REQUIRED when over budget: a concrete cheaper plan.',
      },
    },
    required: ['estimatedTotal', 'currency', 'withinBudget', 'breakdown'],
  },
};

function buildPrompt(input: BudgetInput): string {
  const dayCount = input.itinerary.days.length || input.tripLengthDays;
  const activityCount = input.itinerary.days.reduce((n, d) => n + d.activities.length, 0);
  return [
    `Destination: ${input.itinerary.destination}`,
    `Trip length: ${dayCount} days`,
    `Departing from: ${input.origin ?? 'unspecified'}`,
    `Budget: ${input.budget ? `${input.budget.amount} ${input.budget.currency}` : 'no explicit budget given — still estimate the total cost'}`,
    `The itinerary has ${activityCount} planned activities across ${dayCount} days.`,
    '',
    'Itinerary themes by day:',
    ...input.itinerary.days.map((d) => `- Day ${d.day}: ${d.theme}`),
    '',
    'Estimate the cost and check it against the budget. If over, you MUST give a cheaperAlternative.',
  ].join('\n');
}

export async function runBudgetAgent(input: BudgetInput): Promise<BudgetOutput> {
  const llm = getLLM();
  const base = buildPrompt(input);
  return withCorrectiveRetry(async (corrective) => {
    const raw = await llm.callTool<BudgetOutput>({
      systemPrompt: SYSTEM,
      userPrompt: base + corrective,
      tool,
      temperature: 0.4,
    });
    // Recompute the total + within-budget flag from the breakdown, and enforce
    // the "over budget ⇒ cheaperAlternative" rule (may throw ⇒ one retry).
    return reconcileBudget(raw, input.budget);
  });
}
