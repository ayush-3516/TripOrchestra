# TripOrchestra

A multi-agent trip planner. You describe a trip in plain language — *"a five day trip somewhere
warm in Europe for under £1500"* — and an **orchestration layer** routes the request across three
specialist AI agents, chains them when one depends on another, and synthesises a single, attributed
answer that streams back token-by-token.

> Built for a senior full-stack take-home. The orchestration layer is the core; the three agents
> rely only on the language model's general knowledge (no dataset required).

---

## What it does

```
                       ┌──────────────────────── Orchestrator ────────────────────────┐
  "5 days, warm        │  1. Intake     free text ──(function call)──▶ TripBrief       │
   Europe, < £1500" ──▶│  2. Router     brief + heuristics ─(LLM fallback)─▶ which agents│──▶ streamed,
                       │  3. Chain      Destination ─▶ Itinerary ─▶ Budget (context fwd) │    attributed
                       │  4. Synthesize structured outputs ──(streamed)──▶ markdown      │    answer
                       └───────────────────────────────────────────────────────────────┘
   every request + every agent run ─────────────────────────────▶ MongoDB (audit trail)
```

- **Three distinct agents**, each with its own prompt, structured output, and a **behavioural rule
  enforced in code** (not just in the prompt):
  | Agent | Does | Code-enforced rule |
  |---|---|---|
  | **Destination** | Suggests where to go | Every suggestion must be justified; none may break a stated "avoid" constraint |
  | **Itinerary** | Builds a day-by-day plan | Must always be able to flag uncertainty (`uncertaintyNotes`), realistic travel times |
  | **Budget** | Prices the plan vs. budget | Total is **recomputed from the breakdown**; if over budget, a `cheaperAlternative` is mandatory |
- **Function calling everywhere** — intake, routing, and each agent use forced function calls for
  reliable structured output instead of parsing JSON out of prose.
- **Transparent**: the UI shows the routing decision, a live agent-activity strip, and one
  colour-coded card per agent (with a raw-JSON toggle).
- **Audit trail**: every request and every agent run (input, output, model, latency, error) is
  persisted to MongoDB. A History panel surfaces it.
- **Streaming**: live SSE — `agent_start/done/error` events plus the synthesised answer streamed
  token-by-token.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript (run with `tsx`) |
| LLM | Google **Gemini 2.5 Flash** via `@google/genai`, behind a one-interface `LLMClient` (Groq is a documented one-file swap) |
| Persistence | MongoDB Atlas + Mongoose (one `Request` doc with embedded `runs[]`) |
| Shared | A `shared/` package of TypeScript types — one source of truth for the agent/orchestration contracts |

## Prerequisites

- Node.js 20+ (developed on 24)
- A free **Google AI Studio** API key — <https://aistudio.google.com/apikey>
- A free **MongoDB Atlas** cluster connection string — <https://www.mongodb.com/atlas>

## Setup

```bash
# 1. install (npm workspaces — installs frontend + backend)
npm install

# 2. configure backend secrets
cp backend/.env.example backend/.env
#   then edit backend/.env and set:
#     GEMINI_API_KEY=...
#     MONGODB_URI=mongodb+srv://...
```

