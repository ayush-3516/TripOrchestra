import { useEffect, useState } from 'react';
import { Compass, History as HistoryIcon, Loader2, Moon, Plus, Sun, TriangleAlert } from 'lucide-react';
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
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { state, run, showHistory, reset, cancel } = usePlanStream();
  const { theme, toggle } = useTheme();
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button onClick={reset} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
              <Compass className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">TripOrchestra</span>
          </button>
          <div className="flex items-center gap-2">
            {!idle && (
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New trip</span>
              </button>
            )}
            <button
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <HistoryIcon className="h-4 w-4" /> <span className="hidden sm:inline">History</span>
            </button>
          </div>
        </div>
      </header>

      <main className={`mx-auto px-4 py-8 ${idle ? 'max-w-3xl' : 'max-w-6xl'}`}>
        {idle && (
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Plan a trip with three specialist agents
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-slate-500 dark:text-slate-400">
              Describe your trip in plain language. TripOrchestra routes it across a Destination,
              Itinerary, and Budget agent — and shows you exactly who did what.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {ALL_AGENTS.map((a) => {
                const m = AGENT_META[a];
                return (
                  <div key={a} className="rounded-xl border border-slate-200 bg-white p-4 text-left dark:border-slate-700 dark:bg-slate-800">
                    <span className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}>
                      <m.Icon className="h-5 w-5" />
                    </span>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{m.label}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{m.blurb}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Composer onSubmit={run} disabled={streaming} showExamples={idle} streaming={streaming} onStop={cancel} />

        {!idle && (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">You asked</div>
              <p className="mt-0.5 text-slate-800 dark:text-slate-200">{state.query}</p>
            </div>

            {state.router && <RouterNote decision={state.router} />}
            {order.length > 0 && <AgentStrip order={order} agentStatus={state.agentStatus} />}

            {state.phase === 'error' && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{state.errorMessage ?? 'Something went wrong.'}</span>
              </div>
            )}

            {waitingForAnswer && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Agents are working…
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
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
