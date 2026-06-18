# Frontend UI/UX Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark mode, a responsive desktop/mobile layout, accessibility & motion correctness, and result actions (copy / stop / print) to the TripOrchestra frontend.

**Architecture:** Foundation-first. A test runner and a theme foundation (Tailwind `dark` class + `useTheme` hook + pre-paint script) land first; dark `dark:` variants, layout, a11y, and result actions build on top. All changes are client-side only — no backend, API, or shared-types changes.

**Tech Stack:** React 18, TypeScript, Vite 6, Tailwind 3, lucide-react, react-markdown. New dev-only: Vitest + React Testing Library + jsdom.

## Global Constraints

- No backend, API route, or `shared/src/types.ts` changes — every task is confined to `frontend/`.
- No new runtime dependencies. New dependencies must be `devDependencies` only (test tooling).
- No PDF/`.ics` libraries — export is browser `window.print()` + a print stylesheet.
- Tailwind color classes must be literal strings (not interpolated) so they survive the build — match the existing pattern in `frontend/src/agentMeta.ts`.
- Agent accent colors (sky = destination, violet = itinerary, emerald = budget) are unchanged; only neutral surfaces/text get dark variants.
- After every task: `cd frontend && npm run typecheck` must pass with no errors.
- Run all commands from the repo root unless noted; the frontend lives in `frontend/`.

---

### Task 1: Test infrastructure (Vitest + React Testing Library)

**Files:**
- Modify: `frontend/package.json` (devDependencies + scripts)
- Modify: `frontend/vite.config.ts` (add `test` block, switch defineConfig import)
- Create: `frontend/src/test/setup.ts`
- Test: `frontend/src/test/sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: an `npm test` script (`vitest run`) and a jsdom test environment with `@testing-library/jest-dom` matchers and a `matchMedia` stub available to every later task's tests.

- [ ] **Step 1: Install dev dependencies**

```bash
cd frontend && npm install -D vitest@^2.1.8 jsdom@^25.0.1 @testing-library/react@^16.1.0 @testing-library/jest-dom@^6.6.3 @testing-library/user-event@^14.5.2
```

- [ ] **Step 2: Add the test setup file**

Create `frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom has no matchMedia; default every query to "no match" (light, no
// reduced motion). Individual tests override window.matchMedia as needed.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
```

- [ ] **Step 3: Wire Vitest into the Vite config**

In `frontend/vite.config.ts`, change the first import line from:

```ts
import { defineConfig } from 'vite';
```

to:

```ts
import { defineConfig } from 'vitest/config';
```

Then add a `test` block as a sibling of `server` inside the config object (immediately after the `server: { ... },` block, before the closing `});`):

```ts
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: './src/test/setup.ts',
    css: false,
  },
```

- [ ] **Step 4: Add test scripts**

In `frontend/package.json`, in the `"scripts"` block, add two entries after `"typecheck"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 5: Write a sanity test**

Create `frontend/src/test/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('test infrastructure', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });

  it('has a matchMedia stub', () => {
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false);
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `cd frontend && npm test`
Expected: PASS — 1 test file, 2 tests passing.

- [ ] **Step 7: Verify typecheck still passes**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/test/
git commit -m "test: add Vitest + React Testing Library setup"
```

---

### Task 2: Theme foundation (dark-mode config, useTheme hook, header toggle)

**Files:**
- Modify: `frontend/tailwind.config.js` (add `darkMode: 'class'`)
- Modify: `frontend/index.html` (pre-paint theme script)
- Create: `frontend/src/hooks/useTheme.ts`
- Test: `frontend/src/hooks/useTheme.test.ts`
- Modify: `frontend/src/App.tsx` (header toggle button)

**Interfaces:**
- Consumes: the Vitest setup from Task 1.
- Produces: `useTheme(): { theme: 'light' | 'dark'; toggle: () => void }` from `frontend/src/hooks/useTheme.ts`. The hook reads `localStorage['trip-theme']`, falls back to `prefers-color-scheme`, toggles/adds the `dark` class on `document.documentElement`, and persists the choice.

