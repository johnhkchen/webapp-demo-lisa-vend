# Design — T-002-02-03: SRS rotation with wall kicks

## Decision summary

Add a new pure module **`lib/rotation.ts`** exporting `rotateCW`/`rotateCCW` (and a shared
`rotate(board, piece, dir)`), plus the SRS kick tables. It mirrors `lib/movement.ts`: propose a
candidate placement, gate through `collides`, return a fresh `Piece` on the first passing kick or
the **input reference unchanged** if all kicks fail. Kick offsets are stored **pre-negated for the
engine's y-down frame**. Tested via a table-driven `lib/rotation.test.ts`.

## Options considered

### Where does rotation live?

**Option A — new `lib/rotation.ts` (chosen).** A sibling to `movement.ts`. Rotation carries its
own substantial data (two 8-entry kick tables) and a distinct algorithm (ordered kick search).
Keeping it separate keeps `movement.ts` focused on translation and gives the kick tables a natural
home. Matches the repo's one-concern-per-module granularity (rng, bag, collision, movement each
separate).

**Option B — extend `lib/movement.ts`.** Rotation *is* a kind of gated move, and `tryMove`
already embodies the propose→collide→commit pattern. But the kick tables would bloat the file and
`tryMove`'s single-offset shape doesn't fit an ordered multi-test search. Rejected: cohesion cost.

**Option C — kick tables in `tetrominoes.ts`, logic elsewhere.** `tetrominoes.ts` explicitly
scopes itself to *shape data only* and names wall-kick tables as "separate concerns (later
tickets)." Honor that boundary. Rejected.

→ **A.** New module; it may reuse `cellsFor`/`collides` freely.

### Kick-table representation

**Option A — flat map keyed by `"from>to"` (chosen).** `KICKS_JLSTZ["0>1"] = Point[]`. Eight
explicit entries per table. Directly transcribes the published tables (easy to eyeball against the
source), and lookup is `table[`${from}>${to}`]`. The 180° transitions (`0↔2`, `1↔3`) never occur
because we only rotate ±90° one step at a time, so they are simply absent.

**Option B — 2D array `KICKS[from][to]`.** Slightly faster lookup but half the cells are unused
(same-state and 180°), inviting `undefined` holes and making the table harder to read against the
canonical `0>>1` notation. Rejected: readability.

**Option C — store base "offset data" and subtract per SRS's original derivation.** The published
per-transition tables are literally `offset(from) - offset(to)`. Storing offset data is elegant
and compact but adds a computation layer and a second correctness risk (the subtraction + the
y-flip). The demo values thoroughness-of-transcription over cleverness. Rejected.

→ **A.** Transcribe the resolved tables directly, pre-negated for y-down. A comment records the
published y-up source next to each so a reviewer can verify the flip.

### y-sign handling

**Chosen: bake the negation into the stored constants.** The tables are written once, already in
y-down form, with the published y-up values in a comment for audit. Alternative — store y-up and
negate at lookup time — spreads the convention across data and code and risks a double-negation
bug. A single, documented, static transformation is safer and matches how `tetrominoes.ts` stores
already-resolved (not computed) shape data.

### API shape

**Chosen:**
```ts
type RotationDir = "cw" | "ccw";
function rotate(board: Board, piece: Piece, dir: RotationDir): Piece;
function rotateCW(board: Board, piece: Piece): Piece;   // dir="cw"
function rotateCCW(board: Board, piece: Piece): Piece;  // dir="ccw"
```
`rotateCW`/`rotateCCW` are the ergonomic wrappers (parallel to `moveLeft`/`moveRight`); `rotate`
holds the algorithm. Signature takes the whole `Piece` (unlike `collides`, which takes `type/pos/
rot` separately) because rotation reads and returns a `Piece` — same as `tryMove`.

Rejected alternative: a lower-level `tryRotate(board, piece, toRot)` public API. Not needed by the
AC and would leak the "arbitrary target state" concept the game never uses (rotation is always a
single ±90° step). Kept internal to the ±1/±3 wrappers.

### Rotation direction math

CW: `to = (from + 1) & 3`. CCW: `to = (from + 3) & 3`. Both derive the new `RotationState` purely
arithmetically; a small cast keeps TypeScript's literal `0|1|2|3` type (the value is provably in
range). This aligns with the CW oracle in `tetrominoes.test.ts` (`0→1→2→3` is CW).

### O-piece handling

O's four states are identical cells and SRS gives it only the `(0,0)` test. Two sub-options:
- **(chosen)** Route O through the same algorithm with a single-`(0,0)` kick list. Uniform code
  path; a rotate against a completely surrounded O correctly no-ops (only test is `(0,0)`), and in
  open space it returns a fresh piece with the `rotation` field advanced. Consistent, no special
  case in the hot path.
- Special-case O to always succeed and just bump `rotation`. Marginally simpler but diverges from
  the "everything is gated by collides" invariant and could let an O "rotate" while buried.

→ Uniform path with an O kick table of `[(0,0)]` for every transition.

## Algorithm (final)

```
rotate(board, piece, dir):
  from = piece.rotation
  to   = dir=="cw" ? (from+1)&3 : (from+3)&3
  tests = kickTableFor(piece.type)[`${from}>${to}`]     // ordered Point[] (y-down)
  for t in tests:
    cand = { x: piece.position.x + t.x, y: piece.position.y + t.y }
    if !collides(board, piece.type, cand, to):
      return { ...piece, rotation: to, position: cand }  // fresh piece
  return piece                                            // all kicks failed → no-op
```

`kickTableFor`: O→`KICKS_O`, I→`KICKS_I`, else→`KICKS_JLSTZ`.

## Why this satisfies the AC

- **Blocked rotation resolves to the correct kicked position**: the ordered kick search returns the
  first legal `position`, which for the canonical cases (wall kick, floor kick, T-spin test-5) is
  the guideline-defined result — asserted with exact positions.
- **Fully-blocked rotation is rejected**: surround the piece so all 5 tests collide → returns the
  input reference (no-op contract), asserted by `result === piece`.
- **I-piece and T-spin corner kicks**: separate `KICKS_I` table and a T-spin-double fixture
  exercise the two hardest sub-cases the AC calls out.

## Risks & mitigations

- **y-sign errors** — the dominant risk. Mitigation: pre-negated constants with the y-up source in
  comments, plus tests that assert *exact* kicked positions (not just "moved"), so a sign flip
  fails loudly.
- **Wrong transition mapping (CW vs CCW)** — mitigated by tests that rotate both directions and by
  reusing the same CW convention the shape-table test already validates.
- **Accidental mutation / aliasing** — reuse `collides`/`pieceCells` (which already return fresh
  data) and assert JSON-snapshot non-mutation, per repo norm.
