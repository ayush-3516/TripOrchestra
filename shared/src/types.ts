/**
 * Shared contracts between the backend orchestrator and the React frontend.
 * One source of truth for the agent / orchestration types so neither side
 * re-derives the shape of an agent's output.
 */

export type AgentName = 'destination' | 'itinerary' | 'budget';

export const ALL_AGENTS: AgentName[] = ['destination', 'itinerary', 'budget'];

/** Rough price tier used by the Destination agent before real numbers exist. */
export type CostBand = 'budget' | 'moderate' | 'premium';

export type PlanStatus = 'pending' | 'success' | 'partial' | 'error';

// ---------------------------------------------------------------------------
// Intake — the structured brief extracted from the user's free-text request.
// ---------------------------------------------------------------------------

export interface TripBrief {
  /** A destination the user already named, else null (then Destination agent runs). */
  destination: string | null;
  /** A region/area the user constrained to, e.g. "Europe", "Southeast Asia". */
  region: string | null;
  /** Departure city/country if the user mentioned one. */
  origin: string | null;
  tripLengthDays: number | null;
  budget: { amount: number; currency: string } | null;
  /** e.g. "warm", "tropical", "cool". */
  climate: string | null;
  interests: string[];
  /** Hard limits the agents must never break, e.g. "no flight over 3 hours", "not Italy". */
  hardConstraints: string[];
}

// ---------------------------------------------------------------------------
// Agent output shapes — these double as the function-call parameter schemas.
// ---------------------------------------------------------------------------

export interface DestinationSuggestion {
  name: string;
  country: string;
  /** Must reference a stated preference; enforced in code, not just the prompt. */
  justification: string;
  estCostBand: CostBand;
}

export interface DestinationOutput {
  suggestions: DestinationSuggestion[];
  notes: string;
}

export interface ItineraryActivity {
  /** e.g. "09:00" or "Morning". */
  time: string;
  activity: string;
  location: string;
  /** Travel time to reach this activity from the previous one. */
  travelTimeMinutes: number;
}

export interface ItineraryDay {
  day: number;
  theme: string;
  activities: ItineraryActivity[];
}

export interface ItineraryOutput {
  destination: string;
  days: ItineraryDay[];
  /** Must be present (enforced in code). Flags unrealistic timing / seasonal doubt. */
  uncertaintyNotes: string[];
}

export interface BudgetBreakdown {
  flights: number;
  lodging: number;
  food: number;
  activities: number;
  transport: number;
}

export interface BudgetOutput {
  estimatedTotal: number;
  currency: string;
  withinBudget: boolean;
  breakdown: BudgetBreakdown;
  /** When over budget, both of these are required (enforced in code). */
  overageAmount?: number;
  cheaperAlternative?: string;
}

export interface AgentOutputMap {
  destination: DestinationOutput;
  itinerary: ItineraryOutput;
  budget: BudgetOutput;
}

export interface StructuredOutputs {
  destination?: DestinationOutput;
  itinerary?: ItineraryOutput;
  budget?: BudgetOutput;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface RouterDecision {
  agentsNeeded: AgentName[];
  order: AgentName[];
  reasoning: string;
  /** "heuristic" when decided by rules, "llm" when the model router was consulted. */
  decidedBy: 'heuristic' | 'llm';
}

export interface Contribution {
  agent: AgentName;
  summary: string;
}

// ---------------------------------------------------------------------------
// Audit trail (mirror of the persisted Mongo subdocument)
// ---------------------------------------------------------------------------

export interface AgentRunResult {
  agentName: AgentName;
  stepOrder: number;
  input: unknown;
  output: unknown | null;
  model: string;
  latencyMs: number | null;
  error: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// HTTP API
// ---------------------------------------------------------------------------

export interface PlanRequest {
  query: string;
}

export interface PlanResponse {
  requestId: string;
  status: PlanStatus;
  rawQuery: string;
  tripBrief: TripBrief;
  router: RouterDecision;
  agentsUsed: AgentName[];
  finalAnswer: string;
  contributions: Contribution[];
  structuredOutputs: StructuredOutputs;
}

export interface HistoryItem {
  id: string;
  createdAt: string;
  rawQuery: string;
  agentsUsed: AgentName[];
  status: PlanStatus;
}

export interface RequestDetail extends HistoryItem {
  tripBrief: TripBrief;
  router: RouterDecision | null;
  finalAnswer: string;
  contributions: Contribution[];
  structuredOutputs: StructuredOutputs;
  runs: AgentRunResult[];
}

// ---------------------------------------------------------------------------
// SSE events streamed from POST /api/plan/stream
// ---------------------------------------------------------------------------

export type PlanStreamEvent =
  | { type: 'request_created'; requestId: string }
  | { type: 'intake'; tripBrief: TripBrief }
  | { type: 'router'; decision: RouterDecision }
  | { type: 'agent_start'; agent: AgentName; stepOrder: number }
  | {
      type: 'agent_done';
      agent: AgentName;
      summary: string;
      output: DestinationOutput | ItineraryOutput | BudgetOutput;
    }
  | { type: 'agent_error'; agent: AgentName; error: string }
  | { type: 'token'; text: string }
  | { type: 'final'; response: PlanResponse }
  | { type: 'error'; message: string };
