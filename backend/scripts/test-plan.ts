/**
 * Drives the full orchestration pipeline directly (no HTTP) so we can see each
 * stage and time it. Run: npm run test:plan
 */
import { connectDB, disconnectDB } from '../src/db';
import { executePlan } from '../src/orchestrator';

async function main() {
  console.log('connecting…');
  await connectDB();
  console.log('connected. running executePlan…');

  const t0 = Date.now();
  const res = await executePlan(
    'a five day trip somewhere warm in Europe for under £1500, not Italy',
    (e) => {
      if (e.type === 'token') process.stdout.write('.');
      else console.log(`\n[${Date.now() - t0}ms] ${e.type}`);
    },
  );

  console.log(`\n\nDONE in ${Date.now() - t0}ms`);
  console.log('status:', res.status, '| agents:', res.agentsUsed.join(', '));
  console.log('answer length:', res.finalAnswer.length);
  await disconnectDB();
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
