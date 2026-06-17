import type {
  BudgetOutput,
  DestinationOutput,
  ItineraryOutput,
  TripBrief,
} from '@shared/types';

/**
 * Code-enforced behavioural rules. The system prompts ask the model to obey
 * these, but we never trust the model alone — every agent runs its output
 * through these checks, and a failure triggers one corrective retry.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const COST_BANDS = new Set(['budget', 'moderate', 'premium']);

/**
 * Pulls "avoid this place" tokens out of free-text hard constraints, e.g.
 * "not Italy", "avoid Paris", "no cruises". Pragmatic, covers the common case
 * the assignment calls out ("must never recommend a destination that breaks a
 * hard constraint").
 */
export function extractAvoidances(constraints: string[]): string[] {
  const out: string[] = [];
  const re = /\b(?:not|avoid|no|except|excluding|but not)\s+([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*)?)/gi;
  for (const c of constraints) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(c)) !== null) {
      const token = m[1]?.trim().toLowerCase();
      if (token && token.length >= 3) out.push(token);
    }
  }
  return out;
}

/** Destination rule: justified suggestions, none breaking an avoid-constraint. */
export function validateDestination(out: DestinationOutput, brief: TripBrief): void {
  if (!Array.isArray(out.suggestions) || out.suggestions.length === 0) {
    throw new ValidationError('Destination agent returned no suggestions.');
  }
  const avoid = extractAvoidances(brief.hardConstraints);
  for (const s of out.suggestions) {
    if (!s.name?.trim() || !s.country?.trim()) {
      throw new ValidationError('A suggestion is missing its name or country.');
    }
    if (!s.justification || s.justification.trim().length < 15) {
      throw new ValidationError(
        `Suggestion "${s.name}" lacks a substantive justification tied to a stated preference.`,
      );
    }
    if (!COST_BANDS.has(s.estCostBand)) {
      throw new ValidationError(`Suggestion "${s.name}" has an invalid cost band "${s.estCostBand}".`);
    }
    const haystack = `${s.name} ${s.country}`.toLowerCase();
    for (const a of avoid) {
      if (haystack.includes(a)) {
        throw new ValidationError(
          `Suggestion "${s.name}, ${s.country}" violates the hard constraint to avoid "${a}".`,
        );
      }
    }
  }
}

/** Itinerary rule: it must always be able to flag uncertainty, and be non-empty. */
export function validateItinerary(out: ItineraryOutput): void {
  if (!Array.isArray(out.uncertaintyNotes)) {
    throw new ValidationError(
      'Itinerary is missing the uncertaintyNotes array — it must always be able to flag uncertainty.',
    );
  }
  if (!Array.isArray(out.days) || out.days.length === 0) {
    throw new ValidationError('Itinerary returned no days.');
  }
  for (const d of out.days) {
    if (!Array.isArray(d.activities) || d.activities.length === 0) {
      throw new ValidationError(`Day ${d.day} has no activities.`);
    }
    for (const a of d.activities) {
      if (!a.activity?.trim()) {
        throw new ValidationError(`Day ${d.day} has an activity with no description.`);
      }
      if (typeof a.travelTimeMinutes !== 'number' || a.travelTimeMinutes < 0) {
        throw new ValidationError(
          `Day ${d.day} activity "${a.activity}" has an invalid travelTimeMinutes.`,
        );
      }
    }
  }
}

const round = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

/**
 * Budget rule: never silently exceed budget. We don't trust the model's
 * arithmetic — we recompute the total from the breakdown and re-derive the
 * within-budget flag from the actual numbers. If it's over budget, a concrete
 * cheaperAlternative is mandatory (else we throw and retry).
 */
export function reconcileBudget(
  out: BudgetOutput,
  budget: { amount: number; currency: string } | null,
): BudgetOutput {
  const b = out.breakdown ?? { flights: 0, lodging: 0, food: 0, activities: 0, transport: 0 };
  const breakdown = {
    flights: round(b.flights),
    lodging: round(b.lodging),
    food: round(b.food),
    activities: round(b.activities),
    transport: round(b.transport),
  };
  const total = round(
    breakdown.flights + breakdown.lodging + breakdown.food + breakdown.activities + breakdown.transport,
  );

  const reconciled: BudgetOutput = {
    ...out,
    breakdown,
    estimatedTotal: total,
    currency: out.currency || budget?.currency || 'GBP',
  };

  if (budget) {
    reconciled.withinBudget = total <= budget.amount;
    if (reconciled.withinBudget) {
      reconciled.overageAmount = undefined;
      reconciled.cheaperAlternative = undefined;
    } else {
      reconciled.overageAmount = round(total - budget.amount);
      if (!reconciled.cheaperAlternative?.trim()) {
        throw new ValidationError(
          `Plan is over budget by ${reconciled.overageAmount} ${reconciled.currency} but no cheaperAlternative was provided.`,
        );
      }
    }
  } else {
    // No stated budget — nothing to exceed.
    reconciled.withinBudget = true;
    reconciled.overageAmount = undefined;
    reconciled.cheaperAlternative = undefined;
  }

  return reconciled;
}
