# Structure — T-002-02-02: spawn-and-horizontal-soft-move

The blueprint. File-level changes, interfaces, internal organization, ordering. Not code.

## Files

| File | Action | Purpose |
|---|---|---|
| `lib/movement.ts` | **create** | Spawn + single-step translation, gated by collision. |
| `lib/movement.test.ts` | **create** | Vitest suite: spawn geometry + move/no-op, incl. AC test. |
| `docs/active/work/T-002-02-02/*.md` | create | RDSPI artifacts. |

No existing files modified. No new dependencies. No `components/`, `app/`, config, or
ticket-frontmatter changes (Lisa owns phase/status).

---

## `lib/movement.ts`

### Header doc-comment (house style)
Role: the movement *policy* layer over the collision *predicate*. States: pure/framework-free
(eslint `lib/**` boundary); coordinate convention (`board[y][x]`, x right, y down); scope
boundary — **translation + spawn only**; rotation is T-002-02-03, gravity/lock is T-002-02-04;
no bag coupling (bag is the *source* of the id, not touched here); no-op returns the input
reference. Mirrors the framing in `collision.ts`.

### Imports
```ts
import type { Board, Piece, TetrominoType } from "./types";
import { BOUNDING_BOX } from "./tetrominoes";
import { collides } from "./collision";
```
`import type` for types (matches convention). Value imports: `BOUNDING_BOX` (centering),
`collides` (the gate).

### Public functions (in this order)

1. **`spawnPiece(type: TetrominoType, width: number): Piece`**
   - Doc: constructs the active piece at rotation 0, horizontally centered, anchor `y = 0`
     (all cells land at `y >= 0`; no buffer rows). Validity/top-out is a caller concern.
   - Body: `const x = Math.floor((width - BOUNDING_BOX[type]) / 2);`
     `return { type, rotation: 0, position: { x, y: 0 } };`
   - No board contents read; no collision check (Design D5).

2. **`tryMove(board: Board, piece: Piece, dx: number, dy: number): Piece`**
   - Doc: the single collide-then-commit rule. Returns a **fresh** `Piece` at the shifted
     position if the destination does not collide; otherwise returns the **input `piece`
     reference unchanged** (the no-op contract).
   - Body:
     ```
     const next = { x: piece.position.x + dx, y: piece.position.y + dy };
     if (collides(board, piece.type, next, piece.rotation)) return piece;
     return { ...piece, position: next };
     ```
   - Never mutates `board` or `piece`. Rotation is passed through untouched (this layer never
     rotates). `next` is a fresh `Point`; on success the returned piece has a fresh `position`.

3. **`moveLeft(board, piece): Piece`** → `tryMove(board, piece, -1, 0)`
4. **`moveRight(board, piece): Piece`** → `tryMove(board, piece, +1, 0)`
5. **`softDrop(board, piece): Piece`** → `tryMove(board, piece, 0, +1)`
   - Doc on `softDrop`: a *player-initiated* one-cell descent; does **not** lock/merge (that is
     T-002-02-04). Blocked descent is a no-op.

All named exports. ~55–70 lines incl. comments.

---

## `lib/movement.test.ts`

Vitest, mirroring `collision.test.ts` idioms (`describe`/`it`, table-driven `it.each`, `asSet`
for order-independent cell comparison, `settle` fixture, `emptyBoard`).

### Imports
`spawnPiece, tryMove, moveLeft, moveRight, softDrop` from `./movement`; `pieceCells` from
`./collision` (to assert resulting occupied cells); `emptyBoard` from `./board`; `cellsFor`/
`BOUNDING_BOX` as needed; types from `./types`.

### `describe("spawnPiece")`
- Table-driven `it.each` over all seven types on a width-10 board asserting expected anchor
  `position.x` (I→3, O→4, T/S/Z/J/L→3) and `y===0`, `rotation===0`.
- All spawned cells satisfy `y >= 0` and `0 <= x < width` (no piece spawns out of bounds on a
  standard board) — assert via `pieceCells` + `collides(emptyBoard(10,20), ...) === false`.
- Centering on a narrower board (e.g. width 6): O → `floor((6-2)/2)=2`.

### `describe("tryMove / moveLeft / moveRight / softDrop")`
The **acceptance-criterion test** lives here: spawn a piece, then drive left/right/down and
assert position updates on legal moves and is unchanged on collisions.
- **Legal moves update position**: spawn `T` on empty 10×20; `moveRight` → x+1; `moveLeft` →
  x-1; `softDrop` → y+1. Assert new `position` and that a **new object** is returned
  (`result !== piece`).
- **Blocked = no-op, returns same reference**:
  - Left wall: piece pushed to `x` where a further `moveLeft` would cross `x<0` → returns the
    same reference, position unchanged.
  - Right wall: symmetric with `moveRight`.
  - Floor: piece at the bottom → `softDrop` is a no-op.
  - Settled overlap: `settle` a block directly under/beside the piece so the corresponding move
    collides → no-op.
- **No mutation**: original `piece` and `board` unchanged after a legal move and after a no-op
  (snapshot via `JSON.stringify`, mirroring `collision.test.ts`).
- **`tryMove` composes**: a sequence (spawn → right → right → down) lands at the arithmetic sum.

Table-driven where natural (a `Case` list of `{name, setup, move, expectMoved, expectPos}`),
falling back to explicit `it`s for the mutation/reference-identity assertions.

---

## Ordering of changes (for `plan.md`)

1. `lib/movement.ts` — implement spawn + tryMove + wrappers.
2. `lib/movement.test.ts` — spawn suite, then move/no-op suite (incl. AC test).
3. Run `npm test` + `npm run lint`; commit.

Each step is independently verifiable; the whole is one atomic commit (new files only, no
cross-file coupling to stage separately).