- [ ] **Step 1: Write the failing test for useTheme**

Create `frontend/src/hooks/useTheme.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

function mockSystem(prefersDark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('dark') ? prefersDark : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('defaults to the system preference when nothing is stored', () => {
    mockSystem(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('prefers a stored choice over the system preference', () => {
    mockSystem(true);
    localStorage.setItem('trip-theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles, persists, and updates the html class', () => {
    mockSystem(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('trip-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- useTheme`
Expected: FAIL — cannot resolve `./useTheme`.

- [ ] **Step 3: Implement the hook**

Create `frontend/src/hooks/useTheme.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'trip-theme';

function resolveInitial(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Tracks light/dark, persists to localStorage, and reflects it on <html>. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(resolveInitial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return { theme, toggle };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- useTheme`
Expected: PASS — 3 tests.

- [ ] **Step 5: Enable class-based dark mode in Tailwind**

In `frontend/tailwind.config.js`, add `darkMode: 'class',` as the first property inside the exported object (immediately after `export default {`):

```js
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
```

- [ ] **Step 6: Add the pre-paint theme script**

In `frontend/index.html`, add this script inside `<head>`, immediately before the closing `</head>` tag. It sets the class before first paint to avoid a flash:

```html
    <script>
      (function () {
        try {
          var t = localStorage.getItem('trip-theme');
          if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
          }
        } catch (e) {}
      })();
    </script>
```

- [ ] **Step 7: Add the header toggle button**

In `frontend/src/App.tsx`:

Change the lucide import (line 2) to add `Moon` and `Sun`:

```tsx
import { Compass, History as HistoryIcon, Loader2, Moon, Plus, Sun, TriangleAlert } from 'lucide-react';
```

Add the hook import after the existing imports (after line 13):

```tsx
import { useTheme } from './hooks/useTheme';
```

Inside the `App` component, add the hook call right after the existing `usePlanStream` line:

```tsx
  const { theme, toggle } = useTheme();
```

In the header's right-hand `<div className="flex items-center gap-2">` (after the `New trip` button block and before the History button), add the toggle:

```tsx
            <button
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
```

- [ ] **Step 8: Run typecheck and tests**

Run: `cd frontend && npm run typecheck && npm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 9: Manual check**

Run: `cd frontend && npm run dev`. Click the toggle — the button swaps sun/moon and the `<html>` element gains/loses `dark` (visible in devtools). Reload — the choice persists with no flash. (Full surface styling lands in Task 3.)

- [ ] **Step 10: Commit**

```bash
git add frontend/tailwind.config.js frontend/index.html frontend/src/hooks/useTheme.ts frontend/src/hooks/useTheme.test.ts frontend/src/App.tsx
git commit -m "feat: dark-mode foundation with persisted theme toggle"
```

---

### Task 3: Dark-mode surface variants across components

**Files (modify, className edits only):**
- `frontend/src/index.css`
- `frontend/src/App.tsx`
- `frontend/src/components/Composer.tsx`
- `frontend/src/components/RouterNote.tsx`
- `frontend/src/components/AgentStrip.tsx`
- `frontend/src/components/AnswerPanel.tsx`
- `frontend/src/components/AttributionCards.tsx`
- `frontend/src/components/DestinationCards.tsx`
- `frontend/src/components/ItineraryTimeline.tsx`
- `frontend/src/components/BudgetBreakdown.tsx`
- `frontend/src/components/RawJsonToggle.tsx`
- `frontend/src/components/HistoryPanel.tsx`

**Interfaces:**
- Consumes: the `dark` class toggled by Task 2.
- Produces: no exports — purely visual `dark:` variants. Verified by build + manual review, not unit tests (asserting Tailwind class strings is brittle).

- [ ] **Step 1: Dark base in index.css**

In `frontend/src/index.css`, replace the `body` rule in the `@layer base` block:

```css
  body {
    @apply bg-slate-50 text-slate-900;
  }
