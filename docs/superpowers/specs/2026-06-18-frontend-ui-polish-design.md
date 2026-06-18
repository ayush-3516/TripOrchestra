# Frontend UI/UX Polish Pass — Design

**Date:** 2026-06-18
**Status:** Approved for planning

## Goal

The TripOrchestra frontend is already well-built. This is an enhancement pass — not
bug fixes — across five areas the user requested: dark mode, desktop layout, mobile
responsiveness, accessibility & motion, and result actions. All changes are
client-side only; no backend or shared-types changes are required.

## Approach

One consolidated polish pass, sequenced **foundation-first**. Dark mode touches the
color of every component, so a thin color-token foundation lands first to avoid
re-editing every file later. Then layout/mobile build on it, and a11y/motion and
result-actions layer in last.

Rejected alternatives:
- **Two separate phases (correctness then visuals):** more PRs, slower, no real
  isolation benefit since it's all one app.
- **Theme context provider / heavier theming system:** overkill for a single toggle;
  Tailwind's `dark:` variant + a `localStorage` flag is sufficient.

## Scope by area

### 1. Dark mode (foundation)

- Enable `darkMode: 'class'` in `frontend/tailwind.config.js`.
- Add `dark:` variants to the slate-based neutrals/surfaces across all components
  (backgrounds, borders, text, rings). Agent accent colors (sky/violet/emerald)
  are kept as-is; only neutrals get dark equivalents.
- Header toggle (lucide `Sun`/`Moon`), persisted to `localStorage` under a stable
  key (e.g. `trip-theme`), defaulting to system `prefers-color-scheme`.
- A tiny inline script in `frontend/index.html` sets the `dark` class on `<html>`
  **before paint** to prevent a flash of the wrong theme.

**Done when:** toggling switches the whole app cleanly, the choice survives reload,
first paint matches the resolved theme (no flash), and accent colors remain legible
in both themes.

### 2. Desktop layout + mobile responsiveness (one responsive change)

- Results view widens from `max-w-3xl` to `max-w-6xl` and splits into two columns at
  `lg:` — synthesized answer (left) alongside agent contribution cards (right) —
  collapsing to a single column below `lg`. The router note and agent strip span the
  full width above the split.
- The idle/composer/hero view stays centered and narrow (`max-w-3xl`).
- Mobile: keep mobile-first single column; fix header crowding on narrow widths by
  collapsing the "New trip" / "History" text labels to icon-only under `sm`
  (keep `aria-label`s); verify tap targets are ≥ 40px.

**Done when:** wide screens use a balanced two-column results layout, the layout
collapses cleanly to one column on tablet/mobile, and the header never wraps or
overflows on a 360px-wide viewport.

### 3. Accessibility & motion

- History modal (`HistoryPanel.tsx`): add `role="dialog"` + `aria-modal="true"`,
  Escape-to-close, a focus trap (focus moves into the panel on open, Tab cycles
  within it), and focus returns to the History trigger button on close.
- Respect `prefers-reduced-motion`:
  - Typewriter hook renders the answer instantly (no character reveal) when the user
    prefers reduced motion.
  - `fade-in-up`, `blink` cursor, and spinners are stilled via `motion-reduce:`
    utilities (or equivalent guards).

**Done when:** the modal is fully keyboard-operable and screen-reader-announced, and
with OS "reduce motion" enabled there is no typewriter animation, no blinking cursor,
and no card/spinner motion.

### 4. Result actions

- **Copy answer:** button on the synthesized-answer panel copies `state.answer`
  (markdown) to the clipboard, with a transient "Copied" confirmation.
- **Stop:** while streaming, the composer's disabled state is replaced by a Stop
  control that calls a new `cancel()` on `usePlanStream` — it aborts the in-flight
  `AbortController` and transitions `phase` out of `streaming` (to `done`, preserving
  whatever has streamed so far). Partial output remains visible.
- **Export itinerary (option a — copy + print):**
  - "Copy as text" action that serializes the itinerary (and/or full answer) to plain
    text/markdown.
  - Browser **Print** action (`window.print()`) with a print stylesheet that hides
    chrome (header, composer, toggles, raw-JSON, history) and lays out the answer +
    contributions cleanly for paper/PDF. No new dependencies.

**Done when:** the answer can be copied with visible confirmation; a streaming run can
be stopped and its partial result kept; and Print produces a clean, chrome-free
itinerary page suitable for "Save as PDF".

## Components touched

- `frontend/tailwind.config.js` — `darkMode: 'class'`.
- `frontend/index.html` — pre-paint theme script.
- `frontend/src/App.tsx` — header toggle + collapsed labels; results two-column layout;
  wire Stop/cancel.
- `frontend/src/hooks/usePlanStream.ts` — expose `cancel()`.
- `frontend/src/components/Composer.tsx` — Stop control during streaming.
- `frontend/src/components/AnswerPanel.tsx` — copy button; reduced-motion guard in
  the typewriter.
- `frontend/src/components/HistoryPanel.tsx` — dialog semantics, Escape, focus trap.
- `frontend/src/index.css` — print stylesheet; any motion-reduce base rules; dark
  base on `body`.
- All presentational components (`AttributionCards`, `DestinationCards`,
  `ItineraryTimeline`, `BudgetBreakdown`, `RouterNote`, `AgentStrip`, `RawJsonToggle`)
  — `dark:` neutral variants.
- A small theme hook/util (e.g. `frontend/src/hooks/useTheme.ts`) for the toggle.

## Non-goals

- No backend, API, or shared-types changes.
- No PDF/`.ics` libraries (option a chosen: copy + browser print).
- No redesign of the agent-attribution model or color system.
- No new routing, auth, or persistence beyond the theme flag.

## Testing / verification

- `npm run typecheck` and `npm run build` pass.
- Manual: toggle dark mode (+ reload, + system default); resize to 360px / tablet /
  wide desktop; keyboard-only pass through the history modal (open, Tab, Esc); OS
  reduce-motion on; copy answer; stop a live run; print preview.
