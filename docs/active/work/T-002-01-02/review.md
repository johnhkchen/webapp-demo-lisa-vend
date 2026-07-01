# Review — T-002-01-02: tetromino-set-and-rotation-states

Handoff document. What changed, how it was verified, what a reviewer needs to know without
reading every diff. Committed as `5a9fc0e`.

## Outcome

The seven standard tetrominoes (I, O, T, S, Z, J, L) are now encoded as pure shape data with
all four SRS rotation states, in a new framework-free `lib/tetrominoes.ts`. The module exports
the ordered `TETROMINO_TYPES` alphabet, a `BOUNDING_BOX` size per piece, the core
`TETROMINO_CELLS[type][rotation]` table (28 states, each four `Point` offsets), and a
`cellsFor(type, rotation)` accessor. A Vitest suite (`lib/tetrominoes.test.ts`) enumerates all
7 × 4 = 28 states and asserts SRS correctness. This fills the exact gap `lib/types.ts` flagged:
`RotationState` now indexes real cell data, and a `Piece`'s occupied squares can be derived as
`position + cellsFor(type, rotation)`. **Acceptance criterion met.**

## Acceptance criterion — clause by clause

> A test enumerates all 7 pieces × 4 rotation states, asserting each occupies exactly 4 cells
> and matches known SRS spawn/rotation offsets.

| Clause | Where | Status |
|---|---|---|
| enumerates all 7 pieces × 4 rotation states | `tetrominoes.test.ts` loops `TETROMINO_TYPES × [0,1,2,3]` (28) | ✓ |
| each occupies exactly 4 cells | test "every one of the 28 states occupies exactly four cells" | ✓ |
| matches known SRS **spawn** offsets | test "spawn states match the known SRS offsets" (vs `KNOWN_SPAWN`) | ✓ |
| matches known SRS **rotation** offsets | test "each non-O state is the previous rotated 90° CW" (independent oracle, full cycle) | ✓ |

Beyond the letter of the AC, the suite also checks four-cell **distinctness**, **in-bounds**
within each bounding box, **O rotation-invariance**, and that `cellsFor` returns the table
entry — hardening against transcription typos the AC's two literal checks alone might miss.

## What changed

### Added
- **`lib/tetrominoes.ts`** (124 lines) — pure shape data. `p(x,y)` local cell constructor;
  `TETROMINO_TYPES` (canonical order); `BOUNDING_BOX` (I:4, O:2, T/S/Z/J/L:3); `TETROMINO_CELLS`
  (`Readonly<Record<TetrominoType, readonly (readonly Point[])[]>>`, one commented block per
  piece); `cellsFor(type, rotation)`. Types imported via `import type` from `./types`.
- **`lib/tetrominoes.test.ts`** (116 lines) — Vitest, explicit imports. Helpers `keyOf`,
  `asSet`, `rotateCW`, and a `KNOWN_SPAWN` reference table. 8 focused `it` blocks.
- **`docs/active/work/T-002-01-02/{research,design,structure,plan,progress,review}.md`**.

### Not changed (deliberately)
- `lib/types.ts` — no new type needed; `Point`/`TetrominoType`/`RotationState` sufficed.
- `lib/constants.ts`, `lib/board.ts`, `components/`, `app/`, `eslint.config.mjs`,
  `tsconfig.json`, `package.json` — untouched. No new dependency.
- Ticket/story/epic frontmatter and all sibling working-tree files — left for Lisa.

## Verification

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm run test` | **12 passed** (2 files); new `tetrominoes` suite green, `board` still green (~163ms) |
| Zero-warning lint + `lib/` purity | `npm run lint` | exit 0, no output |
| Production build (strict whole-tree tsc, test file present) | `npm run build` | exit 0; `/` + `/_not-found` prerendered static |
| Commit scope | `git show --stat 5a9fc0e` | only the 2 code files + 6 artifacts; no frontmatter, no sibling files |

## Key design decisions (rationale in `design.md`)

1. **Offset lists of `Point`, not a matrix/bitmask.** Reuses the existing coordinate primitive
   and the `board[y][x]` convention, so a resolved piece stamps onto the board with no flip.
2. **All 28 states stored explicitly, not spawn + derive.** Auditable against published SRS
   tables, and no correctness-critical runtime rotation logic. The *test* still derives states
   1–3 by rotation and compares — the safety of derivation as an independent check without
   production depending on it.
3. **Bounding boxes exposed** (I:4, O:2, others:3) — genuine shape metadata (rotation center),
   needed by the test's rotation oracle and by future wall-kick tables.
4. **`TETROMINO_TYPES` framed as the type alphabet as data**, not bag logic — the sibling
   T-002-01-03 (7-bag/RNG) consumes it but owns sequencing.

## Test coverage

- **Covered:** all 28 states — exactly-4 cells, distinct cells, in-bounds; full-cycle
  (`0→1→2→3→0`) CW rotation consistency for the six rotating pieces via an independent oracle;
  O rotation-invariance; state-0 spawn shapes vs a literal known-SRS table; `cellsFor` identity.
- **Not tested (by design):** wall kicks, spawn board-position, colors, the bag — all out of
  scope (other tickets). A board-space `pieceCells(piece)` resolver is intentionally deferred to
  the movement/collision ticket; only the underlying table lands here.
- **No DOM/integration test:** pure node data, no rendering; jsdom would be dead weight.

## Open concerns / notes for the reviewer

1. **O representation is a minimal 2×2 at box origin** `(0,0)(1,0)(0,1)(1,1)`, not the
   `(1,0)(2,0)(1,1)(2,1)` some SRS references show. The two differ only by where O sits in the
   spawn field — a *position* concern that is out of scope. The shape (2×2 square,
   rotation-invariant) and the AC's checks are satisfied either way; the origin form keeps the
   in-bounds invariant clean. If a later spawn-position ticket wants O offset, adjust there.
2. **Rotation convention is CW `(x,y)→(N-1-y,x)`.** Consistent internally and verified around
   the full cycle, so CCW (state `L`/3) is reachable as three CW steps. The movement ticket
   that wires rotation input must use the same handedness (or add kicks) — flagged for that
   ticket, not a defect here.
3. **No runtime immutability freeze.** `TETROMINO_CELLS` is `readonly` at the type level
   (blocks mutation through the typed reference) but not `Object.freeze`d. Sufficient for the
   trusted in-repo callers; add a freeze only if untrusted mutation becomes a risk.
4. **Committed on shared `main`** per the RDSPI concurrency model; only this ticket's code and
   artifacts were staged.

## Critical issues

None. Two new pure-logic files behind the lint-enforced `lib/` boundary, no new dependency, no
config/app/component change, fully reversible (revert `5a9fc0e`). Tree verified green: test
12/12, lint exit 0, build exit 0, `/` static.

## Bottom line

The seven-piece SRS shape set is in place and independently verified: every one of the 28
states is a valid 4-cell tetromino, the rotation chain is proven self-consistent by an oracle
that recomputes rather than restates, and the spawn shapes are anchored to the known SRS
coordinates. Downstream — collision, movement, rotation-with-kicks, `NextPreview`, the 7-bag —
now has a typed, tested shape table plus a `cellsFor` accessor to build on.
