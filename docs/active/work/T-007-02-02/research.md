# Research — T-007-02-02 ghost-render-translucent

## Ticket

Thread the ghost projection (from `lib/ghost.ts`, T-007-02-01) through the React view into
`Board`/`Cell` as a **translucent landing marker** that tracks the active piece as it moves and
rotates. _Advances: P4 (feel/juice), P2._

**AC:** In the running game a translucent ghost renders at the landing position and updates on
every move/rotate; `Board`/`Cell` tests cover the ghost cell variant and the production build
stays green.

This is purely a **render-threading** ticket. The pure landing math already exists and is fully
tested; nothing in `lib/` is expected to change (per the T-007-02-01 handoff note).

## The pure core we build on (`lib/ghost.ts`)

Two framework-free functions, both thin delegations (committed `f7bd75d`):

- `ghostPiece(board, piece): Piece` = `hardDrop(board, piece)` — the resting placement. An
  already-resting piece returns the **input reference unchanged** (inherited no-op contract).
- `ghostCells(board, piece): Point[]` = `pieceCells` of that landing — the four absolute board
  cells the ghost occupies. Fresh `Point`s, never aliasing shape tables; every cell is legal
  (`null`-on-board) because `hardDrop` never rests in a wall/floor/settled cell.

The handoff note (T-007-02-01 review) explicitly says: the render ticket should import
`ghostCells` to mark the translucent cells, and `ghostPiece` only if it needs identity/rotation
for coloring. **Suppressing a redundant ghost draw when it coincides with the active piece, and
styling the translucent variant, are explicitly this ticket's scope.**

## The render path today

The data flows: `GameState` → `useGame` composes a view → `GameContainer` → `Board` → `Cell`.

### `components/useGame.ts` (the React seam, `"use client"`)

- Holds `GameState` (`createInitialState(seed)`), exposes `{ state, view, dispatch }` (`GameView`).
- `view = useMemo(() => overlayPiece(state.board, state.active), [state])` — the settled board
  with the active piece painted on top, a `Board` matrix.
- `dispatch` runs the pure `step` reducer via a functional `setState`; referentially stable.
- No game rules reimplemented here — it reuses `overlayPiece` (which reuses `pieceCells`).

### `lib/overlay.ts` (pure view-prep, sibling of `ghost.ts`)

- `overlayPiece(board, piece): Board` — copy-on-write matrix with the piece's cells set to
  `piece.type`. The overlay **wins** over settled cells it covers. Cells off-grid are skipped.
- The composed matrix is a plain `Board = (TetrominoType | null)[][]`. **It has no way to encode a
  third "ghost" cell state** — a cell is either a piece id or `null`. This is the central
  constraint for this ticket: the ghost is a *distinct visual kind*, not another settled id.

### `components/GameContainer.tsx` (the single client island)

- `const { state, view, dispatch } = useGame();`
- Renders `<Board board={view} />` and a `<GameOverlay visible={state.gameOver} .../>`.
- Owns gravity (rAF loop dispatching `"tick"`, gated on `!gameOver`) and keyboard → `Input`.
- Holds no game rules — it hands the composed view to `Board`. **This is where the ghost cells
  would be threaded in** alongside `view`.

### `components/Board.tsx` (props-driven grid, server-renderable)

- Takes `board: BoardMatrix`, derives `rows`/`cols` from the matrix (constants only as fallback).
- `board.flatMap((row, y) => row.map((cell, x) => <Cell key={y * cols + x} cell={cell} />))`.
- Holds no state/logic — owns only the grid container chrome. **Cell keys are `y * cols + x`**;
  any ghost lookup must use the same key convention to line up.

### `components/Cell.tsx` (one square, presentational)

- `cell: TetrominoType | null`. Branches on `cell === null`:
  - empty → `"rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5"`, `data-cell="empty"`.
  - filled → `"rounded-[2px] {CELL_COLOR[cell]}"`, `data-cell={cell}`.
- `CELL_COLOR` is a **literal** `Record<TetrominoType, "bg-piece-*">` map. Comment explains why:
  Tailwind v4 only emits utilities it finds as literals in source; a computed `bg-piece-${type}`
  would be tree-shaken. **Any ghost fill classes must likewise be literals**, one per piece.
- Renders `data-cell={cell ?? "empty"}` — the hook tests query squares via `[data-cell]`.

## Styling vocabulary available (`app/globals.css`, E-004)

- Per-piece neon tokens `--color-piece-{i,o,t,s,z,j,l}` (oklch), exposed as the
  `bg-/text-/border-/ring-piece-*` utility family. Opacity modifiers (`bg-piece-i/15`,
  `ring-piece-i/60`) apply to these real color tokens — the natural way to get a *translucent*
  fill/outline in each piece's hue.
- `.glow-*`, `.glass`, `.motion*`, `.flash` component-layer utilities exist but are not required
  for a minimal translucent ghost. `.motion` (transform/opacity only) is available if a fade is
  wanted later.

## Test conventions

- Component tests: `// @vitest-environment jsdom`, `@testing-library/react`, `afterEach(cleanup)`.
- `Board.test.tsx`: queries squares via `[data-cell]`; asserts fill via `className.includes
  ("bg-piece-*")` and empties via absence of `bg-piece-`. **Caveat for design:** a translucent
  ghost fill like `bg-piece-i/15` *contains* the substring `bg-piece-`, so any ghost test must
  identify ghosts by a dedicated marker (e.g. a `data-ghost` attribute), not by that substring.
- `GameContainer.test.tsx`: `filledCoords` filters `dataset.cell !== "empty"`. If ghost squares
  keep `data-cell="empty"` (underlying cell is empty), they are **invisible to every existing
  assertion** — no regression risk. `cells()` counts all `[data-cell]`, so grid-length asserts
  (ROWS×COLS) also stay valid as long as ghost squares still carry `data-cell`.
- No `Cell.test.tsx` exists yet — the AC calls for `Cell` coverage of the ghost variant, so one
  must be created.
- Full suite currently **177 passed / 19 files**; lint `--max-warnings 0`; vinext build green.

## Constraints & assumptions

- `lib/**` is framework-free (eslint boundary); ghost styling/suppression are *rendering*
  concerns and must live in components, not `lib/`.
- The composed `Board` matrix cannot represent the ghost kind → the ghost must reach `Board`/`Cell`
  as a **separate channel** (extra prop), not baked into the matrix.
- Suppression: the ghost must not draw where the active piece (or a settled cell) already is.
  Because `overlayPiece` marks active/settled cells non-`null`, a rule of "draw ghost only on an
  empty composed cell" satisfies both suppression cases — including the already-resting piece
  whose ghost coincides exactly with it.
- Single active piece ⇒ all ghost cells share one type (`state.active.type`) for coloring.
- Determinism/hydration: no new time/random sources introduced (ghost derives purely from state).
