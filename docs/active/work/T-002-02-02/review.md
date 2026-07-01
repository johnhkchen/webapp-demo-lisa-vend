# Review — T-002-02-02: spawn-and-horizontal-soft-move

Handoff document. What changed, how it was verified, what a reviewer needs to know without
reading every diff. Committed as `6f7d513`.

## Outcome

Piece movement is now a pure, framework-free policy layer in a new `lib/movement.ts`, built on
top of the collision predicate from T-002-02-01. It exports `spawnPiece` (turns a bag id into a
centered, top-of-field `Piece`) and the collision-gated moves `tryMove` / `moveLeft` /
`moveRight` / `softDrop`. A table-driven Vitest suite (`lib/movement.test.ts`) covers spawn
geometry, the acceptance drive, wall/floor/settled no-ops, and no-mutation guards.
**Acceptance criterion met.**

## Acceptance criterion — clause by clause

> A test drives spawn then left/right/down inputs and asserts position updates on legal moves
> and is unchanged (no-op) when a move would collide.

| Clause | Where | Status |
|---|---|---|
| **spawn** a piece | `spawnPiece("T", 10)` in the AC test + full `describe("spawnPiece")` | ✓ |
| left/right/down **updates on legal moves** | AC test: right→x+1, right→x+1, down→y+1, left→x−1 | ✓ |
| **unchanged (no-op) on collision** | AC test: `moveRight` into a settled cell returns the same ref, position unchanged | ✓ |
| single **table-driven test** overall | spawn suites use `it.each`; move suite uses focused `it`s incl. the AC drive | ✓ |

The AC is covered by the named test *"AC: drives spawn then left/right/down …"*, and reinforced
by dedicated no-op tests for each collision surface (left wall, right wall, floor, settled).

## What changed

### Added
- **`lib/movement.ts`** (~75 lines) — pure logic, named exports, house-style header.
  - `spawnPiece(type, width)`: `rotation 0`, `y=0`, `x = Math.floor((width - BOUNDING_BOX[type]) / 2)`.
    Reproduces canonical SRS spawn columns on a 10-wide board (I→3, O→4, T/S/Z/J/L→3) and
    centers on any width. Pure placement — reads no board contents, makes no top-out decision.
  - `tryMove(board, piece, dx, dy)`: computes the shifted point, returns the **input `piece`
    reference** if it would `collide` (no-op contract), else a **fresh** `{ ...piece, position }`.
    Never mutates board or piece; rotation passed through untouched.
  - `moveLeft` (−1,0) / `moveRight` (+1,0) / `softDrop` (0,+1): thin wrappers over `tryMove`.
    `softDrop` doc explicitly disclaims locking (that is T-002-02-04).
- **`lib/movement.test.ts`** (~180 lines) — Vitest. `asSet`/`settle` helpers mirror
  `collision.test.ts`. Spawn suite (per-type columns via `it.each`, in-bounds via
  `pieceCells`+`collides`, narrow-board centering), move suite (legal updates + fresh object;
  four no-op surfaces returning the same reference; AC drive; `tryMove` composition;
  no-mutation guards for legal + no-op; a shape-shift equivalence check).
- **`docs/active/work/T-002-02-02/{research,design,structure,plan,progress,review}.md`**.

### Not changed (deliberately)
- `lib/collision.ts`, `lib/tetrominoes.ts`, `lib/types.ts`, `lib/board.ts`, `lib/bag.ts`,
  `lib/constants.ts` — movement only *reads* `collides` and `BOUNDING_BOX`; no new type/data.
- `components/`, `app/`, config, `package.json` — untouched. No new dependency. Ticket/story/
  epic frontmatter left for Lisa.

## Verification

```
npm test      → Test Files 6 passed (6) · Tests 67 passed (67)
npm run lint  → clean (--max-warnings 0)
```

Before this ticket: 5 files / 42 tests. Now: +1 file, +25 tests, no regression in the
pre-existing board/tetromino/collision/bag/rng suites.

Boundary arithmetic is bracketed: spawn columns pinned per type; no-op tests place pieces
exactly one cell from each collision surface (left wall at x=0, right wall at x=8 for the O,
floor at y=18, settled at (2,0)/(7,2)) so a legal-vs-blocked pair straddles each edge.

## Design decisions a reviewer should know

- **Spawn takes `width`, not the board** (design D5): spawn genuinely needs only one scalar to
  center and, by decision, must not inspect board contents (top-out is deferred). If a reviewer
  prefers a board-taking signature for symmetry with `collides`, it wraps trivially.
- **No-op returns the input reference** (design D4): the most literal reading of "unchanged," and
  it lets gravity (02-04) detect "landed" via `softDrop(...) === piece`. Legal moves return a
  fresh object with a fresh `position`, never mutating the input.
- **Generic centering via `BOUNDING_BOX`** (design D2) instead of a spawn-column table — no
  duplicated data, matches SRS columns exactly.

## Open concerns / limitations

- **Degenerate narrow boards** (width < a piece's box) can yield a negative/oversized `spawnX`;
  the resulting piece would simply `collide`. Out of AC scope, intentionally not special-cased
  (spawn is placement, not validity). Flagged, not fixed.
- **No top-out / game-over** on a blocked spawn — deferred to a later spawn-policy ticket.
- **`softDrop` does not lock** — landing/merge is T-002-02-04; a blocked soft-drop is just a
  no-op here. A future gravity layer will call `softDrop` and, on a no-op, trigger lock.
- **No hard-drop and no rotation** — out of scope (rotation is T-002-02-03). `tryMove` is
  exported so both can reuse the gated-translation primitive.

No critical issues requiring human attention. The module is stateless and side-effect free, so
it composes cleanly into the forthcoming game-state reducer.
