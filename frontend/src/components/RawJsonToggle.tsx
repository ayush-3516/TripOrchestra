import { useState } from 'react';
import { Braces, ChevronDown } from 'lucide-react';

/** Collapsible raw structured output — the transparency / audit view per agent. */
export function RawJsonToggle({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="-my-2.5 inline-flex items-center gap-1.5 py-2.5 text-xs font-medium text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
      >
        <Braces className="h-3.5 w-3.5" />
        {open ? 'Hide' : 'Show'} raw output
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <pre className="scrollbar-thin mt-2 max-h-72 max-w-full overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
