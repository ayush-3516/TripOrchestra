import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import type {
  AgentRunResult,
  HistoryItem,
  PlanStatus,
  RequestDetail,
} from '@shared/types';

const AGENT_NAMES = ['destination', 'itinerary', 'budget'] as const;
const STATUSES: PlanStatus[] = ['pending', 'success', 'partial', 'error'];

const BudgetSchema = new Schema(
  { amount: { type: Number, required: true }, currency: { type: String, required: true } },
  { _id: false },
);

const TripBriefSchema = new Schema(
  {
    destination: { type: String, default: null },
    region: { type: String, default: null },
    origin: { type: String, default: null },
    tripLengthDays: { type: Number, default: null },
    budget: { type: BudgetSchema, default: null },
    climate: { type: String, default: null },
    interests: { type: [String], default: [] },
    hardConstraints: { type: [String], default: [] },
  },
  { _id: false },
);

/**
 * One agent invocation — the atomic unit of the audit trail. Embedded in the
 * parent Request so the full per-request history lives in a single document.
 */
const AgentRunSchema = new Schema(
  {
    agentName: { type: String, enum: AGENT_NAMES, required: true },
    stepOrder: { type: Number, required: true },
    input: { type: Schema.Types.Mixed },
    output: { type: Schema.Types.Mixed, default: null },
    model: { type: String, required: true },
    latencyMs: { type: Number, default: null },
    error: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ContributionSchema = new Schema(
  {
    agent: { type: String, enum: AGENT_NAMES, required: true },
    summary: { type: String, required: true },
  },
  { _id: false },
);

const RouterSchema = new Schema(
  {
    agentsNeeded: { type: [String], default: [] },
    order: { type: [String], default: [] },
    reasoning: { type: String, default: '' },
    decidedBy: { type: String, enum: ['heuristic', 'llm'], default: 'heuristic' },
  },
  { _id: false },
);

const RequestSchema = new Schema(
  {
    userRole: { type: String, default: 'traveler' },
    rawQuery: { type: String, required: true },
    tripBrief: { type: TripBriefSchema, default: () => ({}) },
    status: { type: String, enum: STATUSES, default: 'pending' },
    router: { type: RouterSchema, default: null },
    agentsUsed: { type: [String], default: [] },
    finalAnswer: { type: String, default: '' },
    contributions: { type: [ContributionSchema], default: [] },
    structuredOutputs: { type: Schema.Types.Mixed, default: null },
    runs: { type: [AgentRunSchema], default: [] },
  },
  { timestamps: true }, // adds createdAt + updatedAt
);

// History queries sort newest-first.
RequestSchema.index({ createdAt: -1 });

export type RequestSchemaType = InferSchemaType<typeof RequestSchema>;
export type RequestDoc = HydratedDocument<RequestSchemaType>;

export const RequestModel = model('Request', RequestSchema);

// ---------------------------------------------------------------------------
// Mappers — turn a Mongo document into the API contract shapes.
// ---------------------------------------------------------------------------

export function toHistoryItem(doc: RequestDoc): HistoryItem {
  return {
    id: doc.id,
    createdAt: doc.createdAt.toISOString(),
    rawQuery: doc.rawQuery,
    agentsUsed: doc.agentsUsed as HistoryItem['agentsUsed'],
    status: doc.status as PlanStatus,
  };
}

export function toRequestDetail(doc: RequestDoc): RequestDetail {
  const runs: AgentRunResult[] = doc.runs.map((r) => ({
    agentName: r.agentName as AgentRunResult['agentName'],
    stepOrder: r.stepOrder,
    input: r.input ?? null,
    output: r.output ?? null,
    model: r.model,
    latencyMs: r.latencyMs ?? null,
    error: r.error ?? null,
    createdAt: (r.createdAt ?? new Date()).toISOString(),
  }));

  return {
    ...toHistoryItem(doc),
    tripBrief: doc.tripBrief as unknown as RequestDetail['tripBrief'],
    router: (doc.router as unknown as RequestDetail['router']) ?? null,
    finalAnswer: doc.finalAnswer,
    contributions: doc.contributions as RequestDetail['contributions'],
    structuredOutputs: (doc.structuredOutputs as RequestDetail['structuredOutputs']) ?? {},
    runs,
  };
}
