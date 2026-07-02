# Structure — T-007-02-01 ghost-projection-core

## Files

### Created

**`lib/ghost.ts`** (~40 lines incl. header) — the new pure module.

Module header (JSDoc, `overlay.ts` style): purpose (translucent-landing projection for the
renderer), the *reuse* note (landing comes only from `hardDrop`; resolved cells only from
`pieceCells` — no shape/collision math here), coordinate convention (row-major `board[y][x]`,
x→right, y→down), and the scope boundary (pure placement; does NOT lock/merge; the renderer
paints it — T-007-02-02).

Imports:
```ts
import type { Board, Piece, Point } from "./types";
import { hardDrop } from "./movement";
import { pieceCells } from "./collision";
```

Public interface:
```ts
/** The active piece translated straight down to its resting placement — where it would
 *  land on a hard drop. Delegates to hardDrop (the reducer's own landing computation), so
 *  the ghost can never disagree with an actual drop. An already-resting piece returns the
 *  input reference unchanged (hardDrop's no-op contract). Never mutates board or piece. */
export function ghostPiece(board: Board, piece: Piece): Point[] | Piece  // -> Piece

/** The four absolute board cells the ghost occupies at its landing — the "resting cells"
 *  for rendering the translucent marker. Composed from ghostPiece + pieceCells, so no
 *  coordinates are computed here. Every returned cell is a legal (null-on-board) square,
 *  because hardDrop's resting placement does not collide. Returns fresh Points. */
export function ghostCells(board: Board, piece: Piece): Point[]
```

Implementations are one line each:
- `ghostPiece` → `return hardDrop(board, piece);`
- `ghostCells` → `const landing = ghostPiece(board, piece); return pieceCells(landing.type, landing.position, landing.rotation);`

### Created

**`lib/ghost.test.ts`** (~90 lines) — vitest suite, mirroring `overlay.test.ts` conventions
(import `emptyBoard`, `COLS`/`ROWS`, `pieceCells`, `hardDrop`, types; cross-check rather than
hard-code; canonical `T_PIECE` fixture).

### Modified / Deleted

None. This ticket adds files only. No change to `game.ts`, `overlay.ts`, `movement.ts`, the
components, or config. (The render threading is T-007-02-02.)

## Module boundaries

```
types.ts ── Board, Piece, Point
   │
collision.ts ── pieceCells          movement.ts ── hardDrop
        \                              /
         \                            /
          ▼                          ▼
                 ghost.ts  (ghostPiece, ghostCells)
                          │
                          ▼  (consumed later by)
              components/ (Board/Cell) — T-007-02-02, NOT this ticket
```

`ghost.ts` sits at the same layer as `overlay.ts`: a pure "view-prep" derivation over the
core. It imports only downward (`movement`, `collision`, `types`); nothing in `lib/` imports
it (the renderer will). No cycles: `movement`/`collision` do not import `ghost`.

## Internal organization of `ghost.ts`

1. Module JSDoc header.
2. Imports (types, `hardDrop`, `pieceCells`).
3. `ghostPiece` — the landing `Piece`.
4. `ghostCells` — the landing's resolved cells (defined via `ghostPiece`).

`ghostPiece` first so `ghostCells` reads top-down. `ghostCells` calls `ghostPiece` (not
`hardDrop` directly) so there is a single named landing step to change if the projection ever
needs to differ from a raw hard drop.

## Test file organization (`lib/ghost.test.ts`)

- Fixtures: `T_PIECE` (rotation 0 at `{x:3,y:0}`) as in `overlay.test.ts`; an `emptyBoard`.
- `describe("ghostPiece")`:
  - lands at `hardDrop`'s exact placement (assert `ghostPiece(...)` deep-equals
    `hardDrop(board, piece)` — the "coincides with hardDrop's landing row" invariant).
  - on an empty board, lands on the floor (bottom-most cell row = `ROWS-1` for the piece's
    lowest offset; cross-checked via `pieceCells`).
  - lands on top of a settled stack, not inside it.
  - already-resting piece returns the input reference unchanged (no-op contract).
  - does not mutate board or piece.
- `describe("ghostCells")`:
  - returns exactly 4 cells, all null on the board (the "never overlaps settled cells"
    invariant) — build a board with settled cells in the drop column and assert the ghost
    rests above them.
  - equals `pieceCells` of `ghostPiece` (reuse check; no hard-coded coordinates).
  - returns fresh `Point`s (not aliasing shared shape data).

## Ordering of changes

Single atomic unit — implementation + tests land together (one file pair, no dependencies to
sequence). Detailed step order is in `plan.md`.
