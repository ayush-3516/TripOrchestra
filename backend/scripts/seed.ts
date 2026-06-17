/**
 * Inserts one fake Request with two embedded AgentRun children, then reads it
 * back — a smoke test that the Mongo connection + schema work end to end.
 *
 *   npm run seed   (from repo root: npm run seed)
 */
import { connectDB, disconnectDB } from '../src/db';
import { RequestModel, toRequestDetail } from '../src/models/request';

async function main() {
  await connectDB();

  const doc = await RequestModel.create({
    rawQuery: '[seed] a five day trip somewhere warm in Europe for under £1500',
    status: 'success',
    tripBrief: {
      destination: null,
      region: 'Europe',
      origin: null,
      tripLengthDays: 5,
      budget: { amount: 1500, currency: 'GBP' },
      climate: 'warm',
      interests: ['food', 'history'],
      hardConstraints: [],
    },
    router: {
      agentsNeeded: ['destination', 'itinerary', 'budget'],
      order: ['destination', 'itinerary', 'budget'],
      reasoning: 'No destination named; budget present; trip length present.',
      decidedBy: 'heuristic',
    },
    agentsUsed: ['destination', 'itinerary'],
    finalAnswer: 'Seed answer — Lisbon, Portugal for a warm, food-focused five days.',
    contributions: [
      { agent: 'destination', summary: 'Suggested Lisbon, Seville, Valencia.' },
      { agent: 'itinerary', summary: 'Built a 5-day Lisbon plan.' },
    ],
    runs: [
      {
        agentName: 'destination',
        stepOrder: 0,
        input: { climate: 'warm', region: 'Europe' },
        output: { suggestions: [{ name: 'Lisbon', country: 'Portugal' }] },
        model: 'gemini-2.5-flash',
        latencyMs: 812,
      },
      {
        agentName: 'itinerary',
        stepOrder: 1,
        input: { destination: 'Lisbon', tripLengthDays: 5 },
        output: { days: [{ day: 1, theme: 'Old town' }] },
        model: 'gemini-2.5-flash',
        latencyMs: 1340,
      },
    ],
  });

  console.log('Inserted Request:', doc.id);
  console.log('Detail mapping:', JSON.stringify(toRequestDetail(doc), null, 2));
  console.log('Total Request documents:', await RequestModel.countDocuments());

  await disconnectDB();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDB();
  process.exit(1);
});
