# Design — T-002-02-04: gravity-and-lock-on-landing

Decide the shape of one gravity step + lock-on-landing, grounded in the Research. Chosen approach
first, then rejected alternatives with rationale.

## Problem restated

Provide a pure step that, given a board and the active piece, either (a) moves the piece down one
row, or (b) — when the row below is blocked — *locks* the piece: returns a new board with the
piece's four cells merged in, and signals that there is no longer an active piece. Must obey the
`lib/` conventions: no mutation, fresh state, derived cells, dimensions from the board.

## Decisions

### D1 — New module `lib/gravity.ts`

Gravity/lock is its own concern, parallel to `collision.ts` and `movement.ts`. It sits *above*
movement (it reuses `softDrop`) and introduces the first **board-writing** operation in the
engine. A dedicated module keeps `movement.ts` focused on translation policy (its header already
disclaims locking and points here) and gives lock/merge a co-located test suite. **Chosen** over
appending to `movement.ts` (D6).

### D2 — Two exports: `lockPiece` (merge) and `applyGravity` (step)

Split the *mechanism* (merge cells into a board) from the *policy* (decide fall-vs-lock):

- `lockPiece(board, piece): Board` — pure merge. Returns a fresh board with the piece's four
  resolved cells set to `piece.type`. Independently useful: hard-drop (later) and any "commit this
  piece" path will reuse it, exactly as `collision.pieceCells` was left reusable "for lock/merge in
  later tickets."
- `applyGravity(board, piece): GravityResult` — the one-step policy. Uses the down-step primitive;
  on a successful drop returns the fallen piece; on a blocked drop calls `lockPiece` and reports
  the lock.

This mirrors the collision/movement split (predicate vs. policy) the codebase already uses.

### D3 — Reuse `softDrop` as the down-step; detect landing via the no-op reference

`softDrop(board, piece)` already answers "can this piece fall one row?" and signals "no" by
returning the **same reference** (documented no-op contract, and movement's header explicitly
anticipates gravity using `softDrop(...) === piece` to detect landing). So:

```
const dropped = softDrop(board, piece);
if (dropped !== piece) return { locked: false, ... piece: dropped };
return { locked: true, board: lockPiece(board, piece), piece: null };
```

**Chosen** over calling `collides(board, type, {x, y+1}, rot)` directly (D7). Reusing `softDrop`
means one definition of "the cell below is blocked," including the floor and settled cells, and
keeps this module a thin layer — no duplicated bounds/overlap logic.

### D4 — Result as a discriminated union `GravityResult`

```ts
export interface Fell   { locked: false; board: Board; piece: Piece; }
export interface Locked { locked: true;  board: Board; piece: null;  }
export type GravityResult = Fell | Locked;
```

- `Fell`: `board` is the **same reference** (unchanged — no merge happened), `piece` is the fallen
  piece (fresh object from `softDrop`).
- `Locked`: `board` is a **fresh** merged board, `piece` is `null` — the literal "active piece
  cleared for respawn."

The `locked` boolean is the discriminant; TypeScript narrows `piece` to `Piece` vs `null`
accordingly, so a caller writes `if (result.locked) { spawnNext() } else { piece = result.piece }`
with no non-null assertions. **Chosen** over the alternatives in D5.

Returning both `board` and `piece` every call (rather than only the changed field) gives callers a
uniform "next state" they can destructure without tracking which field moved — this is the seed of
the forthcoming game-state reducer.

### D5 — Why `piece: null` for "cleared", not a sentinel or a separate flag

`Cell` is already `TetrominoType | null`, so `null` is the codebase's established "absence" value;
using `piece: null` for "no active piece" is consistent and needs no new type. Rejected: a
`{ landed: boolean }` flag *beside* a still-present piece (ambiguous — is it active or not?), and
an `Optional`/sentinel wrapper (over-engineered for one bit).

### D6 — Rejected: fold gravity into `movement.ts`

`movement.ts` is deliberately scoped to translation and *explicitly* disclaims locking, naming
this ticket as the owner. Adding board-writing there would break that boundary and mix the first
mutation-producing (fresh-board) op into the pure-translation module. A sibling module is the
established pattern (collision → movement → gravity). **Rejected.**

### D7 — Rejected: detect landing with a direct `collides` call

`applyGravity` could compute `collides(board, piece.type, {x, y:+1}, rot)` itself. This duplicates
the "step down and test" logic `softDrop` already encapsulates and re-introduces a second place
that must agree on the coordinate convention. Reusing `softDrop` is DRY and matches how movement
composes over collision. **Rejected** (though `lockPiece` still uses `pieceCells` directly, since
merging genuinely needs the resolved cells, not a boolean).

### D8 — Rejected: mutate the board in place on lock

Every `lib/` op is immutable and tests assert it via `JSON.stringify` snapshots; `emptyBoard`
guarantees independent rows precisely to make copy-on-write safe. `lockPiece` deep-copies rows
(`board.map(row => row.slice())`) and writes into the copy. A single locked piece touches 4 cells;
copying a 10×20 board per lock is negligible and buys referential-transparency the whole engine
relies on. **Rejected** in-place mutation.

### D9 — Lock does *not* clear lines, respawn, or apply lock-delay

Scope discipline from Research: line-clear is a separate ticket (not in S-002-02); respawn/bag is
never touched by these pure modules; lock-delay is timing/feel, not pure logic. `applyGravity`
locks immediately on a blocked step and reports `piece: null`; a higher layer decides what to spawn
next and whether to clear lines. Documented as an explicit scope boundary in the module header.

## Consequences

- One new file `lib/gravity.ts` + `lib/gravity.test.ts`; no edits to existing modules (movement
  already anticipated this). No new dependencies.
- The first fresh-board-producing op in the engine, with the copy-on-write pattern established for
  future writers (line-clear, hard-drop).
- Landing semantics are defined *once* (via `softDrop`), so floor-landing and stack-landing are
  automatically consistent.
- Clean handoff to a game-state reducer: `applyGravity` returns a uniform next-state pair with a
  boolean the reducer switches on.
