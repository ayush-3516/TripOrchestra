import { AlertTriangle, Car, Clock, MapPin } from 'lucide-react';
import type { ItineraryOutput } from '@shared/types';

export function ItineraryTimeline({ data }: { data: ItineraryOutput }) {
  return (
    <div className="space-y-4">
      {data.days.map((day) => (
        <div key={day.day} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
              {day.day}
            </span>
            <span className="font-semibold text-slate-800">{day.theme}</span>
          </div>
          <ol className="space-y-3 border-l border-slate-200 pl-4">
            {day.activities.map((a, idx) => (
              <li key={idx} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-violet-400 ring-4 ring-white" />
                <div className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {a.time}
                  </span>
                  <span className="text-slate-800">{a.activity}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {a.location}
                  </span>
                  {a.travelTimeMinutes > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {a.travelTimeMinutes} min travel
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}

      {data.uncertaintyNotes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Flagged as uncertain
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-700">
            {data.uncertaintyNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
