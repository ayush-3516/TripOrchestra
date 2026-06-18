import { useState, type KeyboardEvent } from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';

const EXAMPLES = [
  'A five day trip somewhere warm in Europe for under £1500',
  'Plan a 3-day food and history trip to Lisbon',
  'A week of autumn hiking somewhere scenic, not Italy',
  'A romantic long weekend in Paris on a £900 budget',
];

interface Props {
  onSubmit: (query: string) => void;
  disabled: boolean;
  showExamples: boolean;
}

export function Composer({ onSubmit, disabled, showExamples }: Props) {
  const [value, setValue] = useState('');

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (trimmed && !disabled) onSubmit(trimmed);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(value);
    }
  };

  return (
    <div>
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100 dark:border-slate-700 dark:bg-slate-800">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          disabled={disabled}
          placeholder="Describe your trip — where, how long, what you like, your budget…"
          className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          onClick={() => submit(value)}
          disabled={disabled || !value.trim()}
          aria-label="Plan trip"
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>

      {showExamples && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
            <Sparkles className="h-3.5 w-3.5" /> Try
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => submit(ex)}
              disabled={disabled}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-sky-300 hover:text-sky-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
