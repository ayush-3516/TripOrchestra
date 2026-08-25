# Mobile-Friendly Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the TripOrchestra frontend comfortable to use on real phones (~360-430px viewports) by fixing header crowding, composer cramping, horizontal-overflow risk, and undersized tap targets — no new components, no new dependencies, no redesign.

**Architecture:** Pure Tailwind-utility edits to existing components, following the codebase's established `dark:`-variant, mobile-first style. Each task touches one file (or one tight cluster) and is independently verifiable by resizing the dev server to a phone width.

**Tech Stack:** React + TypeScript + Tailwind CSS (existing), Vitest + React Testing Library (existing test setup).

## Global Constraints

- No new npm dependencies.
- No changes to the dark-mode color system or agent accent colors (sky/violet/emerald stay as-is; only spacing/sizing/layout utilities change).
- No change to the results layout structure — it is already single-column (`max-w-3xl`) as of commit `bfd4a34`; this plan does not reintroduce a two-column split.
- `npm run typecheck` and `npm run build` must pass after every task.
- Preserve all existing `aria-label`s and accessibility semantics already in place.

---

### Task 1: Header — prevent crowding at 360px

**Files:**
- Modify: `frontend/src/App.tsx:46-80`

**Interfaces:**
- No new props or exported symbols. Pure JSX/className edit inside `App` component's `<header>` block.

**Context:** At 360px width, the header row holds the logo mark, "TripOrchestra" wordmark, and up to 3 buttons (New trip, theme toggle, History) when a request is active. The wordmark currently has no responsive sizing/truncation, and the row has no minimum-width protection, risking visual crowding right at the edge of comfortable tap spacing.

- [ ] **Step 1: Hide the wordmark text on the smallest screens, keep the icon mark**

In `frontend/src/App.tsx`, find the logo button (around line 48-53):

```tsx
          <button onClick={reset} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
              <Compass className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">TripOrchestra</span>
          </button>
```

Replace the wordmark span so it's hidden below `xs`-ish widths but visible from `sm` up (matching the existing `hidden sm:inline` pattern used for button labels), and add `shrink-0` to the icon mark so it never compresses:

```tsx
          <button onClick={reset} className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
              <Compass className="h-5 w-5" />
            </span>
            <span className="hidden text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 xs:inline">TripOrchestra</span>
          </button>
```

Since Tailwind has no default `xs` breakpoint, use `sm:inline` here too (reuse the existing breakpoint already used for button labels, rather than introducing a new one):

```tsx
          <button onClick={reset} className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
              <Compass className="h-5 w-5" />
            </span>
            <span className="hidden text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:inline">TripOrchestra</span>
          </button>
```

- [ ] **Step 2: Prevent the action button row from shrinking unpredictably**

In the same file, find the button group wrapper (around line 54):

```tsx
          <div className="flex items-center gap-2">
```

Change to add `shrink-0` and reduce gap slightly on the smallest screens:

```tsx
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
```

- [ ] **Step 3: Verify no visual regression via typecheck and build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 4: Manual resize check**

Run: `cd frontend && npm run dev`
Open the printed local URL in a browser, open devtools responsive mode, set width to 360px. Check both idle state (logo + theme toggle + History) and an active state (logo + New trip + theme toggle + History, e.g. by submitting one of the example prompts). Confirm: no wrapping, no overlapping buttons, wordmark hidden below `sm` (640px), icon mark always visible.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/App.tsx
git commit -m "fix: prevent header crowding at narrow mobile widths"
```

---

### Task 2: Composer — tame vertical growth and chip wrapping on mobile

**Files:**
- Modify: `frontend/src/components/Composer.tsx:66-82`

**Interfaces:**
- No new props. Pure JSX/className edit inside the `showExamples` block of `Composer`.

**Context:** The example-chip row uses `flex-wrap`, so with 4 example strings it wraps to 2-3 lines on a 360-390px screen, pushing content below the fold and making the composer's height unpredictable when the on-screen keyboard is also open. Switch this row to horizontal scroll on narrow screens instead of wrapping, which keeps the composer height stable.

- [ ] **Step 1: Convert the example-chip row to horizontal scroll below `sm`, wrap from `sm` up**

Find the examples block (around line 66-82):

```tsx
      {showExamples && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
            <Sparkles className="h-3.5 w-3.5" /> Try
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => submit(ex)}
              disabled={disabled}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-sky-300 hover:text-sky-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
