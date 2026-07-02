# Design — T-007-02-02 ghost-render-translucent

## Problem restated

Render a translucent landing marker at `ghostCells(board, active)`, tracking the active piece on
every move/rotate, without letting the ghost paint over the active piece (or settled cells). The
composed `Board` matrix (`(TetrominoType | null)[][]`) cannot encode a third "ghost" kind, so the
ghost must reach `Cell` through a **separate channel**, and `Cell` must render a translucent
variant that a test can identify.

Two decisions drive the design: **(A) how the ghost reaches `Cell`**, and **(B) how suppression
(don't draw the ghost over the active piece) is enforced**.

## Decision A — how the ghost cells reach the render

### Option A1 — Rich render-cell matrix (rejected)

Introduce `RenderCell = { type: TetrominoType; kind: "settled" | "active" | "ghost" } | null` and
a new pure `lib/` composer that folds settled + active + ghost into one `RenderCell[][]`. `Cell`
branches on `kind`.

- **Pro:** one matrix carries everything; suppression is decided in one pure place.
- **Con:** invasive. Changes `Cell`'s prop shape (`cell` is currently `TetrominoType | null`),
  changes `Board`'s element type, changes `useGame.view`'s type, and **breaks every existing
  `Board`/`GameContainer` test** that reads `dataset.cell` as an id/`"empty"` and asserts
  `bg-piece-*`. A large blast radius for a purely additive visual marker. Rejected.

### Option A2 — Separate ghost channel into `Board`, drawn on empty cells (chosen)

Keep the composed `view` matrix exactly as-is. Pass the ghost to `Board` as **two extra optional
props**: `ghost?: Point[]` (the landing cells, straight from `ghostCells`) and `ghostType?:
TetrominoType | null` (for hue). `Board` builds a `Set` of `y * cols + x` keys — the *same* key
convention it already uses for `Cell` — and hands each square a `ghost` prop: the type when that
square is a ghost cell, else `null`. `Cell` renders the translucent variant only when the
underlying `cell` is `null` **and** `ghost` is set.

- **Pro:** additive. `view`/`overlayPiece`/`GameView.view` untouched; `Cell.cell` unchanged, so
  every existing assertion holds. Ghost squares keep `data-cell="empty"` (their model cell *is*
  empty) → invisible to `filledCoords` in `GameContainer.test`, zero regression. Reuses the
  existing key math and the literal-class pattern.
- **Pro:** suppression falls out for free (see Decision B).
- **Con:** the ghost travels beside the matrix rather than inside it — two channels `Board` must
  zip by key. Minor: `Board` already computes that exact key.
- **Chosen.** Smallest diff, no test churn, respects the `lib/**` purity boundary (no new pure
  module needed — `ghostCells` already gives us the cells).

### Option A3 — Compute the ghost inside `Board` (rejected)

Pass `active` + `board` to `Board` and call `ghostCells` there.

- **Con:** pushes game-derivation into the presentational grid, which today "holds no state and no
  game logic." `useGame` is the established seam for view derivation (it already memoizes
  `overlayPiece`). Deriving the ghost there keeps `Board` dumb and memoizes on `state`. Rejected.

**Where the ghost is derived:** in `useGame`, mirroring `view`:
`const ghost = useMemo(() => ghostCells(state.board, state.active), [state])`, exposed on
`GameView` alongside `view`. `GameContainer` passes `ghost` and `state.active.type` to `Board`.
This tracks move/rotate automatically — every `dispatch` produces a new `state`, re-memoizing both
`view` and `ghost`.

## Decision B — suppression (don't draw the ghost over the active piece)

### Option B1 — "draw ghost only where the composed cell is empty" (chosen)

`Cell` draws the ghost variant iff `cell === null && ghost !== null`. Because `overlayPiece` sets
every active-piece cell (and every settled cell) to a non-`null` id, a ghost cell that coincides
with the active piece (or the stack) lands on a **non-empty** composed square and is simply not
drawn. This single rule covers:

- The **already-resting piece** whose `ghostPiece` returns the piece's own position (the exact
  case the T-007-02-01 review flagged as the renderer's job) — ghost cells == active cells, all
  non-empty, ghost suppressed. No redundant double-draw, no special case.
- The normal falling case — the landing is below the piece on empty squares, so the ghost shows.
- Settled cells the ghost can never actually overlap anyway (`hardDrop` never rests inside the
  stack) — belt-and-suspenders correct.

- **Pro:** one boolean, decided at the leaf where both facts (`cell`, `ghost`) are in hand. No set
  subtraction, no comparing active vs. ghost coordinates upstream.
- **Chosen.**

### Option B2 — subtract active cells from ghost cells in `useGame` (rejected)

Compute `overlayPiece` cells and remove them from `ghost` before passing down.

- **Con:** re-derives the active cell set, duplicating what `overlayPiece` already did, to solve a
  problem the empty-cell guard solves for free at the leaf. More code, more to keep in sync.
  Rejected.

## Decision C — the translucent look

Add a second literal map in `Cell`, `GHOST_COLOR: Record<TetrominoType, string>`, mirroring
`CELL_COLOR` and the literal-class rationale (Tailwind v4 tree-shakes non-literal utilities). Each
entry is a **translucent fill + hairline outline in the piece's own hue**, e.g.
`"bg-piece-t/15 ring-1 ring-inset ring-piece-t/60"`. This reads as an outlined, see-through
footprint distinct from both the solid neon fill and the blank `bg-white/5` empty cell — the
conventional "ghost piece" look. `rounded-[2px]` stays shared. Opacity modifiers on the real
`--color-piece-*` tokens are exactly what globals.css set up.

**Test identifiability:** ghost squares emit a dedicated `data-ghost={type}` attribute (and keep
`data-cell="empty"`). Tests key off `[data-ghost]` — necessary because the translucent fill
`bg-piece-*/15` *contains* the substring `bg-piece-`, so the existing "no `bg-piece-`" empty-cell
heuristic cannot distinguish a ghost. Non-ghost squares omit the attribute entirely.

## Game-over behavior

No special-casing. On top-out the active piece overlaps the stack; its `hardDrop` landing is its
own (colliding) position, whose cells are non-empty in `view` → ghost suppressed by the Decision B
guard. `useGame` passes `ghost` unconditionally; the leaf guard does the right thing. (Documented
so a reviewer needn't trace it.)

## Blast radius

- `lib/`: **none.** `ghostCells` is imported as-is.
- `components/useGame.ts`: +1 memo, +1 field on `GameView`.
- `components/GameContainer.tsx`: pass two props.
- `components/Board.tsx`: +2 optional props, build a key set, pass `ghost` per cell.
- `components/Cell.tsx`: +1 optional prop, +1 literal map, +1 branch.
- Tests: extend `Board.test.tsx`; **create** `Cell.test.tsx`. Existing tests unchanged and green.

## Rejected globally

Animating the ghost (fade/`.motion`), a settings toggle to disable it, or a distinct "ghost cannot
place" warning color — all out of scope for "renders at the landing position and updates on every
move/rotate." The vocabulary (`.motion`) remains available for a later juice ticket.
