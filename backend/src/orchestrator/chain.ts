import type {
  AgentName,
  Contribution,
  DestinationOutput,
  ItineraryOutput,
  BudgetOutput,
  PlanStreamEvent,
  StructuredOutputs,
  TripBrief,
} from '@shared/types';
import { runBudgetAgent, runDestinationAgent, runItineraryAgent } from '../agents';

/** One persisted audit row (mirrors the embedded AgentRun subdocument). */
export interface AgentRunRecord {
  agentName: AgentName;
  stepOrder: number;
  input: unknown;
  output: unknown | null;
  model: string;
  latencyMs: number;
  error: string | null;
  createdAt: Date;
}

export interface ChainResult {
  structuredOutputs: StructuredOutputs;
  contributions: Contribution[];
  runs: AgentRunRecord[];
  /** Agents that completed successfully, in run order. */
  agentsUsed: AgentName[];
  anyError: boolean;
}

function summarize(agent: AgentName, output: DestinationOutput | ItineraryOutput | BudgetOutput): string {
  switch (agent) {
    case 'destination': {
      const o = output as DestinationOutput;
      return `Suggested ${o.suggestions.map((s) => s.name).join(', ')}.`;
    }
    case 'itinerary': {
      const o = output as ItineraryOutput;
      const activities = o.days.reduce((n, d) => n + d.activities.length, 0);
      const notes = o.uncertaintyNotes.length ? `, ${o.uncertaintyNotes.length} uncertainty note(s)` : '';
      return `Built a ${o.days.length}-day plan for ${o.destination} (${activities} activities${notes}).`;
    }
    case 'budget': {
      const o = output as BudgetOutput;
      return o.withinBudget
        ? `Estimated ${o.estimatedTotal} ${o.currency} — within budget.`
        : `Estimated ${o.estimatedTotal} ${o.currency} — over budget; proposed a cheaper alternative.`;
    }
  }
}

/**
 * Runs the agents in `order`, feeding each prior agent's output into the next
 * (Destination's pick → Itinerary's destination → Budget's plan). Every attempt
 * is recorded as an AgentRunRecord. A failing agent is logged and skipped so the
 * request degrades to a partial answer instead of failing outright.
 */
export async function runChain(opts: {
  brief: TripBrief;
  order: AgentName[];
  model: string;
  emit: (e: PlanStreamEvent) => void;
}): Promise<ChainResult> {
  const { brief, order, model, emit } = opts;

  const structuredOutputs: StructuredOutputs = {};
  const contributions: Contribution[] = [];
  const runs: AgentRunRecord[] = [];
  const agentsUsed: AgentName[] = [];
  let anyError = false;

  // The destination carried forward: a named one, or the Destination agent's pick.
  let chosenDestination: string | null = brief.destination;

  for (const [stepOrder, agent] of order.entries()) {
    emit({ type: 'agent_start', agent, stepOrder });
    const startedAt = Date.now();
    let input: unknown = null;
    let output: DestinationOutput | ItineraryOutput | BudgetOutput | null = null;
    let error: string | null = null;

    try {
      if (agent === 'destination') {
        input = brief;
        const out = await runDestinationAgent(brief);
        output = out;
        structuredOutputs.destination = out;
        const top = out.suggestions[0];
        if (top) chosenDestination = `${top.name}, ${top.country}`;
      } else if (agent === 'itinerary') {
        const destination = chosenDestination ?? brief.destination;
        if (!destination) throw new Error('No destination available to build an itinerary.');
        const itineraryInput = {
          destination,
          tripLengthDays: brief.tripLengthDays ?? 3,
          interests: brief.interests,
          destinationContext: structuredOutputs.destination,
        };
        input = itineraryInput;
        const out = await runItineraryAgent(itineraryInput);
        output = out;
        structuredOutputs.itinerary = out;
      } else {
        if (!structuredOutputs.itinerary) {
          throw new Error('No itinerary available to estimate a budget.');
        }
        const budgetInput = {
          itinerary: structuredOutputs.itinerary,
          budget: brief.budget,
          origin: brief.origin,
          tripLengthDays: brief.tripLengthDays ?? structuredOutputs.itinerary.days.length,
        };
        input = budgetInput;
        const out = await runBudgetAgent(budgetInput);
        output = out;
        structuredOutputs.budget = out;
      }

      const summary = summarize(agent, output);
      agentsUsed.push(agent);
      contributions.push({ agent, summary });
      emit({ type: 'agent_done', agent, summary, output });
    } catch (e) {
      anyError = true;
      error = e instanceof Error ? e.message : String(e);
      console.error(`[chain] ${agent} failed:`, error);
      emit({ type: 'agent_error', agent, error });
    }

    runs.push({
      agentName: agent,
      stepOrder,
      input,
      output,
      model,
      latencyMs: Date.now() - startedAt,
      error,
      createdAt: new Date(),
    });
  }

  return { structuredOutputs, contributions, runs, agentsUsed, anyError };
}