```

Replace with a horizontally-scrollable row on mobile (no wrap, `shrink-0` chips, `overflow-x-auto`) that reverts to the original wrapping behavior from `sm` up:

```tsx
      {showExamples && (
        <div className="scrollbar-thin mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-400">
            <Sparkles className="h-3.5 w-3.5" /> Try
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => submit(ex)}
              disabled={disabled}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-sky-300 hover:text-sky-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
```

- [ ] **Step 2: Verify no visual regression via typecheck and build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 3: Manual resize check**

With `npm run dev` running, set devtools width to 360px on the idle screen. Confirm the example chips scroll horizontally in one line (touch/drag or shift+scroll) instead of wrapping to multiple lines, and the composer textarea + send button stay at a fixed, compact height. Then widen to 700px+ and confirm chips wrap normally (original behavior preserved).

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/Composer.tsx
git commit -m "fix: scroll example chips horizontally on mobile instead of wrapping"
```

---

### Task 3: Horizontal overflow safety — BudgetBreakdown table and RawJsonToggle pre block

**Files:**
- Modify: `frontend/src/components/BudgetBreakdown.tsx:27-29`
- Modify: `frontend/src/components/RawJsonToggle.tsx:17-21`

**Interfaces:**
- No new props. Pure JSX/className edits.

**Context:** Neither the budget table nor the raw-JSON `<pre>` block has an explicit `overflow-x-auto` wrapper guaranteeing that long content scrolls locally rather than widening the page. `RawJsonToggle`'s `<pre>` already has `overflow-auto` but is not defensively `max-w-full`-constrained within flex/grid ancestors; `BudgetBreakdown`'s table has none at all.

- [ ] **Step 1: Wrap the budget table in an explicit horizontal-scroll container**

In `frontend/src/components/BudgetBreakdown.tsx`, find (around line 27-29):

```tsx
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full text-sm">
```

Change the outer wrapper from `overflow-hidden` to allow horizontal scroll while keeping the rounded corners, by nesting a scroll container:

```tsx
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm">
```

This requires closing the new wrapper `</div>` right after the existing `</table>` close. Find the closing tag (around line 51-52):

```tsx
        </table>
      </div>
```

Change to:

```tsx
          </table>
        </div>
      </div>
```

- [ ] **Step 2: Constrain the RawJsonToggle pre block to its container width**

In `frontend/src/components/RawJsonToggle.tsx`, find (around line 17-21):

```tsx
      {open && (
        <pre className="scrollbar-thin mt-2 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
```

Add `max-w-full` and `overflow-x-auto` explicitly (in addition to the existing vertical `overflow-auto`) so long unbroken JSON strings scroll within the box on both axes rather than ever influencing page width:

```tsx
      {open && (
        <pre className="scrollbar-thin mt-2 max-h-72 max-w-full overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
```

- [ ] **Step 3: Verify no visual regression via typecheck and build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 4: Manual resize check**

With `npm run dev` running, plan a trip that produces a budget breakdown (e.g. submit "A five day trip somewhere warm in Europe for under £1500"). At 360px width, confirm the budget table renders without forcing the page to scroll horizontally (the page itself must not gain a horizontal scrollbar). Expand "Show raw output" on any agent card and confirm the JSON block scrolls within its own box, not the page.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/BudgetBreakdown.tsx src/components/RawJsonToggle.tsx
git commit -m "fix: contain budget table and raw-JSON overflow to their own boxes"
```

---

### Task 4: Tap targets — bring undersized icon buttons up to ~44px

**Files:**
- Modify: `frontend/src/components/HistoryPanel.tsx:95-97`
- Modify: `frontend/src/components/RawJsonToggle.tsx:9-16`

**Interfaces:**
- No new props. Pure JSX/className edits.

**Context:** The History panel's close button uses `p-1.5` around a `h-5 w-5` icon (~32px effective target), and `RawJsonToggle`'s trigger is a text+icon inline button with only default padding — both are below the ~44px comfortable touch target. The rest of the app's icon buttons already standardize on explicit `h-9 w-9` (36px) or `h-10 w-10` (40px); bring these two up to `h-11 w-11` (44px) for the close button, and add vertical padding to the RawJsonToggle trigger.

- [ ] **Step 1: Enlarge the History panel close button**

In `frontend/src/components/HistoryPanel.tsx`, find (around line 95-97):

```tsx
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
```

Change to an explicit 44px square target:

```tsx
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
```

- [ ] **Step 2: Enlarge the RawJsonToggle trigger's touch area**

In `frontend/src/components/RawJsonToggle.tsx`, find (around line 9-16):

```tsx
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
      >
        <Braces className="h-3.5 w-3.5" />
        {open ? 'Hide' : 'Show'} raw output
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
```

Add vertical padding and a negative margin to offset it visually (so the enlarged hit area doesn't add unwanted visible gap in the layout):

```tsx
      <button
        onClick={() => setOpen((o) => !o)}
        className="-my-2.5 inline-flex items-center gap-1.5 py-2.5 text-xs font-medium text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
      >
        <Braces className="h-3.5 w-3.5" />
        {open ? 'Hide' : 'Show'} raw output
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
```

- [ ] **Step 3: Verify no visual regression via typecheck and build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 4: Run existing HistoryPanel tests to confirm no regression**

Run: `cd frontend && npx vitest run src/components/HistoryPanel.test.tsx`
Expected: PASS (the close button's `aria-label="Close"` is unchanged, so existing queries still resolve).

- [ ] **Step 5: Manual resize check**

With `npm run dev` running at 360px width, open History and confirm the close (X) button has a visibly larger, easier-to-tap area without changing its icon size or position. Expand a "Show raw output" toggle and confirm the same for its trigger.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/HistoryPanel.tsx src/components/RawJsonToggle.tsx
git commit -m "fix: enlarge undersized tap targets to ~44px minimum"
```

---

### Task 5: Full-suite verification

**Files:** None (verification only).

**Interfaces:** N/A.

- [ ] **Step 1: Run the full test suite**

Run: `cd frontend && npm run test`
Expected: all existing tests PASS (no test file changes were made in this plan; this confirms no regression).

- [ ] **Step 2: Run typecheck and build one final time**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 3: Full manual walkthrough at 360px, 390px, and 430px**

With `npm run dev` running, at each of the three widths: load the idle screen, submit an example prompt, wait for streaming to complete, open History, open a raw-JSON toggle, toggle dark mode. Confirm at every step: no horizontal page scrollbar, no overlapping/wrapped header content, composer stays compact height, all interactive elements are comfortably tappable.

- [ ] **Step 4: Confirm no changes needed — this task produces no commit**

If all checks pass, this task is complete with no further commit (verification-only task).
