import { CalendarDays, MapPin, Wallet, type LucideIcon } from 'lucide-react';
import type { AgentName } from '@shared/types';

interface AgentMeta {
  label: string;
  blurb: string;
  Icon: LucideIcon;
  dot: string;
  chipBg: string;
  chipText: string;
  chipRing: string;
  bar: string;
  iconBg: string;
}

// Literal class strings (not interpolated) so Tailwind keeps them at build time.
export const AGENT_META: Record<AgentName, AgentMeta> = {
  destination: {
    label: 'Destination',
    blurb: 'Suggests where to go',
    Icon: MapPin,
    dot: 'bg-sky-500',
    chipBg: 'bg-sky-50',
    chipText: 'text-sky-700',
    chipRing: 'ring-sky-200',
    bar: 'bg-sky-500',
    iconBg: 'bg-sky-100 text-sky-600',
  },
  itinerary: {
    label: 'Itinerary',
    blurb: 'Plans the days',
    Icon: CalendarDays,
    dot: 'bg-violet-500',
    chipBg: 'bg-violet-50',
    chipText: 'text-violet-700',
    chipRing: 'ring-violet-200',
    bar: 'bg-violet-500',
    iconBg: 'bg-violet-100 text-violet-600',
  },
  budget: {
    label: 'Budget',
    blurb: 'Checks the cost',
    Icon: Wallet,
    dot: 'bg-emerald-500',
    chipBg: 'bg-emerald-50',
    chipText: 'text-emerald-700',
    chipRing: 'ring-emerald-200',
    bar: 'bg-emerald-500',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
};