```

with:

```css
  body {
    @apply bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100;
  }
```

And update the `.prose-trip` rules to add dark text/border variants. Replace:

```css
.prose-trip {
  @apply text-[15px] leading-relaxed text-slate-700;
}
```

with:

```css
.prose-trip {
  @apply text-[15px] leading-relaxed text-slate-700 dark:text-slate-300;
}
```

Replace the `.prose-trip h1, .prose-trip h2, .prose-trip h3` rule's `text-slate-900` with `text-slate-900 dark:text-slate-100`; the `.prose-trip strong` rule's `text-slate-900` with `text-slate-900 dark:text-slate-100`; the `.prose-trip code` rule with `@apply rounded bg-slate-100 px-1 py-0.5 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200;`; and the `.prose-trip th, .prose-trip td` border with `border-slate-200 dark:border-slate-700`.

- [ ] **Step 2: App.tsx surfaces**

Apply these literal additions (append the `dark:` classes to the existing className on each element):

- Root wrapper `bg-gradient-to-b from-slate-50 to-slate-100` → add `dark:from-slate-950 dark:to-slate-900`.
- Header `border-slate-200 bg-white/80` → add `dark:border-slate-800 dark:bg-slate-900/80`.
- Logo text `text-slate-800` → add `dark:text-slate-100`.
- "New trip" and "History" buttons `border-slate-200 bg-white ... text-slate-600 ... hover:bg-slate-50` → add `dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700`.
- Hero `<h1>` `text-slate-900` → add `dark:text-slate-100`; hero `<p>` `text-slate-500` → add `dark:text-slate-400`.
- Agent intro cards `border-slate-200 bg-white` → add `dark:border-slate-700 dark:bg-slate-800`; their `text-slate-800` → add `dark:text-slate-100`; `text-slate-500` → add `dark:text-slate-400`.
- "You asked" card `border-slate-200 bg-white` → add `dark:border-slate-800 dark:bg-slate-900`; its label `text-slate-400` keep; its `<p> text-slate-800` → add `dark:text-slate-200`.
- Error banner `border-rose-200 bg-rose-50 text-rose-700` → add `dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300`.
- "Agents are working…" `text-slate-400` → keep (works in both).

- [ ] **Step 3: Composer.tsx surfaces**

- Input wrapper `border-slate-200 bg-white` → add `dark:border-slate-700 dark:bg-slate-800`.
- `textarea` `text-slate-800 placeholder:text-slate-400` → add `dark:text-slate-100 dark:placeholder:text-slate-500`.
- Example chips `border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700` → add `dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300`.
- (The submit button gradient stays.)

- [ ] **Step 4: RouterNote.tsx surfaces**

- Card `border-slate-200 bg-slate-50/70` → add `dark:border-slate-800 dark:bg-slate-900/60`.
- Title `text-slate-700` → add `dark:text-slate-200`; reasoning `text-slate-500` → add `dark:text-slate-400`.
- Heuristic pill `bg-slate-200 text-slate-600` → add `dark:bg-slate-700 dark:text-slate-300`.

- [ ] **Step 5: AgentStrip.tsx surfaces**

- Queued chip `bg-slate-50 text-slate-400 ring-slate-200` → add `dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700`.
- Separator arrow `text-slate-300` → add `dark:text-slate-600`.

- [ ] **Step 6: AnswerPanel.tsx surfaces**

- Panel `border-slate-200 bg-white` → add `dark:border-slate-800 dark:bg-slate-900`.
- Header label `text-slate-500` → add `dark:text-slate-400`.

- [ ] **Step 7: AttributionCards.tsx surfaces**

- Section heading `text-slate-400` → keep.
- Card `border-slate-200 bg-white` → add `dark:border-slate-800 dark:bg-slate-900`.
- Agent label `text-slate-800` → add `dark:text-slate-100`; summary `text-slate-500` → add `dark:text-slate-400`.
- Error sub-box `border-amber-200 bg-amber-50 text-amber-800` → add `dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300`.

- [ ] **Step 8: DestinationCards / ItineraryTimeline / BudgetBreakdown / RawJsonToggle surfaces**

DestinationCards: inner card `border-slate-200 bg-white` → add `dark:border-slate-700 dark:bg-slate-800`; name `text-slate-800` → add `dark:text-slate-100`; justification `text-slate-600` → add `dark:text-slate-300`; notes `text-slate-500` → add `dark:text-slate-400`.

ItineraryTimeline: day card `border-slate-200 bg-white` → add `dark:border-slate-700 dark:bg-slate-800`; theme `text-slate-800` → add `dark:text-slate-100`; timeline border `border-slate-200` → add `dark:border-slate-700`; node ring `ring-white` → add `dark:ring-slate-800`; activity `text-slate-800`/`text-slate-700` → add `dark:text-slate-200`; meta `text-slate-500` → add `dark:text-slate-400`; uncertainty box `border-amber-200 bg-amber-50` → add `dark:border-amber-900 dark:bg-amber-950/40` and its text `text-amber-800`/`text-amber-700` → add `dark:text-amber-300`.

BudgetBreakdown: table wrapper `border-slate-200 bg-white` → add `dark:border-slate-700 dark:bg-slate-800`; row borders `border-slate-100` → add `dark:border-slate-700`; labels `text-slate-600` → add `dark:text-slate-300`; amounts `text-slate-800` → add `dark:text-slate-100`; total row `bg-slate-50` → add `dark:bg-slate-900` and its text `text-slate-700`/`text-slate-900` → add `dark:text-slate-100`; within/over banners keep their colored backgrounds but add `dark:bg-emerald-950/40 dark:text-emerald-300` and `dark:bg-rose-950/40 dark:text-rose-300` respectively.

RawJsonToggle: toggle button `text-slate-400 hover:text-slate-600` → add `dark:hover:text-slate-300`. The `<pre>` already uses `bg-slate-900 text-slate-200` — fine in both themes.

- [ ] **Step 9: HistoryPanel.tsx surfaces**

- Backdrop `bg-slate-900/30` → keep.
- Drawer `bg-white` → add `dark:bg-slate-900`.
- Header `border-slate-200` → add `dark:border-slate-800`; title `text-slate-800` → add `dark:text-slate-100`; close button `text-slate-400 hover:bg-slate-100` → add `dark:hover:bg-slate-800`.
- List item button `border-slate-200 hover:border-sky-300 hover:bg-sky-50/40` → add `dark:border-slate-700 dark:hover:border-sky-500 dark:hover:bg-sky-950/30`; query text `text-slate-700` → add `dark:text-slate-200`; meta `text-slate-400` → keep.

- [ ] **Step 10: Verify build and typecheck**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed (the build is the real check that all `dark:` classes are valid Tailwind utilities).

- [ ] **Step 11: Manual check**

Run dev, toggle dark mode, and walk through: idle/hero, a live plan run, an errored agent, the history drawer, raw-JSON open. Confirm text is legible and surfaces are dark (no white flashes) in every view.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/index.css frontend/src/App.tsx frontend/src/components/
git commit -m "feat: dark-mode surface variants across all components"
```

