import { useEffect, useState } from 'react';
import { Compass, History as HistoryIcon, Loader2, Plus, TriangleAlert } from 'lucide-react';
import type { AgentName } from '@shared/types';
import { ALL_AGENTS } from '@shared/types';
import { usePlanStream } from './hooks/usePlanStream';
import { fetchRequest } from './api/plan';
import { AGENT_META } from './agentMeta';
import { Composer } from './components/Composer';
import { RouterNote } from './components/RouterNote';
import { AgentStrip } from './components/AgentStrip';
import { AnswerPanel } from './components/AnswerPanel';
import { AttributionCards } from './components/AttributionCards';
import { HistoryPanel } from './components/HistoryPanel';

export default function App() {
  const { state, run, showHistory, reset } = usePlanStream();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const idle = state.phase === 'idle';
  const streaming = state.phase === 'streaming';

  // Refresh history once a live request finishes.
  useEffect(() => {
    if (state.phase === 'done' && !state.fromHistory) setRefreshKey((k) => k + 1);
  }, [state.phase, state.fromHistory]);

  const onSelectHistory = async (id: string) => {
    try {
      const detail = await fetchRequest(id);
      showHistory(detail);
    } catch {
      /* surfaced via the panel; ignore here */
    }
  };

  const order: AgentName[] =
    state.router?.order ?? ALL_AGENTS.filter((a) => state.agentStatus[a] || state.outputs[a]);
  const showAnswer = state.answer.length > 0 || streaming;
  const waitingForAnswer = streaming && state.answer.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button onClick={reset} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
              <Compass className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-800">TripOrchestra</span>
          </button>
          <div className="flex items-center gap-2">
            {!idle && (
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> New trip
              </button>
            )}
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <HistoryIcon className="h-4 w-4" /> History
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {idle && (
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Plan a trip with three specialist agents
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-slate-500">
              Describe your trip in plain language. TripOrchestra routes it across a Destination,
              Itinerary, and Budget agent — and shows you exactly who did what.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {ALL_AGENTS.map((a) => {
                const m = AGENT_META[a];
                return (
                  <div key={a} className="rounded-xl border border-slate-200 bg-white p-4 text-left">
                    <span className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}>
                      <m.Icon className="h-5 w-5" />
                    </span>
                    <div className="font-semibold text-slate-800">{m.label}</div>
                    <div className="text-sm text-slate-500">{m.blurb}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Composer onSubmit={run} disabled={streaming} showExamples={idle} />

        {!idle && (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">You asked</div>
              <p className="mt-0.5 text-slate-800">{state.query}</p>
            </div>

            {state.router && <RouterNote decision={state.router} />}
            {order.length > 0 && <AgentStrip order={order} agentStatus={state.agentStatus} />}

            {state.phase === 'error' && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{state.errorMessage ?? 'Something went wrong.'}</span>
              </div>
            )}

            {waitingForAnswer && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Agents are working…
              </div>
            )}

            {showAnswer && (
              <AnswerPanel
                answer={state.answer}
                streaming={streaming}
                instant={state.fromHistory || state.phase === 'error'}
              />
            )}

            <AttributionCards
              order={order}
              outputs={state.outputs}
              agentStatus={state.agentStatus}
              contributions={state.contributions}
            />
          </div>
        )}
      </main>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={onSelectHistory}
        refreshKey={refreshKey}
      />
    </div>
  );
}
