import type { PlanResponse, PlanStatus, PlanStreamEvent } from '@shared/types';
import { getLLM } from '../llm';
import { RequestModel } from '../models/request';
import { runIntake } from './intake';
import { routeRequest } from './router';
import { runChain } from './chain';
import { synthesize } from './synthesizer';

const noop = () => {};

/**
 * The full orchestration pipeline for one request:
 *   create audit record → intake → route → chain agents → synthesize → persist.
 * `emit` receives SSE events as it runs; pass noop for the non-streaming path.
 */
export async function executePlan(
  query: string,
  emit: (e: PlanStreamEvent) => void = noop,
): Promise<PlanResponse> {
  const model = getLLM().model;

  // 1. Audit record up front so even a mid-pipeline failure is logged.
  const doc = await RequestModel.create({ rawQuery: query, status: 'pending' });
  emit({ type: 'request_created', requestId: doc.id });

  try {
    // 2. Intake — structured brief from free text.
    const brief = await runIntake(query);
    doc.set('tripBrief', brief);
    emit({ type: 'intake', tripBrief: brief });

    // 3. Route — which agents, in what order.
    const decision = await routeRequest(query, brief);
    doc.set('router', decision);
    emit({ type: 'router', decision });

    // 4. Chain — run the agents, passing context forward.
    const chain = await runChain({ brief, order: decision.order, model, emit });

    // 5. Synthesize — stream a narrative, or a graceful message if all failed.
    let finalAnswer = '';
    if (chain.agentsUsed.length === 0) {
      finalAnswer =
        "I'm sorry — I couldn't complete this request because the agents failed to respond. Please try again in a moment.";
      emit({ type: 'token', text: finalAnswer });
    } else {
      for await (const token of synthesize({
        query,
        brief,
        outputs: chain.structuredOutputs,
        agentsUsed: chain.agentsUsed,
      })) {
        finalAnswer += token;
        emit({ type: 'token', text: token });
      }
    }

    // 6. Persist final state.
    const status: PlanStatus =
      chain.agentsUsed.length === 0 ? 'error' : chain.anyError ? 'partial' : 'success';
    doc.set('status', status);
    doc.set('agentsUsed', chain.agentsUsed);
    doc.set('finalAnswer', finalAnswer);
    doc.set('contributions', chain.contributions);
    doc.set('structuredOutputs', chain.structuredOutputs);
    doc.set('runs', chain.runs);
    await doc.save();

    const response: PlanResponse = {
      requestId: doc.id,
      status,
      rawQuery: query,
      tripBrief: brief,
      router: decision,
      agentsUsed: chain.agentsUsed,
      finalAnswer,
      contributions: chain.contributions,
      structuredOutputs: chain.structuredOutputs,
    };
    emit({ type: 'final', response });
    return response;
  } catch (err) {
    // Persist the failure here; the transport layer owns emitting the error
    // event / HTTP response so it's reported exactly once.
    doc.set('status', 'error');
    await doc.save().catch(() => {});
    throw err;
  }
}
