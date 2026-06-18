import { AlertTriangle } from 'lucide-react';
import type {
  AgentName,
  BudgetOutput,
  Contribution,
  DestinationOutput,
  ItineraryOutput,
  StructuredOutputs,
} from '@shared/types';
import { AGENT_META } from '../agentMeta';
import type { AgentState } from '../hooks/usePlanStream';
import { DestinationCards } from './DestinationCards';
import { ItineraryTimeline } from './ItineraryTimeline';
import { BudgetBreakdown } from './BudgetBreakdown';
import { RawJsonToggle } from './RawJsonToggle';

interface Props {
  order: AgentName[];
  outputs: StructuredOutputs;
  agentStatus: Partial<Record<AgentName, AgentState>>;
  contributions: Contribution[];
}

function renderOutput(agent: AgentName, outputs: StructuredOutputs) {
  switch (agent) {
    case 'destination':
      return outputs.destination ? <DestinationCards data={outputs.destination as DestinationOutput} /> : null;
    case 'itinerary':
      return outputs.itinerary ? <ItineraryTimeline data={outputs.itinerary as ItineraryOutput} /> : null;
    case 'budget':
      return outputs.budget ? <BudgetBreakdown data={outputs.budget as BudgetOutput} /> : null;
  }
}

/** One labelled, colour-coded card per contributing agent — the transparency view. */
export function AttributionCards({ order, outputs, agentStatus, contributions }: Props) {
  const cards = order
    .map((agent) => {
      const state = agentStatus[agent];
      const errored = state?.status === 'error';
      const body = renderOutput(agent, outputs);
      if (!errored && !body) return null; // still pending — strip shows progress
      return { agent, errored, body, error: state?.error };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (cards.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Agent contributions
      </h2>
      {cards.map(({ agent, errored, body, error }) => {
        const meta = AGENT_META[agent];
        const summary = contributions.find((c) => c.agent === agent)?.summary;
        return (
          <section key={agent} className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-start gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}>
                <meta.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 dark:text-slate-100">{meta.label} Agent</div>
                {summary && !errored && <div className="text-sm text-slate-500 dark:text-slate-400">{summary}</div>}
              </div>
            </div>

            {errored ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>This agent failed and was skipped: {error}</span>
              </div>
            ) : (
              <>
                {body}
                <RawJsonToggle data={outputs[agent]} />
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
