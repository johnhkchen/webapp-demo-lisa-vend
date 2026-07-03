# T-009-03-01 — Structure: board-as-recessed-clay-well

## Files touched

Exactly one source file: `components/Board.tsx`. No other file is created, deleted, or modified
by this ticket.

- `components/Board.test.tsx`, `components/Board.flash.test.tsx` — read-only for this ticket
  (run for verification, not edited); Design/Research confirmed neither asserts on the
  container's className, so no test edit is needed to keep them green.
- `styles/vendor/b28-clay.css`, `app/globals.css` — read-only; the `.clay-well` primitive and its
  token dependencies (`--clay-well`, `--clay-radius`, `--clay-shadow-well`) already exist and are
  already wired in (T-009-01-01/T-009-01-02, both `phase: done`). Nothing to add or change there.

## Module boundaries — no change

`Board.tsx` remains a pure, props-driven presentational component: same props interface
(`board`, `ghost`, `ghostType`, `flashRows`, `flashKey`), same exported default, same two-level
DOM shape (outer sizing div → cell grid + optional flash overlay). This ticket touches only
`className` string literals on two existing elements; it adds no new elements, props, state,
imports, or exports.

## Ordering of changes within the file

Both edits are independent single-line `className` replacements on elements that already exist
at fixed locations in the file; there is no sequencing dependency between them, and no dependency
on any change outside this file. Applied together:

1. **Cell-grid container** (`aria-label="RowClear board"` div):
   `"grid h-full w-full gap-px rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl"`
   → `"clay-well grid h-full w-full gap-px p-2"`

2. **Flash overlay container** (`aria-hidden` div, only rendered when `flashRows.length > 0`):
   `"pointer-events-none absolute inset-0 grid gap-px border border-transparent p-2"`
   → `"pointer-events-none absolute inset-0 grid gap-px p-2"`

Change 2 exists only to preserve change 1's geometric side effect (Design: removing the main
grid's `border` utility must be mirrored on the overlay's matching `border border-transparent`,
or the two grids' content boxes diverge by the old border-width). It is not independently
motivated — it is a required companion to change 1, not a separate concern.

## Public interface — no change

`BoardProps` (`board`, `ghost?`, `ghostType?`, `flashRows?`, `flashKey?`) is unchanged. Every
call site (`GameContainer.tsx`'s single `<Board .../>` usage) needs no edit — it passes props,
never chrome classes, so it is unaffected by an internal className swap.

## Test strategy (detail deferred to Plan)

No new test file. Both existing Board test files are structural/attribute assertions that this
change does not touch (confirmed in Research/Design) — they serve as the regression guard. A
manual dev-server visual check is the only way to verify the AC's qualitative "reads as a
recessed well" bar, since no visual-regression tooling exists in this repo.

## Risk surface

- **Low.** Two className string edits, zero logic/data/prop changes, zero new files. The only
  non-trivial risk is the flash-overlay geometry parity (Design Option D rejection) — mitigated
  by making it an explicit, paired edit rather than an afterthought.
- Commit isolation: per the recurring working-tree pattern (Research), several unrelated
  hunks already sit uncommitted across the repo, including inside `Board.tsx` itself (the
  `TetrominoType`→`PieceType` rename, the `"RowClear board"` aria-label string). Implement/Review
  must stage and commit only this ticket's two className hunks, leaving everything else in the
  working tree exactly as found — same discipline T-009-02-01 documented and applied.
