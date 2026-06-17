import { useCallback, useReducer, useRef } from 'react';
import type {
  AgentName,
  Contribution,
  PlanStatus,
  PlanStreamEvent,
  RequestDetail,
  RouterDecision,
  StructuredOutputs,
  TripBrief,
} from '@shared/types';
import { streamPlan } from '../api/plan';

export type AgentStatus = 'queued' | 'running' | 'done' | 'error';

export interface AgentState {
  status: AgentStatus;
  summary?: string;
  error?: string;
}

export interface PlanState {
  phase: 'idle' | 'streaming' | 'done' | 'error';
  query: string;
  /** True when rendering a past request loaded from history (no live stream). */
  fromHistory: boolean;
  requestId?: string;
  tripBrief?: TripBrief;
  router?: RouterDecision;
  agentStatus: Partial<Record<AgentName, AgentState>>;
  outputs: StructuredOutputs;
  answer: string;
  contributions: Contribution[];
  finalStatus?: PlanStatus;
  errorMessage?: string;
}

const initialState: PlanState = {
  phase: 'idle',
  query: '',
  fromHistory: false,
  agentStatus: {},
  outputs: {},
  answer: '',
  contributions: [],
};

type Action =
  | { kind: 'start'; query: string }
  | { kind: 'event'; event: PlanStreamEvent }
  | { kind: 'fail'; message: string }
  | { kind: 'hydrate'; state: PlanState }
  | { kind: 'reset' };

function setAgent(
  map: PlanState['agentStatus'],
  agent: AgentName,
  patch: Partial<AgentState>,
): PlanState['agentStatus'] {
  return { ...map, [agent]: { ...(map[agent] ?? { status: 'queued' }), ...patch } };
}

function reduceEvent(state: PlanState, event: PlanStreamEvent): PlanState {
  switch (event.type) {
    case 'request_created':
      return { ...state, requestId: event.requestId };
    case 'intake':
      return { ...state, tripBrief: event.tripBrief };
    case 'router': {
      const agentStatus: PlanState['agentStatus'] = {};
      for (const a of event.decision.order) agentStatus[a] = { status: 'queued' };
      return { ...state, router: event.decision, agentStatus };
    }
    case 'agent_start':
      return { ...state, agentStatus: setAgent(state.agentStatus, event.agent, { status: 'running' }) };
    case 'agent_done':
      return {
        ...state,
        agentStatus: setAgent(state.agentStatus, event.agent, { status: 'done', summary: event.summary }),
        outputs: { ...state.outputs, [event.agent]: event.output },
      };
    case 'agent_error':
      return {
        ...state,
        agentStatus: setAgent(state.agentStatus, event.agent, { status: 'error', error: event.error }),
      };
    case 'token':
      return { ...state, answer: state.answer + event.text };
    case 'final':
      return {
        ...state,
        outputs: event.response.structuredOutputs,
        contributions: event.response.contributions,
        finalStatus: event.response.status,
        phase: 'done',
      };
    case 'error':
      return { ...state, phase: 'error', errorMessage: event.message };
    default:
      return state;
  }
}

function reducer(state: PlanState, action: Action): PlanState {
  switch (action.kind) {
    case 'start':
      return { ...initialState, phase: 'streaming', query: action.query };
    case 'event':
      return reduceEvent(state, action.event);
    case 'fail':
      return { ...state, phase: 'error', errorMessage: action.message };
    case 'hydrate':
      return action.state;
    case 'reset':
      return initialState;
  }
}

/** Builds a static PlanState from a past request fetched from history. */
function fromDetail(detail: RequestDetail): PlanState {
  const agentStatus: PlanState['agentStatus'] = {};
  for (const run of detail.runs) {
    agentStatus[run.agentName] = run.error
      ? { status: 'error', error: run.error }
      : { status: 'done' };
  }
  return {
    phase: 'done',
    query: detail.rawQuery,
    fromHistory: true,
    requestId: detail.id,
    tripBrief: detail.tripBrief,
    router: detail.router ?? undefined,
    agentStatus,
    outputs: detail.structuredOutputs,
    answer: detail.finalAnswer,
    contributions: detail.contributions,
    finalStatus: detail.status,
  };
}

export function usePlanStream() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    dispatch({ kind: 'start', query });
    try {
      await streamPlan(query, (event) => dispatch({ kind: 'event', event }), ctrl.signal);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      dispatch({ kind: 'fail', message: e instanceof Error ? e.message : 'Something went wrong' });
    }
  }, []);

  const showHistory = useCallback((detail: RequestDetail) => {
    abortRef.current?.abort();
    dispatch({ kind: 'hydrate', state: fromDetail(detail) });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ kind: 'reset' });
  }, []);

  return { state, run, showHistory, reset };
}
