import { Route } from 'lucide-react';
import type { RouterDecision } from '@shared/types';

/** Shows the orchestrator's routing decision — which agents and why. */
export function RouterNote({ decision }: { decision: RouterDecision }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
        <Route className="h-4 w-4 text-indigo-500" />
        Orchestrator routed to {decision.order.length} agent{decision.order.length === 1 ? '' : 's'}
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
            decision.decidedBy === 'llm'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          }`}
        >
          {decision.decidedBy === 'llm' ? 'LLM router' : 'heuristic'}
        </span>
      </div>
      {decision.reasoning && <p className="mt-1 text-slate-500 dark:text-slate-400">{decision.reasoning}</p>}
    </div>
  );
}
