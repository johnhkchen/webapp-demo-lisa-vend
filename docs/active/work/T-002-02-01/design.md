# Design — T-002-02-01: collision-detection

Options, tradeoffs, decision. Grounded in Research: `Board` is row-major `board[y][x]` with
`Cell = TetrominoType | null`; a piece's cells are *derived* as `pos + cellsFor(type, rot)`;
`lib/` is pure and framework-free; the AC wants a table-driven test.

## The core question the module answers

Given a board, a piece shape, and a *candidate* position + rotation, does that placement
overlap a wall, the floor, or a settled cell? A single boolean gate. Everything else (movement,
rotation with kicks, spawn legality, hard-drop distance) is a *caller* that proposes a placement
and consults this gate.

## Decision 1 — the signature (`piece` = `TetrominoType`)

The AC writes `collides(board, piece, pos, rot)`. Three readings:

- **A. `collides(board, type: TetrominoType, pos: Point, rot: RotationState)`** — pass only the
  shape identity; pos/rot are the candidate under test. Cells resolved via `cellsFor(type, rot)`.
- **B. `collides(board, piece: Piece, pos, rot)`** — pass a full `Piece`, but override its own
  `position`/`rotation` with the separate `pos`/`rot` args. The piece's stored pos/rot are
  ignored, which is confusing (why pass them?).
- **C. `collides(board, piece: Piece)`** — no separate pos/rot; test the piece exactly as it
  stands. Clean, but forces callers to mint a whole throwaway `Piece` just to probe a hypothetical
  move — friction for the movement code that is the primary consumer.

**Chosen: A.** Rationale, straight from Research:
- Only `type` determines shape. `pos` and `rot` are supplied *separately and explicitly* because
  the entire purpose is to test a **hypothetical** placement before it is committed to a `Piece`.
  Movement code holds a `Piece`, computes `candidatePos = piece.position + delta` (or
  `candidateRot = (piece.rotation + 1) % 4`), and asks "would this collide?" — without mutating
  anything. Option A expresses exactly that: `collides(board, piece.type, candidatePos, candidateRot)`.
- Option B's redundancy (a `Piece` *and* an overriding pos/rot) is a latent bug magnet: readers
  will wonder which pos/rot wins. Option A has one source of truth per argument.
- Matches the codebase's normalization ethos: `Piece` stores type/rotation/position separately
  and derives cells; collision mirrors that by taking the shape-determining part (`type`) plus
  the two candidate coordinates.
- The AC's word "piece" is satisfied in spirit — `type` *is* the piece's shape identity. We
  document the mapping so a reviewer isn't surprised. (A future overload taking a whole `Piece`
  can wrap A trivially if ergonomics ever demand it; not needed now.)

## Decision 2 — resolve absolute cells via a small helper

Collision needs the piece's **absolute** board cells: `{ x: pos.x + off.x, y: pos.y + off.y }`
for each offset. This same resolution is needed later by the renderer (to draw the active piece)
and by lock/merge (to stamp settled cells). Two options:

- **A. Inline the addition inside `collides`.** Fewer exports; but duplicates the resolve logic
  the moment a second consumer appears.
- **B. Extract `pieceCells(type, pos, rot): Point[]`** returning absolute cells, and have
  `collides` consume it.

**Chosen: B.** It is a one-liner (`cellsFor(...).map(off => ({x: pos.x+off.x, y: pos.y+off.y}))`),
directly testable, and gives the later movement/lock/render tickets a ready seam instead of
re-deriving the offset math. Keeps `collides` itself down to "for each absolute cell, is it out
of bounds or occupied?". Small, named, pure — consistent with `cellsFor`/`emptyBoard` granularity.

## Decision 3 — bounds read from the board, not constants

Two ways to know the playfield extent:

- **A. Import `COLS`/`ROWS`** and test against them.
- **B. Derive `height = board.length`, `width = board[0].length`** from the board argument.

**Chosen: B.** Research flagged it: tests build odd-sized fixtures with `emptyBoard(w, h)`, and
collision that hard-codes 10×20 would give wrong answers on them. Reading dimensions off the
board also keeps `collides` honest about *the board it was handed* and avoids a needless
`constants.ts` import. A board is guaranteed rectangular and non-empty by `emptyBoard`; we treat
an empty board defensively (width 0) but do not over-engineer for malformed input.

## Decision 4 — order and semantics of the two failure modes

A cell fails collision if **either**:
1. **Out of bounds** — `x < 0 || x >= width || y < 0 || y >= height`. Covers left/right walls
   (`x`), the floor (`y >= height`), and above-the-top (`y < 0`).
2. **Overlap** — in-bounds but `board[y][x] !== null` (a settled cell already occupies it).

Order matters: the bounds check must come **first**, because `board[y][x]` on an out-of-range
index would read `undefined`/throw. We short-circuit: any offending cell → return `true`
immediately; if all four cells pass, return `false`.

**On the top boundary (`y < 0`):** classic Tetris spawns pieces partly above the visible field
and tolerates it. Whether spawn allows negative `y` is a *spawn-policy* decision for a later
ticket — *this* predicate answers the literal geometric question, and "above the top counts as
out of bounds" is the correct, conservative primitive. Callers that want a buffer zone can pass
a taller board or offset positions; collision stays a pure geometric gate. We document this so
the spawn ticket makes an informed choice rather than inheriting a hidden assumption.

## Decision 5 — testing approach (table-driven, as the AC demands)

Follow `tetrominoes.test.ts`'s table ethos. A central case table of
`{ name, board, type, pos, rot, expected }` rows exercised in a single `it.each`/loop, covering:

- Legal placement on an empty board → `false`.
- Left wall (`x < 0`), right wall (`x >= width`), floor (`y >= height`) → `true`.
- Above the top (`y < 0`) → `true`.
- Overlap with a settled cell → `true`; adjacent-but-not-overlapping settled cell → `false`.
- A rotation state whose offsets change which side clips (e.g. I horizontal vs vertical near a
  wall) → asserts `rot` actually feeds `cellsFor`.
- Per-type sanity: at least one legal + one out-of-bounds case across several of the 7 pieces.

Plus a focused `pieceCells` test (absolute resolution is correct; input offsets unmutated) so
the helper is pinned independently of the predicate.

## Rejected / deferred

- **Wall-kick retry search** — out of scope; a later SRS ticket sits *above* this gate.
- **Returning *why* it collided** (wall vs overlap enum) — YAGNI; a boolean is the gate the AC
  and callers need. Easy to widen later without breaking callers.
- **Mutating/normalizing rotation input** — `rot` is typed `RotationState` (0..3); no wrap
  needed here. Callers own rotation arithmetic (`% 4`).

## Outcome

Two pure exports in a new `lib/collision.ts`: `pieceCells(type, pos, rot)` (absolute cells) and
`collides(board, type, pos, rot)` (bounds-first, then overlap, short-circuit boolean). Bounds
derived from the board. Table-driven Vitest suite. No changes to existing modules; no new deps.