---

### Task 4: Stop / cancel a streaming run

**Files:**
- Modify: `frontend/src/hooks/usePlanStream.ts` (export reducer, add `cancel` action + `cancel()`)
- Test: `frontend/src/hooks/usePlanStream.test.ts`
- Modify: `frontend/src/components/Composer.tsx` (Stop control while streaming)
- Modify: `frontend/src/App.tsx` (pass `cancel` + streaming state to Composer)

**Interfaces:**
- Consumes: existing `PlanState`, `Action`, `reducer`, and `usePlanStream` from this file.
- Produces: a new action `{ kind: 'cancel' }`; `reducer` is exported for testing; `usePlanStream()` returns an added `cancel: () => void`. Composer gains props `streaming: boolean` and `onStop: () => void`.

- [ ] **Step 1: Write the failing reducer test**

Create `frontend/src/hooks/usePlanStream.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm test -- usePlanStream`
Expected: FAIL — `reducer` is not exported.

- [ ] **Step 3: Export the reducer and add the cancel action**

In `frontend/src/hooks/usePlanStream.ts`:

Add `cancel` to the `Action` union (after the `reset` member):

```ts
type Action =
  | { kind: 'start'; query: string }
  | { kind: 'event'; event: PlanStreamEvent }
  | { kind: 'fail'; message: string }
  | { kind: 'hydrate'; state: PlanState }
  | { kind: 'cancel' }
  | { kind: 'reset' };
```

