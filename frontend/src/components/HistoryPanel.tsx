import { useEffect, useState } from 'react';
import { Clock, Loader2, X } from 'lucide-react';
import type { HistoryItem, PlanStatus } from '@shared/types';
import { fetchHistory } from '../api/plan';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  refreshKey: number;
}

const STATUS_STYLE: Record<PlanStatus, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  error: 'bg-rose-100 text-rose-700',
  pending: 'bg-slate-100 text-slate-500',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function HistoryPanel({ open, onClose, onSelect, refreshKey }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetchHistory(25)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [open, refreshKey]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Request history</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {error && <p className="px-1 py-8 text-center text-sm text-rose-600">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="px-1 py-8 text-center text-sm text-slate-400">No requests yet — plan a trip first.</p>
          )}

          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => {
                    onSelect(it.id);
                    onClose();
                  }}
                  className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-700 dark:hover:border-sky-500 dark:hover:bg-sky-950/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-medium text-slate-700 dark:text-slate-200">{it.rawQuery}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[it.status]}`}>
                      {it.status}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(it.createdAt)}
                    </span>
                    {it.agentsUsed.length > 0 && <span>· {it.agentsUsed.join(' → ')}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
