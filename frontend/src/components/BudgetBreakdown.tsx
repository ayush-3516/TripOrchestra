import { CheckCircle2, Lightbulb, Plane, Hotel, Utensils, Ticket, Bus, TriangleAlert } from 'lucide-react';
import type { BudgetBreakdown as Breakdown, BudgetOutput } from '@shared/types';

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

const ROWS: { key: keyof Breakdown; label: string; Icon: typeof Plane }[] = [
  { key: 'flights', label: 'Flights', Icon: Plane },
  { key: 'lodging', label: 'Lodging', Icon: Hotel },
  { key: 'food', label: 'Food', Icon: Utensils },
  { key: 'activities', label: 'Activities', Icon: Ticket },
  { key: 'transport', label: 'Transport', Icon: Bus },
];

export function BudgetBreakdown({ data }: { data: BudgetOutput }) {
  const within = data.withinBudget;
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm">
            <tbody>
              {ROWS.map(({ key, label, Icon }) => (
                <tr key={key} className="border-b border-slate-100 last:border-0 dark:border-slate-700">
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-400" />
                      {label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-800 dark:text-slate-100">
                    {money(data.breakdown[key], data.currency)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 dark:bg-slate-900">
                <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-100">Estimated total</td>
                <td className="px-4 py-2.5 text-right text-base font-bold text-slate-900 dark:text-slate-100">
                  {money(data.estimatedTotal, data.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
          within ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
        }`}
      >
        {within ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
        {within
          ? 'Within budget'
          : `Over budget by ${money(data.overageAmount ?? 0, data.currency)}`}
      </div>

      {!within && data.cheaperAlternative && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <Lightbulb className="h-4 w-4" />
            Cheaper alternative
          </div>
          <p className="mt-1 text-sm text-amber-700">{data.cheaperAlternative}</p>
        </div>
      )}
    </div>
  );
}