Change `function reducer(` to `export function reducer(` and add the `cancel` case (before `case 'reset':`):

```ts
    case 'cancel':
      return state.phase === 'streaming' ? { ...state, phase: 'done' } : state;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- usePlanStream`
Expected: PASS — 2 tests.

- [ ] **Step 5: Expose cancel() from the hook**

In `usePlanStream.ts`, add a `cancel` callback after the existing `reset` callback:

```ts
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ kind: 'cancel' });
  }, []);
```

And add it to the returned object:

```ts
  return { state, run, showHistory, reset, cancel };
```

- [ ] **Step 6: Add Stop support to Composer**

In `frontend/src/components/Composer.tsx`:

Change the lucide import to add `Square`:

```tsx
import { ArrowUp, Sparkles, Square } from 'lucide-react';
```

Add two props to the `Props` interface:

```ts
interface Props {
  onSubmit: (query: string) => void;
  disabled: boolean;
  showExamples: boolean;
  streaming: boolean;
  onStop: () => void;
}
```

Update the destructuring:

```tsx
export function Composer({ onSubmit, disabled, showExamples, streaming, onStop }: Props) {
```

Replace the submit `<button>` (the one with `aria-label="Plan trip"`) with a conditional Stop/Send button:

```tsx
        {streaming ? (
          <button
            onClick={onStop}
            aria-label="Stop"
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow transition hover:bg-rose-600"
          >
            <Square className="h-4 w-4" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => submit(value)}
            disabled={disabled || !value.trim()}
            aria-label="Plan trip"
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
```

- [ ] **Step 7: Wire it up in App.tsx**

In `frontend/src/App.tsx`, pull `cancel` from the hook:

```tsx
  const { state, run, showHistory, reset, cancel } = usePlanStream();
```

Update the Composer usage:

```tsx
        <Composer onSubmit={run} disabled={streaming} showExamples={idle} streaming={streaming} onStop={cancel} />
```

- [ ] **Step 8: Run typecheck and tests**

Run: `cd frontend && npm run typecheck && npm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 9: Manual check**

Run dev, submit a trip, and click Stop mid-stream. The stream halts, partial output stays on screen, and the composer returns to its normal Send state.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/hooks/usePlanStream.ts frontend/src/hooks/usePlanStream.test.ts frontend/src/components/Composer.tsx frontend/src/App.tsx
git commit -m "feat: stop button to cancel a streaming run"
```

---

### Task 5: Copy answer + reduced-motion typewriter

**Files:**
- Modify: `frontend/src/components/AnswerPanel.tsx` (reduced-motion guard + copy button)
- Test: `frontend/src/components/AnswerPanel.test.tsx`

**Interfaces:**
- Consumes: existing `AnswerPanel` props (`answer`, `streaming`, `instant`).
- Produces: no new exports. `useTypewriter` gains an internal reduced-motion check; the panel renders a Copy button that writes `answer` to the clipboard.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/AnswerPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnswerPanel } from './AnswerPanel';

function preferReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduced-motion') ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('AnswerPanel', () => {
  beforeEach(() => preferReducedMotion(false));

  it('renders the full answer immediately when reduced motion is preferred', () => {
    preferReducedMotion(true);
    render(<AnswerPanel answer="**Hello** there" streaming={true} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText(/there/)).toBeInTheDocument();
  });

  it('copies the answer markdown to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<AnswerPanel answer="Trip plan body" streaming={false} instant />);
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith('Trip plan body');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd frontend && npm test -- AnswerPanel`
Expected: FAIL — no Copy button; reduced-motion text not fully rendered while streaming.

- [ ] **Step 3: Add a reduced-motion helper and guard the typewriter**

In `frontend/src/components/AnswerPanel.tsx`:

Change the lucide import to add `Check` and `Copy`:

```tsx
import { Check, Copy, Sparkles } from 'lucide-react';
```

Add a `useState` import alongside the existing hooks (the file already imports `useEffect, useRef, useState`).

Add this helper above `useTypewriter`:

```tsx
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

In `useTypewriter`, treat reduced motion as instant. Change the signature body's first line:

```tsx
function useTypewriter(target: string, instant: boolean): string {
  const reduce = prefersReducedMotion();
  const skip = instant || reduce;
  const [shown, setShown] = useState(skip ? target : '');
  const idx = useRef(skip ? target.length : 0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (skip) {
      idx.current = targetRef.current.length;
      setShown(targetRef.current);
      return;
    }
    let raf = 0;
    const tick = () => {
      const t = targetRef.current;
      if (idx.current < t.length) {
        idx.current = Math.min(t.length, idx.current + Math.max(2, Math.round((t.length - idx.current) / 22)));
        setShown(t.slice(0, idx.current));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [skip]);

  return shown;
}
```

Note: when `skip` is true the effect re-runs and immediately sets the full text, so a reduced-motion render shows the complete answer even while `streaming` is true.

- [ ] **Step 4: Add the copy button to the panel**

In the `AnswerPanel` component, replace the header row:

```tsx
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <Sparkles className="h-4 w-4 text-indigo-500" />
        Synthesised answer
      </div>
```

with a header that includes a copy button (declare the `copied` state at the top of the component body, before `const shown = ...`):

```tsx
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
```

```tsx
      <div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          Synthesised answer
        </span>
        <button
          onClick={onCopy}
          aria-label="Copy answer"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npm test -- AnswerPanel`
Expected: PASS — 2 tests.

- [ ] **Step 6: Run full typecheck and tests**

Run: `cd frontend && npm run typecheck && npm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 7: Manual check**

Run dev; click Copy and paste elsewhere to confirm the markdown is on the clipboard. Enable OS "reduce motion" and run a plan — the answer appears without the typing animation or blinking cursor.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/AnswerPanel.tsx frontend/src/components/AnswerPanel.test.tsx
git commit -m "feat: copy answer button and reduced-motion-aware typewriter"
```

---

### Task 6: History modal accessibility

**Files:**
- Modify: `frontend/src/components/HistoryPanel.tsx` (dialog semantics, Escape, focus trap, focus restore)
- Test: `frontend/src/components/HistoryPanel.test.tsx`

**Interfaces:**
- Consumes: existing `HistoryPanel` props (`open`, `onClose`, `onSelect`, `refreshKey`). `fetchHistory` from `../api/plan` is mocked in the test.
- Produces: no new exports. The panel renders with `role="dialog"` + `aria-modal`, closes on Escape, traps Tab focus, and restores focus to the previously focused element on close.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/HistoryPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPanel } from './HistoryPanel';

vi.mock('../api/plan', () => ({
  fetchHistory: vi.fn().mockResolvedValue([]),
}));

