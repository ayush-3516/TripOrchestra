import { Router, type Request, type Response, type NextFunction } from 'express';
import type { PlanStreamEvent } from '@shared/types';
import { executePlan } from '../orchestrator';

const router = Router();

function getQuery(req: Request): string {
  const raw = (req.body?.query ?? '') as unknown;
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * POST /api/plan/stream — runs the pipeline and streams progress as SSE:
 * request_created → intake → router → agent_start/agent_done/agent_error*
 * → token* (synthesised answer) → final.
 */
router.post('/plan/stream', async (req: Request, res: Response) => {
  const query = getQuery(req);
  if (!query) {
    res.status(400).json({ error: 'A non-empty "query" is required.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // don't let a proxy buffer the stream
  res.flushHeaders?.();

  // Detect a real client disconnect on the RESPONSE, not the request. For a POST
  // the request stream emits 'close' as soon as its body is consumed, which is
  // not the client leaving — `res` close is the correct signal.
  let closed = false;
  res.on('close', () => {
    closed = true;
  });

  const emit = (event: PlanStreamEvent) => {
    if (!closed) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await executePlan(query, emit);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    emit({ type: 'error', message });
  } finally {
    if (!closed) res.end();
  }
});

/** POST /api/plan — same pipeline, non-streaming JSON (test/fallback path). */
router.post('/plan', async (req: Request, res: Response, next: NextFunction) => {
  const query = getQuery(req);
  if (!query) {
    res.status(400).json({ error: 'A non-empty "query" is required.' });
    return;
  }
  try {
    const response = await executePlan(query);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
