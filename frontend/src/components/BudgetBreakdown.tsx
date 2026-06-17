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
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <tbody>
            {ROWS.map(({ key, label, Icon }) => (
              <tr key={key} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-400" />
                    {label}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-medium text-slate-800">
                  {money(data.breakdown[key], data.currency)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td className="px-4 py-2.5 font-semibold text-slate-700">Estimated total</td>
              <td className="px-4 py-2.5 text-right text-base font-bold text-slate-900">
                {money(data.estimatedTotal, data.currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
          within ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
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
