# T-008-01-01 — Design: candidate-placement-seam

## Decision

Add `lib/bot-placements.ts` exporting a single pure function:

```ts
enumeratePlacements(board: Board, type: TetrominoType): PlacementCandidate[]
```

For every rotation state `0..3` and every horizontally-legal anchor column, spawn the piece at
the top (`y = 0`), skip columns where the spawn already collides (stack reaches the top),
`hardDrop` it, `lockPiece` it, and emit one candidate — deduplicated by the landed piece's
absolute cells so redundant orientations collapse. Compose existing primitives only; add no new
shape or collision math. This mirrors `ghost.ts`'s "reuse, never reimplement" contract.

### Result shape

```ts
export interface PlacementCandidate {
  rotation: RotationState; // the spawn rotation that produced this landing
  column: number;          // the spawn anchor x (may be negative for box-local offsets)
  piece: Piece;            // the landing piece (post-hardDrop): type, rotation, resting position
  cells: Point[];          // the 4 absolute occupied cells of the landing (fresh Points)
  board: Board;            // fresh settled board = lockPiece(board, landing); NO line clear
}
```

`piece` + `cells` + `board` are all derivable from `(type, rotation, column)` + the input board,
but returning them precomputed is the whole point of an evaluator seam — the planner should not
re-run `hardDrop`/`lockPiece` per candidate. `rotation`/`column` are kept so a caller (and the AC
test) can reconstruct/verify the drop, and so the planner can later map a chosen candidate back to
an `Input[]` sequence (rotate ×k, shift to column, hardDrop).

## Algorithm

```
result = []
seen = Set<string>()
width = board[0]?.length ?? 0
for rotation in 0,1,2,3:
    offsets = cellsFor(type, rotation)
    minOffX = min(offsets.x); maxOffX = max(offsets.x)
    for x = -minOffX .. width-1-maxOffX:            // exactly the in-bounds anchors
        spawn = { type, rotation, position: {x, y:0} }
        if collides(board, type, spawn.position, rotation): continue   // buried spawn → unreachable
        landing = hardDrop(board, spawn)
        cells = pieceCells(landing.type, landing.position, landing.rotation)
        key = canonical(cells)                       // sorted "x,y|x,y|..."
        if seen.has(key): continue
        seen.add(key)
        result.push({ rotation, column:x, piece:landing, cells, board: lockPiece(board, landing) })
return result
```

The anchor range `[-minOffX, width-1-maxOffX]` is the exact set of columns where all 4 cells are
horizontally in bounds — no magic constants, no reliance on `collides` for horizontal filtering
(collides at `y=0` then only rejects *vertical* top-of-stack blockage, which is the real
reachability filter).

## Options considered

### A. Rotation range: iterate 0..3 + dedup by landed cells  ✅ chosen
No per-type orientation-count table. Deduping on the *landed absolute cells* is the correct
canonicalization: O's four identical states collapse to one; horizontal-I rot0/rot2 collapse
(they land on identical floor cells); S/Z's shape-equivalent states collapse when and only when
their landings coincide. The dedup key is derived from real geometry, so it can never drift from
a hand-maintained "distinct orientations per piece" constant.

### B. Rotation range: hard-code distinct-orientation counts per type  ❌ rejected
Would need `{ O:1, I:2, S:2, Z:2, T:4, J:4, L:4 }` and a choice of *which* representative state
— duplicating knowledge already implicit in `TETROMINO_CELLS`. A second source of truth that can
disagree with the shape tables. Rejected for the same reason `ghost.ts` refuses to recompute
collision math.

### C. Settled board: apply `clearLines`  ❌ rejected
A bot ultimately wants the post-clear board to score it. But applying `clearLines` here would
delete any completed row's cells, breaking the AC's "occupied cells match a hardDrop" invariant
and making the result unverifiable against `pieceCells`. Keep the seam at the `lockPiece`
altitude (pre-clear) — exactly the boundary `gravity.ts` already draws ("does NOT clear lines").
The evaluator/heuristic applies `clearLines` when it wants line-clear credit. Documented as an
explicit, minimal boundary; revisitable if the planner proves it needs the post-clear board and
a separate `cleared` count more than it needs the cell invariant.

### D. Reachability: full move/rotate/kick pathfinding (tucks, spins, slides)  ❌ rejected
Real Tetris lets a piece slide under an overhang after dropping. Enumerating those placements is
a BFS over the `Input` state space — far more than the AC asks ("a hardDrop ... at that
rotation/column") and far more than the planner needs for a demo attract bot. Straight
spawn-column hard-drops give strong, legible play. Out of scope; the `column`/`rotation` fields
leave the door open for a richer enumerator later without changing the result type.

### E. Input shape: take `GameState` / `Piece` instead of `(board, type)`  ❌ rejected
Taking `GameState` would couple the seam to the bag and score and tempt bag advancement — the
exact side effect E-008 says to avoid. Taking a `Piece` would carry an irrelevant incoming
position/rotation (we spawn fresh from the top anyway). `(board, pieceType)` is the minimal,
bag-free, position-free input — matching the AC signature `enumeratePlacements(board, pieceType)`
and structurally guaranteeing "no bag mutated."

## Purity & correctness argument

- **No mutation:** `pieceCells`/`lockPiece` are copy-on-write and allocate fresh Points/rows;
  we never write into `board` or the shape tables. The input board is only *read* (via
  `collides`/`hardDrop`). AC's "no input board/bag mutated" holds — and there is no bag input.
- **Cell invariant by construction:** each result's `cells` *is* `pieceCells(hardDrop(spawn))`,
  and `board` *is* `lockPiece` of that same landing, so occupied cells match the hard-drop by
  identity, not by coincidence — the same guarantee `ghost.ts` gives.
- **Non-empty & well-formed:** on any board with an empty top row, every rotation yields at least
  one legal column, so the result is non-empty; each `board` has the input's dimensions.
- **Determinism:** no RNG, no time; output depends only on `(board, type)`.

## Scope boundary

Enumerate + settle only. No scoring/heuristics (T-008-01-02), no move-sequence synthesis or
choice (T-008-01-03), no `clearLines`, no bag/`GameState` coupling, no React.
