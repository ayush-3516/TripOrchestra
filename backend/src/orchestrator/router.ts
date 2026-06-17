import { ALL_AGENTS, type AgentName, type RouterDecision, type TripBrief } from '@shared/types';
import { getLLM, type ToolSpec } from '../llm';

/** Canonical chain order: a place to go, then a plan, then a price for that plan. */
function orderAgents(set: Set<AgentName>): AgentName[] {
  return ALL_AGENTS.filter((a) => set.has(a));
}

/**
 * Cheap, deterministic routing for the common, clear cases. Returns an empty
 * set only when the request is too vague to tell — then we fall back to the LLM.
 */
function heuristicRoute(query: string, brief: TripBrief): {
  agents: AgentName[];
  reasoning: string;
} {
  const q = query.toLowerCase();
  const needed = new Set<AgentName>();
  const reasons: string[] = [];

  const seekingPlace =
    !brief.destination &&
    (brief.region !== null ||
      brief.climate !== null ||
      brief.interests.length > 0 ||
      /\b(where|suggest|recommend|somewhere|ideas?|destination)\b/.test(q));
  if (seekingPlace) {
    needed.add('destination');
    reasons.push('no specific destination was named, so suggestions are needed');
  }

  if (
    brief.tripLengthDays !== null ||
    /\b(itinerar|day[- ]by[- ]day|plan|schedule|things to do|what to do|visit)\b/.test(q)
  ) {
    needed.add('itinerary');
    reasons.push('a day-by-day plan or a trip length was requested');
  }

  if (brief.budget !== null || /\b(budget|cost|cheap|afford|under|spend|price)\b|[£$€]/.test(q)) {
    needed.add('budget');
    reasons.push('a budget or cost concern is present');
  }

  // Dependencies: budget prices a concrete itinerary; an itinerary needs a place.
  if (needed.has('budget')) needed.add('itinerary');
  if ((needed.has('itinerary') || needed.has('budget')) && !brief.destination) {
    needed.add('destination');
  }

  return { agents: orderAgents(needed), reasoning: reasons.join('; ') };
}

const routerTool: ToolSpec = {
  name: 'route_request',
  description: 'Decide which specialist agents are needed for this trip request.',
  parameters: {
    type: 'object',
    properties: {
      agentsNeeded: {
        type: 'array',
        items: { type: 'string', enum: ['destination', 'itinerary', 'budget'] },
        description: 'The agents required, any order (the system re-orders them).',
      },
      reasoning: { type: 'string' },
    },
    required: ['agentsNeeded', 'reasoning'],
  },
};

const ROUTER_SYSTEM = `You route a trip request to specialist agents.
- destination: suggests where to go when the user has not chosen a place.
- itinerary: builds a day-by-day plan for a chosen destination and length.
- budget: estimates the cost of a plan and checks it against a stated budget.
Pick only the agents the request actually needs. An itinerary needs a destination;
a budget needs an itinerary.`;

async function llmRoute(query: string, brief: TripBrief): Promise<RouterDecision> {
  const llm = getLLM();
  const out = await llm.callTool<{ agentsNeeded?: AgentName[]; reasoning?: string }>({
    systemPrompt: ROUTER_SYSTEM,
    userPrompt: `Request: "${query}"\nExtracted brief: ${JSON.stringify(brief)}`,
    tool: routerTool,
    temperature: 0,
  });

  const set = new Set<AgentName>(
    (out.agentsNeeded ?? []).filter((a): a is AgentName => ALL_AGENTS.includes(a)),
  );
  if (set.size === 0) set.add('destination'); // never return nothing
  if (set.has('budget')) set.add('itinerary');
  if ((set.has('itinerary') || set.has('budget')) && !brief.destination) set.add('destination');
  const order = orderAgents(set);

  return {
    agentsNeeded: order,
    order,
    reasoning: out.reasoning?.trim() || 'Decided by the LLM router.',
    decidedBy: 'llm',
  };
}

/**
 * Routes a request: heuristics first (fast, deterministic, auditable), and the
 * LLM router only when the heuristics can't tell what's needed.
 */
export async function routeRequest(query: string, brief: TripBrief): Promise<RouterDecision> {
  const h = heuristicRoute(query, brief);
  if (h.agents.length > 0) {
    return { agentsNeeded: h.agents, order: h.agents, reasoning: h.reasoning, decidedBy: 'heuristic' };
  }
  return llmRoute(query, brief);
}
