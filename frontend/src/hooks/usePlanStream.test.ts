import { describe, it, expect } from 'vitest';
import { reducer } from './usePlanStream';

describe('usePlanStream reducer — cancel', () => {
  it('moves a streaming run to done and keeps the partial answer', () => {
    let state = reducer(undefined as never, { kind: 'reset' });
    state = reducer(state, { kind: 'start', query: 'weekend in Rome' });
    state = reducer(state, { kind: 'event', event: { type: 'token', text: 'Half a plan' } });
    expect(state.phase).toBe('streaming');

    const cancelled = reducer(state, { kind: 'cancel' });
    expect(cancelled.phase).toBe('done');
    expect(cancelled.answer).toBe('Half a plan');
  });

  it('is a no-op when not streaming', () => {
    let state = reducer(undefined as never, { kind: 'reset' });
    expect(reducer(state, { kind: 'cancel' }).phase).toBe('idle');
  });
});
