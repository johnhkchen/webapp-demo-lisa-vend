# T-009-03-01 — Research: board-as-recessed-clay-well

## Ticket ask

Retone `Board.tsx`'s container chrome from the dark-glass `border-white/10 bg-white/5
shadow-2xl` treatment to the kit's clay-well recessed-surface primitive so the board reads as
pressed into the clay page.

Acceptance criterion: `Board.tsx` no longer contains `bg-white/5` or `shadow-2xl`; it applies
the kit's clay-well surface classes and the board visually reads as a recessed well against the
clay page in a dev-server check; `Board.test.tsx` and `Board.flash.test.tsx` still pass.

## Where the chrome lives

`components/Board.tsx`, the cell-grid container (line 70-74 in the current working tree):

```tsx
<div
  aria-label="RowClear board"
  className="grid h-full w-full gap-px rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl"
  style={gridStyle}
>
```

This is the only place in the file carrying `bg-white/5` or `shadow-2xl`. Grep confirms no other
occurrence of either string in `components/Board.tsx`.

A second, sibling element in the same file — the flash overlay (lines ~85-90) — carries related
but distinct geometry classes:

```tsx
<div
  key={flashKey}
  aria-hidden
  className="pointer-events-none absolute inset-0 grid gap-px border border-transparent p-2"
  style={gridStyle}
>
```

Its own doc comment states it "mirrors the cell grid's exact geometry (same template, gap,
padding — computed once and shared)". It does not carry `bg-white/5`/`shadow-2xl` and is not
itself named by the AC, but its `border border-transparent` exists specifically to match the
main grid's `border` **width** (both currently 1px, one visible-white, one transparent) so the
two grids' content boxes (and therefore the flash bars' `gridRow` placement) line up pixel-for-
pixel under `box-sizing: border-box`. This is a geometry dependency the retone must not break.

## The clay-well primitive

`styles/vendor/b28-clay.css` (vendored T-009-01-01, `@import`ed into `app/globals.css` T-009-01-02):

```css
.clay-well {
  background: var(--clay-well);
  border-radius: var(--clay-radius);
  box-shadow: var(--clay-shadow-well);
}
```

No `border` property. `--clay-radius` is `1rem` (vs. Tailwind's `rounded-lg` = `0.5rem`).
`--clay-shadow-well` is a deep inset dual-shadow (dark top-left inset + light bottom-right
inset) — this is the kit's "things you look INTO" primitive, called out by name in the kit's own
comment: "A recessed well: game boards, tracks, inputs — things you look INTO." Board is the
kit's own worked example for this exact class.

The kit doc comment (top of file) also states the guiding principle: "What looks pressable IS
pressable — a button that looks raised actually recesses when you press it," and separately,
"truthful: one light source (top-left); shadows are WARM (tinted by the ink color, not gray)."
`clay-well`'s box-shadow already encodes both.

## Current usage of `.clay-well` / `.clay-surface` / `.clay-chip` in this repo

Grep across `components/` and `app/` for `clay-well`, `clay-surface`, `clay-chip`, `clay-button`
finds **zero** matches — this ticket is the first consumer of any `b28-clay.css` primitive class
in a component. `app/globals.css` only consumes the kit's CSS **custom properties**
(`--clay-bg`, `--clay-ink`, `--clay-font-*`) via its own `:root`/`body`/`h1-h3` rules; no
component file references a `.clay-*` primitive class yet. `HoldBox.tsx` and `NextPreview.tsx`
still carry the same `border border-white/10 bg-white/5 ... shadow-2xl` dark-glass treatment
Board currently has — those are separately scoped to T-009-03-03 / T-009-03-04 (siblings,
`depends_on: [T-009-02-01, T-009-01-03]`, currently `phase: ready`), not this ticket.

## Consumers of Board's container

`components/GameContainer.tsx` (line ~191-198) wraps `<Board .../>` in a bare
`<div className="relative">` with no chrome of its own — `GameOverlay`/`StartOverlay` are
absolutely positioned inside that wrapper, layered over Board. No wrapper applies competing
background/shadow that would fight a clay-well retone; the wrapper is purely a positioning
context.

## Tests exercising Board's container

- `components/Board.test.tsx` — asserts on `[data-cell]` counts/attributes and one
  `container.querySelector('[aria-label="RowClear board"]')` lookup (checks
  `gridTemplateColumns`/`gridTemplateRows` inline style only). No assertion on the container's
  `className` string.
- `components/Board.flash.test.tsx` — asserts on `[data-flash-row]` bar count, `gridRow` inline
  style, and `className.includes("flash")` (the row-clear animation class, unrelated to the
  container chrome). Also checks `[aria-label="RowClear board"]` exists and `[data-cell]` count
  is undisturbed by the flash overlay. No assertion on the container's own chrome className.

Grep confirms: no test file in this repo asserts on `bg-white/5`, `shadow-2xl`, `border-white`,
or `rounded-lg` substrings for Board specifically. The AC's two test files are satisfied purely
by the DOM structure/attributes staying intact, not by any particular class string — so the
className swap itself cannot break either test file (confirmed by reasoning through both files
line-by-line above; will also confirm by running the suite in Implement).

## Build / verification tooling available

Same as documented in prior S-009 tickets' research: `npm run build` (vinext), `npm run dev`,
`npm run test` (vitest — 32 files / 302 tests as of this session's baseline run), `npm run lint`.
No visual-regression/screenshot tooling in this repo (confirmed absent from `package.json`).
"Visually reads as a recessed well ... in a dev-server check" (AC) is necessarily a manual
`npm run dev` + look, not an automated assertion.

## Working-tree state note (recurring pattern in this epic)

`app/globals.css`, `components/Board.tsx`, `components/Cell.tsx`, `components/HoldBox.tsx`,
`components/NextPreview.tsx`, `app/layout.tsx`, `app/page.tsx` all carry pre-existing uncommitted
diffs from sibling S-009 tickets (kit vendoring/import, `TetrominoType`→`PieceType` rename,
font wiring, piece-palette retone, branding copy) — consistent with the RDSPI concurrency model
(multiple threads on one branch, file-lock serialization only). `Board.tsx`'s only uncommitted
hunk outside this ticket's scope is the `TetrominoType`→`PieceType` type rename and the
`"Tetris board"`→`"RowClear board"` aria-label string — both unrelated to container chrome, both
left untouched. As prior tickets (e.g. T-009-02-01) did, Implement/Review must isolate a minimal
patch covering only this ticket's own hunk when committing, not the full working-tree diff.

## Constraints and assumptions surfaced

- Scope is `components/Board.tsx` only, per the ticket title and AC. `Cell.tsx`'s empty-square
  fill, `HoldBox.tsx`/`NextPreview.tsx`'s panel chrome, and `GameContainer.tsx`'s layout wrapper
  are explicitly out of scope (separate sibling tickets in S-009-03/04 cover them).
  data-flash-row bars carry a `border border-transparent` sized to match the main grid's
  `border` width; removing/changing the main grid's border affects that pairing and must be
  handled in the same change, or flash-bar/cell alignment silently drifts by the border delta.
- AC forbids `bg-white/5` and `shadow-2xl` explicitly; it does not explicitly forbid
  `border-white/10` or `rounded-lg`, but `clay-well` provides its own radius and shadow and has
  no border — Design must decide whether to retain, drop, or replace the border and radius
  utilities as part of "applies the kit's clay-well surface classes."
