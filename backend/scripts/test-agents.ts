/**
 * Verifies the three agents. The behavioural-rule checks run offline (no API
 * key needed); the live agent calls run only when GEMINI_API_KEY is set.
 *
 *   npm run test:agents
 */
import type { BudgetOutput, ItineraryOutput, TripBrief } from '@shared/types';
import {
  ValidationError,
  validateItinerary,
  reconcileBudget,
  extractAvoidances,
} from '../src/agents/validators';
import { runDestinationAgent, runItineraryAgent, runBudgetAgent } from '../src/agents';

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`  ${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}
function expectThrow(name: string, fn: () => void) {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = e instanceof ValidationError;
  }
  check(name, threw);
}

function offlineValidatorTests() {
  console.log('\n[offline] behavioural-rule validators');

  // extractAvoidances pulls "not Italy" -> "italy"
  check('extractAvoidances("not Italy") -> italy', extractAvoidances(['not Italy']).includes('italy'));

  // Itinerary missing uncertaintyNotes is rejected
  expectThrow('itinerary without uncertaintyNotes is rejected', () =>
    validateItinerary({ destination: 'X', days: [{ day: 1, theme: 't', activities: [{ time: '9', activity: 'a', location: 'l', travelTimeMinutes: 0 }] }] } as unknown as ItineraryOutput),
  );

  // Over budget without cheaperAlternative is rejected
  expectThrow('over-budget without cheaperAlternative is rejected', () =>
    reconcileBudget(
      {
        estimatedTotal: 2000,
        currency: 'GBP',
        withinBudget: true, // model lied; reconcile recomputes
        breakdown: { flights: 800, lodging: 700, food: 300, activities: 100, transport: 100 },
      } as BudgetOutput,
      { amount: 1500, currency: 'GBP' },
    ),
  );

  // Over budget WITH cheaperAlternative reconciles correctly
  const reconciled = reconcileBudget(
    {
      estimatedTotal: 0,
      currency: 'GBP',
      withinBudget: true,
      breakdown: { flights: 800, lodging: 700, food: 300, activities: 100, transport: 100 },
      cheaperAlternative: 'Travel in shoulder season and use a 3-star hotel.',
    } as BudgetOutput,
    { amount: 1500, currency: 'GBP' },
  );
  check('reconcile recomputes total from breakdown (2000)', reconciled.estimatedTotal === 2000);
  check('reconcile marks over budget', reconciled.withinBudget === false);
  check('reconcile sets overageAmount (500)', reconciled.overageAmount === 500);
}

async function liveAgentTests() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('\n[skip] live agent calls — set GEMINI_API_KEY in backend/.env to run them.');
    return;
  }
  console.log('\n[live] calling the agents via Gemini…');

  const brief: TripBrief = {
    destination: null,
    region: 'Europe',
    origin: 'London',
    tripLengthDays: 5,
    budget: { amount: 1500, currency: 'GBP' },
    climate: 'warm',
    interests: ['food', 'history'],
    hardConstraints: ['not Italy'],
  };

  console.log('  → Destination agent');
  const dest = await runDestinationAgent(brief);
  check('destination returned >=1 suggestion', dest.suggestions.length >= 1);
  check('no suggestion is in Italy (hard constraint)', dest.suggestions.every((s) => !/italy/i.test(`${s.name} ${s.country}`)));
  console.log('    ', dest.suggestions.map((s) => `${s.name} (${s.estCostBand})`).join(', '));

  const chosen = dest.suggestions[0]!;
  console.log(`  → Itinerary agent for ${chosen.name}`);
  const itin = await runItineraryAgent({
    destination: `${chosen.name}, ${chosen.country}`,
    tripLengthDays: 5,
    interests: brief.interests,
    destinationContext: dest,
  });
  check('itinerary has 5 days', itin.days.length === 5);
  check('itinerary has uncertaintyNotes array', Array.isArray(itin.uncertaintyNotes));

  console.log('  → Budget agent');
  const budget = await runBudgetAgent({ itinerary: itin, budget: brief.budget, origin: brief.origin, tripLengthDays: 5 });
  check('budget total equals breakdown sum', budget.estimatedTotal === Math.round((budget.breakdown.flights + budget.breakdown.lodging + budget.breakdown.food + budget.breakdown.activities + budget.breakdown.transport) * 100) / 100);
  check('over-budget implies cheaperAlternative present', budget.withinBudget || !!budget.cheaperAlternative);
  console.log(`    total ${budget.estimatedTotal} ${budget.currency}, withinBudget=${budget.withinBudget}`);
}

async function main() {
  offlineValidatorTests();
  await liveAgentTests();
  console.log(`\n${failures === 0 ? '[ok] all checks passed' : `[fail] ${failures} check(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\n[fail]', err);
  process.exit(1);
});
