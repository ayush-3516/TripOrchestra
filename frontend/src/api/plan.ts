import type { HistoryItem, PlanStreamEvent, RequestDetail } from '@shared/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Streams the plan over SSE. We use fetch + ReadableStream (not EventSource) so
 * the query travels in the POST body, and parse `data:` frames as they arrive.
 */
export async function streamPlan(
  query: string,
  onEvent: (e: PlanStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/plan/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const json = dataLine.slice(5).trim();
      if (!json) continue;
      try {
        onEvent(JSON.parse(json) as PlanStreamEvent);
      } catch {
        // ignore malformed frame
      }
    }
  }
}

export async function fetchHistory(limit = 20): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/api/history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function fetchRequest(id: string): Promise<RequestDetail> {
  const res = await fetch(`${API_BASE}/api/requests/${id}`);
  if (!res.ok) throw new Error('Failed to load request');
  return res.json();
}
