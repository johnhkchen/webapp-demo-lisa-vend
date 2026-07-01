# Design — T-002-02-02: spawn-and-horizontal-soft-move

Options and tradeoffs, grounded in `research.md`. One decision per question, with rejects.

## Problem restated

Produce two capabilities as pure functions in `lib/`:
1. **Spawn** — turn a `TetrominoType` (from the 7-bag) into an active `Piece` positioned at the
   top of the field, horizontally centered, rotation 0.
2. **Move** — translate a `Piece` left / right / down by one cell, committing only if the
   destination does not `collide`; otherwise a no-op.

Everything stays framework-free, stateless, named-export, house-doc-comment style.

---

## Decision 1 — Where movement lives

**Options**
- (A) New `lib/movement.ts` holding spawn + moves.
- (B) Extend `lib/collision.ts` with movement helpers.
- (C) Separate `lib/spawn.ts` and `lib/movement.ts`.

**Decision: (A)** a single `lib/movement.ts`.

**Why.** Collision is a pure *predicate*; movement is the *policy* that consults it — keeping
them in separate files preserves collision's single responsibility (matches the header's framing
of `collides` as "the gate every move consults"), so (B) is out. Spawn and single-step moves are
tiny and tightly related (both construct/derive a `Piece` at a position), so one module reads
better than two nearly-empty files; (C) is premature. Siblings 02-03 (rotation) and 02-04
(gravity/lock) will get their *own* modules (`rotation.ts`, `gravity.ts`) — movement.ts stays
scoped to translation + spawn.

---

## Decision 2 — Spawn horizontal position

**Options**
- (A) Per-type spawn-column lookup table.
- (B) Generic centering from `BOUNDING_BOX`: `x = floor((width - BOUNDING_BOX[type]) / 2)`.
- (C) Center from the piece's *actual* occupied columns at rotation 0 (min/max of cells).

**Decision: (B)** — `spawnX = Math.floor((width - BOUNDING_BOX[type]) / 2)`, `y = 0`.

**Why.** It reproduces the canonical SRS spawn columns exactly, with no extra data table:
- I: `(10-4)/2 = 3` → columns 3,4,5,6 ✓
- O: `(10-2)/2 = 4` → columns 4,5 ✓
- T/S/Z/J/L: `floor((10-3)/2) = 3` → columns 3,4,5 ✓

It reuses `BOUNDING_BOX` (already exported for exactly this kind of box math) and reads `width`
from an argument, honoring the "dimensions from data, not constants" convention — so a narrow
test board centers correctly too. (A) duplicates knowledge already encoded in `BOUNDING_BOX` and
drifts if a shape table changes. (C) is more complex and, because offset tables leave empty
columns in some boxes, would *not* match standard SRS columns (e.g. it would shift pieces off
their conventional spawn). Anchor `y = 0` keeps every piece's cells at `y >= 0` (constraint 1 in
research) — no buffer-row policy needed here.

**Edge:** on boards narrower than a piece's box, `spawnX` can go negative/oversized; that is a
degenerate fixture and the resulting piece would simply `collide`. We do not special-case it —
spawn's job is placement, not validity (see Decision 5).

---

## Decision 3 — Move API shape

**Options**
- (A) One generic `tryMove(board, piece, dx, dy)` + thin `moveLeft/moveRight/softDrop` wrappers.
- (B) Three independent functions, each duplicating the collide-then-commit logic.
- (C) A direction enum `move(board, piece, dir)`.

**Decision: (A).** `tryMove` centralizes the collide-then-commit rule once; the three named
wrappers give callers (and the AC test) an ergonomic, self-documenting surface:
`moveLeft = tryMove(_, _, -1, 0)`, `moveRight = (+1, 0)`, `softDrop = (0, +1)`.

**Why.** (B) triplicates the one subtle line (bounds/overlap gating) — the exact kind of drift a
single helper prevents. (C) adds an enum type for no real gain over three named functions and
reads worse at call sites. Exporting `tryMove` too is useful: gravity (02-04) and any future
"move by N" can reuse it. Wrappers are one-liners, so the surface stays small.

---

## Decision 4 — No-op / return semantics

**Options**
- (A) Return the **same `Piece` reference** unchanged on a blocked move; a **new** `Piece` on a
  legal move.
- (B) Return `{ piece, moved: boolean }`.
- (C) Return `Piece | null` (null = blocked).

**Decision: (A).**

**Why.** The AC phrases the no-op as position "unchanged" — returning the input reference is the
most literal, cheapest expression of that, and lets a caller detect movement with `next !==
prev` when it cares (gravity's landing check will want exactly this). It keeps the signature
uniform `(board, piece) => Piece` with no wrapper object or nullable to unpack, matching the
codebase's preference for plain returns. (B) forces every call site to destructure even when it
ignores `moved`. (C) makes chaining awkward (`softDrop(board, moveLeft(...) ?? ...)`) and
conflates "blocked" with "absent." On a legal move we return a **fresh** `Piece` with a fresh
`position` (never mutate the input) — consistent with `pieceCells`/`emptyBoard` non-aliasing.

---

## Decision 5 — Does spawn validate (top-out)?

**Options**
- (A) Spawn always constructs and returns the piece; validity is a caller concern.
- (B) Spawn checks `collides` and signals game-over.

**Decision: (A).** Research constraint 5 and the collision header both defer spawn-policy /
top-out to a later ticket. Spawn is pure placement: `type → Piece`. This keeps the function
total (no board argument needed for spawn) and the ticket scoped. A caller in a future
game-state epic can `collides(board, piece...)` right after spawning to decide top-out.

**Consequence for the signature:** `spawnPiece` needs only the board *width* to center — not the
whole board. We pass `width: number`. This is the one place we deviate from "pass the board":
spawn genuinely needs a single scalar, and taking the board would imply it inspects contents
(which, by this decision, it must not).

---

## Resulting public surface (specified fully in `structure.md`)

```ts
spawnPiece(type: TetrominoType, width: number): Piece      // rotation 0, centered, y=0
tryMove(board: Board, piece: Piece, dx: number, dy: number): Piece
moveLeft(board: Board, piece: Piece): Piece                // tryMove(_, _, -1,  0)
moveRight(board: Board, piece: Piece): Piece               // tryMove(_, _, +1,  0)
softDrop(board: Board, piece: Piece): Piece                // tryMove(_, _,  0, +1)
```

Pure, framework-free, named exports, no new dependencies. Consumes `collides`/`BOUNDING_BOX`;
produces/transforms `Piece`. No bag coupling, no rotation, no lock.
