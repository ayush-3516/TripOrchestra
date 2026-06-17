import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { AgentName } from '@shared/types';
import { AGENT_META } from '../agentMeta';
import type { AgentState } from '../hooks/usePlanStream';

interface Props {
  order: AgentName[];
  agentStatus: Partial<Record<AgentName, AgentState>>;
}

/** Live strip showing each routed agent move through queued → running → done/error. */
export function AgentStrip({ order, agentStatus }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {order.map((agent, i) => {
        const meta = AGENT_META[agent];
        const state = agentStatus[agent]?.status ?? 'queued';
        const running = state === 'running';
        const done = state === 'done';
        const errored = state === 'error';

        return (
          <div key={agent} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                done || running || errored
                  ? `${meta.chipBg} ${meta.chipText} ${meta.chipRing}`
                  : 'bg-slate-50 text-slate-400 ring-slate-200'
              }`}
            >
              <span className="flex h-4 w-4 items-center justify-center">
                {running && <Loader2 className="h-4 w-4 animate-spin" />}
                {done && <Check className="h-4 w-4" />}
                {errored && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {state === 'queued' && <span className={`h-2 w-2 rounded-full ${meta.dot} opacity-40`} />}
              </span>
              {meta.label}
            </div>
            {i < order.length - 1 && <span className="text-slate-300">→</span>}
          </div>
        );
      })}
    </div>
  );
}
