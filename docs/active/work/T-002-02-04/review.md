# Review — T-002-02-04: gravity-and-lock-on-landing

Handoff document. What changed, how it was verified, what a reviewer needs to know without reading
every diff. Committed as `6443a64`.

## Outcome

Gravity + lock-on-landing is now a pure, framework-free module in a new `lib/gravity.ts`, layered
on top of `movement.softDrop` and `collision.pieceCells`. It exports `lockPiece` (copy-on-write
merge of a piece's 4 cells into the settled board) and `applyGravity` (one gravity step returning a
`GravityResult` discriminated union: `Fell` while descending, `Locked` on landing). A Vitest suite
(`lib/gravity.test.ts`) covers the merge, falling, floor/stack landing, no-mutation, and the
acceptance drive. **Acceptance criterion met.**

## Acceptance criterion — clause by clause

> A test drops a piece to the floor and asserts a gravity step at the bottom locks it — the board
> gains the piece's 4 cells and the active piece is cleared for respawn.

| Clause | Where | Status |
|---|---|---|
| **drops a piece to the floor** | AC drive loops `applyGravity` from spawn until `locked`; asserts the landed piece's lowest cell is on row 19 | ✓ |
| **a gravity step at the bottom locks it** | terminal step returns `locked: true` (floor landing also covered directly by the "resting on the floor" test) | ✓ |
| **board gains the piece's 4 cells** | `filled(result.board) === 4` and each `pieceCells(...)` cell `=== piece.type` | ✓ |
| **active piece cleared for respawn** | `result.piece === null` (`toBeNull`) on every lock | ✓ |

## What changed

### Added
- **`lib/gravity.ts`** (~80 lines) — pure logic, named exports, house-style header (purpose,
  framework-free note, coordinate convention, explicit scope boundary).
  - `GravityResult = Fell | Locked`, discriminated on `locked`. `Fell` carries the unchanged board
    ref + the fallen `Piece`; `Locked` carries a fresh merged board + `piece: null`. The flag
    narrows `piece` to `Piece` vs `null` with no non-null assertions at call sites.
  - `lockPiece(board, piece): Board` — `board.map(row => row.slice())` then stamps each
    `pieceCells(...)` cell to `piece.type`. Copy-on-write: input board/piece never mutated. Does
    not clear lines.
  - `applyGravity(board, piece): GravityResult` — delegates the down-step to `softDrop`; a changed
    reference ⇒ `Fell` (board same ref), the same reference ⇒ `Locked` (board = `lockPiece(...)`,
    piece = null). Floor- and stack-landing share this one path.
- **`lib/gravity.test.ts`** (~150 lines) — Vitest. Reuses `keyOf`/`asSet`/`settle` from the sibling
  suites plus a local `filled` counter. Blocks: `lockPiece` (exact 4-cell stamp, merge over
  settled cells, fresh board / row-copy / no-mutation), `applyGravity` falling (one row per step,
  board ref unchanged, fresh piece), `applyGravity` landing (floor, settled-stack, no-mutation on
  lock), and the acceptance drive.
- **`docs/active/work/T-002-02-04/{research,design,structure,plan,progress,review}.md`**.

### Not changed (deliberately)
- `lib/movement.ts`, `lib/collision.ts`, `lib/tetrominoes.ts`, `lib/types.ts`, `lib/board.ts`,
  `lib/constants.ts`, `lib/bag.ts`, `lib/rng.ts` — gravity only *reads* `softDrop` and
  `pieceCells`; no new type or data was needed (movement's header already anticipated this ticket).
- `components/`, `app/`, config, `package.json` — untouched. No new dependency. Ticket/story/epic
  frontmatter left for Lisa.

## Verification

```
npm test      → Test Files 7 passed (7) · Tests 76 passed (76)
npm run lint  → clean (--max-warnings 0)
```

Before this ticket: 6 files / 67 tests. Now: +1 file, +9 tests, no regression in the pre-existing
board/tetromino/collision/movement/bag/rng suites.

Landing is asserted from two independent surfaces (the floor at y=18/19, and a settled stack at
row 2 beneath a top piece) so the "can fall no further" definition is exercised beyond just the
floor. No-mutation is asserted on *both* the falling path (board ref identical) and the locking
path (input board byte-identical via `JSON.stringify`, only the returned copy differs).

## Design decisions a reviewer should know

- **Landing detected via `softDrop`'s no-op reference** (design D3): `applyGravity` calls
  `softDrop` and treats "same reference back" as "can't fall → lock." This is exactly the seam the
  movement ticket left (`softDrop(...) === piece`), so floor- and stack-landing use one definition
  of "blocked below" with zero duplicated collision logic.
- **Copy-on-write merge** (design D8): `lockPiece` returns a fresh board (rows `slice`d), never
  mutating the input — consistent with every other `lib/` op and its `JSON.stringify` snapshot
  tests. First board-writing op in the engine; sets the pattern for line-clear/hard-drop.
- **`piece: null` = "cleared for respawn"** (design D5): reuses the codebase's established absence
  value (`Cell` is `TetrominoType | null`); no new sentinel type. The `locked` discriminant makes
  a reducer's `if (r.locked) spawnNext() else piece = r.piece` type-safe.
- **New module, not an addition to `movement.ts`** (design D1/D6): movement is scoped to
  translation and explicitly disclaims locking; gravity is the sibling layer above it.

## Open concerns / limitations

- **No line-clear.** `lockPiece` merges but never removes full rows — that is a separate ticket
  (not in S-002-02). A caller must run line-clear after a `Locked` result. Flagged, not fixed.
- **No respawn / bag coupling.** `applyGravity` reports `piece: null`; it does not pull the next id
  from `lib/bag.ts`. Wiring lock → spawn-next belongs to the forthcoming game-state reducer.
- **No lock-delay.** Lock fires immediately on a blocked step. Classic Tetris lock-delay (a grace
  window allowing slides/rotations after touchdown) is a feel/timing concern for the reducer/loop,
  not this pure step. Intentionally out of scope.
- **No top-out / game-over.** Locking a piece whose cells sit at the very top is not treated
  specially here; top-out is a spawn-policy decision for a later ticket.
- **`lockPiece` trusts in-bounds placement.** It does not re-check bounds (an active piece is
  always legally placed, and `applyGravity` only locks a resting piece) — consistent with the other
  pure ops trusting well-typed input. A future direct caller of `lockPiece` with an out-of-bounds
  piece would throw on the array write; not a concern on the gravity path.

No critical issues requiring human attention. The module is stateless and side-effect free, and
composes cleanly into the forthcoming game-state reducer (uniform next-state pair + `locked` flag).