`backend/.env.example` documents every variable. **Never commit `backend/.env`** (it's gitignored).

## Run locally

```bash
npm run dev
```

- Backend API → <http://localhost:5000>
- Frontend → <http://localhost:5173> (Vite proxies `/api` to the backend, so no CORS in dev)

Open the frontend, type a trip request, and watch the agents run.

## Deploy to Railway (Docker)

The repo ships a single multi-stage **`Dockerfile`** that builds the frontend and runs the backend,
which serves both the API **and** the built SPA from one container — so Railway needs **one
service** and you get **one URL** (no CORS, no second deploy).

1. Push the repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo** → pick this repo. Railway auto-detects the
   `Dockerfile` and `railway.json`.
3. Add variables (Service → **Variables**) — paste values **without quotes**:
   - `GEMINI_API_KEY`
   - `MONGODB_URI`
   - *(optional)* `GEMINI_MODEL` (default `gemini-2.5-flash`), `LLM_PROVIDER` (default `gemini`)

   Railway injects `PORT` automatically (the app reads it); `NODE_ENV=production` is baked into the image.
4. Deploy. Railway health-checks `GET /api/health`; once green, open the generated URL.

Build & run the exact same image locally:

```bash
docker build -t trip-orchestra .
docker run -p 5000:5000 -e GEMINI_API_KEY=... -e MONGODB_URI=... trip-orchestra
# open http://localhost:5000  (SPA + API from one container)
```

## Verify

```bash
npm run test:llm      # confirms the Gemini key + function calling + streaming work
npm run test:agents   # behavioural-rule validators (offline) + live agent calls (if key set)
npm run test:plan     # drives the whole orchestration pipeline once, printing each stage + timing
npm run seed          # inserts a sample Request with embedded agent runs, reads it back
```

## API

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/plan/stream` | Run the pipeline, stream SSE (`intake`, `router`, `agent_*`, `token`, `final`) |
| `POST` | `/api/plan` | Same pipeline, non-streaming JSON (test/fallback) |
| `GET` | `/api/history?limit=20` | Recent requests (audit list) |
| `GET` | `/api/requests/:id` | One request with its full embedded agent-run audit |
| `GET` | `/api/health` | Liveness + DB status |

## Project structure

```
shared/src/types.ts          # shared contracts (AgentName, TripBrief, *Output, SSE events, …)
backend/src/
  llm/                       # LLMClient interface + Gemini impl + Groq stub
  agents/                    # destination, itinerary, budget + code-enforced validators
  orchestrator/              # intake, router, chain, synthesizer, executePlan
  routes/                    # plan (SSE + JSON), history, health
  models/request.ts          # Mongoose Request + embedded AgentRun
frontend/src/
  hooks/usePlanStream.ts     # SSE → reducer state machine
  components/                # Composer, AgentStrip, AnswerPanel, attribution cards, HistoryPanel
Dockerfile                   # multi-stage: build SPA → run backend that serves API + SPA
railway.json                 # Railway: Dockerfile builder + /api/health healthcheck
```

---

## Decision note (≈400 words)

**1. Orchestration = intake → route → chain → synthesize, not one mega-prompt.**
The tempting shortcut is a single LLM call told to "act as all three agents." I rejected it: it
fails the transparency and audit requirements (you can't show *which* agent contributed, or log each
one), and it makes the behavioural rules unenforceable. Instead the orchestrator extracts a
structured `TripBrief` (function call), routes with cheap deterministic heuristics — *named
destination ⇒ skip Destination; budget present ⇒ include Budget; trip length ⇒ include Itinerary* —
and only falls back to an LLM router when the heuristics can't decide. It then chains the agents,
feeding each one's output forward (Destination's pick becomes the Itinerary's destination; the
Itinerary becomes the Budget's input), and a final streamed call synthesises one narrative. Each
step is independently testable and individually logged.

**2. Function calling + code-enforced rules, because prompts aren't guarantees.**
Every agent returns its output as the arguments of a *forced* function call, so there's no brittle
JSON-out-of-prose parsing. But a prompt saying "never exceed budget" isn't a guarantee — so each
rule is also checked in code. The strongest example: the Budget agent's total is **recomputed from
its own breakdown**, the within-budget flag is re-derived from the real numbers, and if it's over
budget without a `cheaperAlternative`, the response is rejected and the agent is retried with the
failure fed back. The Itinerary must always carry an `uncertaintyNotes` array; Destination
suggestions are checked against "avoid" constraints.

**3. MongoDB document = the audit trail, schema-first.**
A request and its agent runs are one document with embedded `runs[]` (input, output, model, latency,
error per run). That mirrors a real audit-of-AI-interactions requirement: the complete story of a
request lives in one record, queryable for history and ready to extend with per-agent metrics.

**What I deliberately cut** (8–10h box): the stretch **traveler/admin role + observability view**
(the audit data is persisted and exposed via the History panel and `/api/requests/:id`, but I didn't
build a separate metrics UI); and a **Budget→Itinerary feedback loop** (auto-retrying a tighter
plan when over budget — the natural next step). Groq is wired as a one-file provider swap but left
as a stub since Gemini is the configured provider. **Deployment** is a single full-stack Docker
container on Railway (the `Dockerfile` + `railway.json` are included), with data on MongoDB Atlas.

---

## Production architecture note — Azure, 500+ concurrent users (≈300 words)

**Compute & provisioning.** The backend is a stateless Express service, so it maps cleanly onto
**Azure Container Apps**: containerise it, scale on HTTP concurrency (e.g. 1→20 replicas), and let
it scale to zero off-hours. Container Apps is simpler than AKS for this surface area while still
giving revisions and blue-green rollout. The frontend is a static Vite bundle on **Azure Static Web
Apps** (or a CDN-fronted storage account). Everything is provisioned as code with **Bicep/Terraform**
and shipped through GitHub Actions, so environments are reproducible.

**Data.** Replace Atlas with **Azure Cosmos DB for MongoDB (vCore)** — the same Mongoose models and
embedded-audit schema, with autoscale, zone redundancy, and private-endpoint networking. The audit
collection is the natural place for TTL/retention policies on AI interaction logs.

**Concurrency & the agent layer.** Each request fans into ~5 sequential model calls, so the real
limit is the LLM provider's throughput, not Node. I'd put agent calls behind a **queue/worker** tier
(Azure Service Bus + Container Apps jobs) with bounded concurrency, per-tenant rate limits, retries
with backoff, and a circuit breaker — keeping the existing graceful degradation (a failed agent
yields a partial, logged answer). Prompt/response caching (Azure Cache for Redis) cuts duplicate
spend.

**Enterprise auth & access control.** Swap the role stub for **Microsoft Entra ID** (OIDC) with
the SPA using MSAL and the API validating JWTs; map app roles/groups to traveler vs. admin, and use
per-tenant data partitioning for isolation. Secrets move to **Key Vault** with managed identities —
no keys in env files.

**Observability.** Wire **Azure Monitor + Application Insights** and emit one span per agent
invocation (extending the `latencyMs`/`error` fields already on each run), so a slow Budget agent is
visible per-request, not just in aggregate. Dashboards/alerts on agent latency, failure rate, and
token cost per tenant.
