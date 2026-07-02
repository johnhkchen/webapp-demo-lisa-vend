# Design — T-007-02-01 ghost-projection-core

## Decision

Add `lib/ghost.ts` exporting **two** thin, pure functions that delegate to the existing core:

```ts
ghostPiece(board: Board, piece: Piece): Piece   // = hardDrop(board, piece)
ghostCells(board: Board, piece: Piece): Point[] // = pieceCells(landing)
```

`ghostPiece` returns the active piece translated straight down to its resting placement (the
`Piece` primitive). `ghostCells` returns the four absolute board cells of that resting piece
— the "resting cells for any active piece" the AC literally asks for. `ghostCells` is defined
*in terms of* `ghostPiece` + `pieceCells`, so there is exactly one landing computation and
zero shape/collision math in this module.

## Why this shape

The whole point of the ticket (and the P5 rigor invariant) is **reuse, not
reimplementation** — the same discipline `overlay.ts` states in its header ("no shape math
lives here"). The landing is already defined once, canonically, by `movement.ts#hardDrop`,
which the reducer itself uses for the `"hardDrop"` input. Ghost is *the same projection*
rendered translucent instead of committed. So:

- `ghostPiece` is a one-liner over `hardDrop`. It adds no logic — it names the concept
  ("where would this land?") at the `lib/` boundary so the renderer imports intent, not a
  raw movement primitive.
- `ghostCells` composes `ghostPiece` with `pieceCells` — the exact accessor `overlay.ts` and
  `collision.ts` use. No coordinates are computed here.

Because both delegate, the two AC invariants hold **by construction**:
- *Coincides with hardDrop's landing row*: `ghostPiece` **is** `hardDrop`; identical
  position, trivially the same landing row.
- *Never overlaps settled cells*: `hardDrop`'s result is a legal placement (`collides` is
  false there), so every cell `ghostCells` returns is null-on-board.

## Why expose both (not just one)

The AC says "resting cells," and the renderer (T-007-02-02) needs cells to mark a
translucent variant. But returning *only* `Point[]` would throw away the `Piece` (type +
rotation), which the renderer also needs to color the ghost by tetromino and which is the
more composable primitive (cells derive from it, not vice-versa). Returning *only* the
`Piece` would push the `pieceCells` call into the render layer — re-spreading the "resolve
cells" step the AC wants owned in `lib/`. Exposing both keeps each caller honest: the
renderer takes cells for painting and the `Piece` for type/rotation, and neither re-derives
geometry. The cost is one extra 1-line function — negligible, and it mirrors how
`collision.ts` pairs `pieceCells` with `collides`.

## Behavior at the edges (all inherited, not re-specified)

- **Already resting** (piece on floor/stack): `hardDrop` returns the input reference
  unchanged, so `ghostPiece(board, p) === p` and `ghostCells` = the active piece's own
  cells. The ghost coincides exactly with the active piece. This is correct pure behavior;
  the renderer decides whether to suppress a ghost that overlaps the active piece
  (T-007-02-02's concern, explicitly out of scope here).
- **Empty column**: piece drops to the floor; landing is the lowest legal row. Bounded by
  board height (hardDrop's loop terminates on the no-op contract).
- **Off-grid input**: not a real game state (the active piece is always in-bounds), but
  `hardDrop`/`pieceCells` are total and never throw, so the functions stay total too.
- **Non-mutation**: `hardDrop` and `pieceCells` are copy-on-write / fresh-allocating, so
  `ghost.ts` mutates nothing. Preserved without extra code.

## Options considered and rejected

**A. Reimplement the drop inside `ghost.ts`** (loop `collides` downward locally). Rejected:
duplicates the exact logic `hardDrop` owns, violates the ticket's stated reuse goal and the
P5 invariant, and creates a second definition of "landing" that can drift from the reducer's.

**B. Return a merged/painted `Board`** (mirror `overlayPiece`'s return type literally).
Rejected: a ghost is a *translucent marker underneath* the active piece, not an opaque
overlay — painting it into a `Board` of `TetrominoType` cells loses the "this is a ghost, not
a settled block" distinction, and the ghost would fight the active-piece overlay for the same
`Cell` slots. The renderer needs the ghost as a *separate* cell set to style differently
(a distinct Cell variant, per T-007-02-02's AC), so cells + Piece is the right currency, not
a Board.

**C. Add a `ghost` field to `GameState` / compute it in the reducer.** Rejected: out of
scope (touches `game.ts`, risks the shared-file collision the DAG guards against), and the
ghost is a pure derivation of `(board, active)` with no state of its own — deriving it at the
view boundary (like `overlayPiece`) is the established pattern. Keeping it a free function
also keeps it trivially unit-testable without constructing a full `GameState`.

**D. Single function returning `{ piece, cells }`.** Rejected as marginally more awkward to
consume and inconsistent with the codebase's one-concept-per-export style (`pieceCells` and
`collides` are separate; `overlayPiece` is standalone). Two named functions read better at
call sites.

## Consequences

- New public surface: `ghostPiece`, `ghostCells` in `lib/ghost.ts`. Small, composable,
  documented in the `overlay.ts` header style (purpose, reuse note, coordinate convention).
- T-007-02-02 imports `ghostCells` (for the marker) and `ghostPiece` (for type/rotation);
  no further `lib/` change expected for the render.
- Test suite mirrors `overlay.test.ts`: cross-check against `hardDrop`/`pieceCells`, assert
  the two invariants, non-mutation, and the already-resting edge case.