describe('HistoryPanel accessibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes dialog semantics', async () => {
    render(<HistoryPanel open onClose={() => {}} onSelect={() => {}} refreshKey={0} />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<HistoryPanel open onClose={onClose} onSelect={() => {}} refreshKey={0} />);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd frontend && npm test -- HistoryPanel`
Expected: FAIL — no `dialog` role; Escape does nothing.

- [ ] **Step 3: Add dialog semantics, Escape, focus trap, and focus restore**

In `frontend/src/components/HistoryPanel.tsx`:

Add `useRef` to the React import:

```tsx
import { useEffect, useRef, useState } from 'react';
```

Inside the component, before the early `if (!open) return null;`, add:

```tsx
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('button, [href], input, [tabindex]')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);
```

Update the `<aside>` to carry the ref and dialog semantics — change:

```tsx
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
```

to:

```tsx
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Request history"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900"
      >
```

(The `dark:bg-slate-900` here supersedes the Task 3 Step 9 edit if Task 6 runs after — keep it.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- HistoryPanel`
Expected: PASS — 2 tests.

- [ ] **Step 5: Run full typecheck and tests**

Run: `cd frontend && npm run typecheck && npm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 6: Manual check**

Run dev, open History. Focus lands inside the drawer; Tab cycles within it; Escape closes it and returns focus to the History button.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/HistoryPanel.tsx frontend/src/components/HistoryPanel.test.tsx
git commit -m "feat: accessible history modal (dialog role, Escape, focus trap)"
```

---

### Task 7: Responsive desktop two-column layout + mobile header

**Files:**
- Modify: `frontend/src/App.tsx` (results width + two-column grid; header label collapse)

**Interfaces:**
- Consumes: existing layout markup.
- Produces: no exports — layout/responsive className changes. Verified by build + manual checks at 360px / tablet / wide viewports (not unit-tested).

- [ ] **Step 1: Collapse header button labels under `sm`**

In `frontend/src/App.tsx`, wrap each header button's text label in a span hidden on narrow screens. For the "New trip" button, change `<Plus className="h-4 w-4" /> New trip` to:

```tsx
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New trip</span>
```

For the "History" button, change `<HistoryIcon className="h-4 w-4" /> History` to:

```tsx
              <HistoryIcon className="h-4 w-4" /> <span className="hidden sm:inline">History</span>
```

- [ ] **Step 2: Widen the results region and split into two columns**

The idle/hero `<main>` stays `max-w-3xl`. Split the results into a wider container. Replace the single `<main className="mx-auto max-w-3xl px-4 py-8">` with a width that depends on phase — change it to:

```tsx
      <main className={`mx-auto px-4 py-8 ${idle ? 'max-w-3xl' : 'max-w-6xl'}`}>
```

Then wrap the results block so the answer and the contribution cards sit side-by-side on `lg`. Locate the `{!idle && ( ... )}` block. The "You asked" card, `RouterNote`, and `AgentStrip` stay full-width at the top. Restructure the inner content so that, below those, the answer and attribution cards form a two-column grid on `lg`.

Replace the existing results inner JSX (from the `RouterNote` line through the closing of `AttributionCards`) so the layout is:

```tsx
        {!idle && (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">You asked</div>
              <p className="mt-0.5 text-slate-800 dark:text-slate-200">{state.query}</p>
            </div>

            {state.router && <RouterNote decision={state.router} />}
            {order.length > 0 && <AgentStrip order={order} agentStatus={state.agentStatus} />}

            {state.phase === 'error' && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{state.errorMessage ?? 'Something went wrong.'}</span>
              </div>
            )}

            {waitingForAnswer && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Agents are working…
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
              {showAnswer && (
                <AnswerPanel
                  answer={state.answer}
                  streaming={streaming}
                  instant={state.fromHistory || state.phase === 'error'}
                />
              )}
              <AttributionCards
                order={order}
                outputs={state.outputs}
                agentStatus={state.agentStatus}
                contributions={state.contributions}
              />
            </div>
          </div>
        )}
```

(The `motion-reduce:animate-none` on the spinner here also satisfies the Task 5 reduced-motion goal for the working indicator. Apply the same `motion-reduce:animate-none` to the spinner in `AgentStrip.tsx` and `HistoryPanel.tsx` if not already present.)

- [ ] **Step 3: Verify build and typecheck**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 4: Manual check at three widths**

Run dev. At ≥1024px the answer and contribution cards sit side-by-side and use the wider canvas. Between `sm` and `lg` they stack in one column. At 360px the header shows icon-only buttons with no wrap/overflow, and content is single-column.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/AgentStrip.tsx frontend/src/components/HistoryPanel.tsx
git commit -m "feat: responsive two-column results layout and mobile header"
```

---

### Task 8: Export via print

**Files:**
- Modify: `frontend/src/App.tsx` (Print button in header, shown when a result exists)
- Modify: `frontend/src/index.css` (print stylesheet)

**Interfaces:**
- Consumes: `window.print()` (browser API) and the existing `idle` flag.
- Produces: no exports. A header Print button (hidden when idle) and an `@media print` block that hides chrome and lays out the result for paper/PDF. Verified by build + manual print-preview (not unit-tested — print rendering is not observable in jsdom).

- [ ] **Step 1: Add the Print button**

In `frontend/src/App.tsx`, add `Printer` to the lucide import:

```tsx
import { Compass, History as HistoryIcon, Loader2, Moon, Plus, Printer, Sun, TriangleAlert } from 'lucide-react';
```

In the header's right-hand button group, add a Print button (shown only when not idle), before the theme toggle:

```tsx
            {!idle && (
              <button
                onClick={() => window.print()}
                aria-label="Print or save as PDF"
                className="no-print inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
              </button>
            )}
```

Add the `no-print` class to the header element and the composer wrapper so they are excluded from print. On the `<header>` add `no-print` to its className; wrap the `<Composer .../>` usage in a `<div className="no-print">...</div>`, and add `no-print` to the History drawer root if desired.

- [ ] **Step 2: Add the print stylesheet**

In `frontend/src/index.css`, append a print block at the end of the file:

```css
/* Print / Save-as-PDF: hide chrome, show only the result, flatten to one column. */
@media print {
  .no-print {
    display: none !important;
  }
  body {
    background: #fff !important;
    color: #000 !important;
  }
  main {
    max-width: 100% !important;
    padding: 0 !important;
  }
  /* Collapse the two-column results grid for paper. */
  .grid {
    display: block !important;
  }
  section,
  .rounded-2xl,
  .rounded-xl {
    box-shadow: none !important;
    break-inside: avoid;
  }
}
```

- [ ] **Step 3: Verify build and typecheck**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 4: Manual check**

Run dev, run a plan, click Print. In the browser print preview: the header, theme toggle, composer, and example chips are gone; the synthesized answer and agent contributions are shown in a single readable column on a white background; "Save as PDF" produces a clean document.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/index.css
git commit -m "feat: print / save-as-PDF export of the trip result"
```

---

## Self-Review

**Spec coverage:**
- Dark mode → Tasks 2 (foundation) + 3 (variants). ✓
- Desktop layout + mobile → Task 7. ✓
- Accessibility (modal) → Task 6; motion (reduced-motion) → Task 5 (typewriter/cursor) + Task 7 (spinners). ✓
- Result actions: copy → Task 5; stop → Task 4; export (copy-as-text via the answer markdown + print) → Task 5 (copy) + Task 8 (print). ✓
- Verification (typecheck + build + manual) → present in every task; test infra → Task 1. ✓

**Placeholder scan:** No TBD/TODO; every code step has concrete code; commands have expected output. ✓

**Type consistency:** `cancel` action and `reducer` export (Task 4) match the test in Task 4; `useTheme` return shape matches its usage in Task 2 Step 7; Composer's new `streaming`/`onStop` props (Task 4) match the App usage; `prefersReducedMotion`/`skip` naming consistent within Task 5. ✓

**Note on overlap:** Task 6 Step 3 and Task 3 Step 9 both touch the `<aside>` className (dark variant). The plan calls this out — if executed in order, Task 6's full replacement includes the dark class, so no conflict.
