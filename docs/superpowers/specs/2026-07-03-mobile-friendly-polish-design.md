# Mobile-Friendly Polish Pass — Design

**Date:** 2026-07-03
**Status:** Approved for planning

## Goal

A prior polish pass (2026-06-18) added mobile-first single-column layout and
icon-only header labels below `sm`, but the app is still not comfortable to use
on a real phone (~360-430px viewports). This is a focused fix pass, not a
redesign: tighten what's cramped, add missing overflow safety, and bring tap
targets up to a comfortable minimum. No new components, no new dependencies,
no change to the visual/agent-color system.

## Approach

Single pass across the existing components, using the same Tailwind-utility
style already established in the codebase. Grouped by concrete defect rather
than by component, so each fix is verifiable in isolation.

Rejected alternative: broader redesign of the two-column results layout for
mobile. The user confirmed the existing `lg:` two-column split (added
2026-06-18) is structurally fine — this pass verifies its collapse behavior
rather than re-architecting it.

## Scope

### 1. Header crowding (`App.tsx`)
- At 360px, logo + wordmark + New trip + theme toggle + History is tight even
  with icon-only collapse below `sm`.
- Shrink the wordmark or truncate gracefully at the narrowest widths; confirm
  no wrapping/overflow at 360px with all three action buttons present at once
  (idle state has only 2, active state has 3).

### 2. Composer cramping on mobile (`Composer.tsx`)
- The `rows={2}` textarea plus wrapped example chips push the send button
  around and eat vertical space when the on-screen keyboard is open.
- Tighten the example-chip row (e.g. horizontal scroll instead of wrap, or
  fewer visible at once) so the composer doesn't grow unpredictably tall on
  narrow screens.

### 3. Horizontal overflow safety
- `BudgetBreakdown.tsx` table and `RawJsonToggle.tsx` `<pre>` block have no
  guaranteed horizontal-scroll containment; long values could force
  page-width overflow instead of scrolling within their own box.
- Wrap both in explicit `overflow-x-auto` containers so any overflow scrolls
  locally, never widens the page.

### 4. Tap targets
- Bring icon-only buttons (History panel close button, RawJsonToggle chevron
  trigger, etc.) up to a ~44px comfortable tap target on touch devices,
  matching the existing 40px buttons elsewhere.

### 5. Breakpoint verification
- Confirm the `lg:` two-column results split (from the 2026-06-18 pass)
  collapses cleanly with no awkward in-between state from ~480px through the
  `lg` breakpoint, including large-phone landscape widths.

## Non-goals

- No redesign of the two-column results layout structure.
- No new components, dependencies, or routing changes.
- No changes to the dark-mode color system or agent accent colors.

## Testing / verification

- `npm run typecheck` and `npm run build` pass.
- Manual resize check at 360px, 390px, 430px (phone), ~600-768px (tablet
  portrait), and the `lg` breakpoint boundary — confirm no horizontal page
  scroll, no overlapping/wrapped header, composer stays compact, and tap
  targets are comfortably sized.
