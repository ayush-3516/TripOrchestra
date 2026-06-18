import { MapPin } from 'lucide-react';
import type { CostBand, DestinationOutput } from '@shared/types';

const BAND_STYLE: Record<CostBand, string> = {
  budget: 'bg-emerald-100 text-emerald-700',
  moderate: 'bg-amber-100 text-amber-700',
  premium: 'bg-rose-100 text-rose-700',
};

export function DestinationCards({ data }: { data: DestinationOutput }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {data.suggestions.map((s) => (
          <div key={`${s.name}-${s.country}`} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                <MapPin className="h-4 w-4 text-sky-500" />
                {s.name}
                <span className="font-normal text-slate-400">· {s.country}</span>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${BAND_STYLE[s.estCostBand] ?? 'bg-slate-100 text-slate-600'}`}>
                {s.estCostBand}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{s.justification}</p>
          </div>
        ))}
      </div>
      {data.notes && <p className="text-sm italic text-slate-500 dark:text-slate-400">{data.notes}</p>}
    </div>
  );
}
