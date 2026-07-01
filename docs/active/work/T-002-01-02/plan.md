# Plan — T-002-01-02: tetromino-set-and-rotation-states

Ordered, independently-verifiable steps to execute `structure.md`. Testing strategy and
verification criteria included. One atomic commit at the end.

## Testing strategy

- **Unit only.** Pure data + a pure accessor → Vitest, node environment, no jsdom. Mirrors
  `lib/board.test.ts` (explicit imports, colocated).
- The suite is **self-checking against SRS** via independent recomputation (`rotateCW`), not a
  restatement of the table — so it catches transcription errors, not just structural ones.
  This is the AC's teeth: "matches known SRS spawn/rotation offsets."
- **Green gates:** `npm run test` (all suites), `npm run lint` (`--max-warnings 0` + `lib/**`
  purity), `npm run build` (strict whole-tree `tsc` incl. the test file).

## Steps

### Step 1 — Author `lib/tetrominoes.ts`

- Module doc comment (purity, coordinate convention, sibling boundary).
- `import type { Point, TetrominoType, RotationState } from "./types";`
- `TETROMINO_TYPES = ["I","O","T","S","Z","J","L"] as const`.
- `BOUNDING_BOX` = `{ I:4, O:2, T:3, S:3, Z:3, J:3, L:3 }`.
- `TETROMINO_CELLS` — all 7 pieces, 4 states each, literal `{x,y}` offsets from `structure.md`,
  one commented block per piece, states on separate lines. `as const`-style immutability.
- `cellsFor(type, rotation)` → `TETROMINO_CELLS[type][rotation]`.
- **Verify:** file compiles (checked transitively at Step 3/5); table is total over all 7 types
  and 4 states by construction (the `Record<TetrominoType, ...>` type enforces completeness).

### Step 2 — Author `lib/tetrominoes.test.ts`

- Explicit `vitest` imports + import the four exports.
- Helpers: `keyOf`, `asSet`, `rotateCW(cells, n)`.
- `it` blocks 1–8 per `structure.md` (completeness, 4-cells, distinct, in-bounds, rotation
  consistency, O-invariance, known spawn spot-checks, accessor identity).
- The enumeration tests loop `TETROMINO_TYPES × [0,1,2,3]` with type/rotation in the failure
  message.
- **Verify:** Step 3.

### Step 3 — Run the test suite

- `npm run test`.
- **Pass criteria:** the new `tetrominoes` suite is green and `board` stays green; total files
  = 2, all assertions pass. If rotation-consistency fails, a coordinate was mistranscribed →
  fix the data in Step 1 (the *data* is suspect, the recomputed oracle is trusted), rerun.

### Step 4 — Lint

- `npm run lint`.
- **Pass criteria:** exit 0, no output. Confirms no React/Next import crept in and the file is
  warning-clean under `--max-warnings 0`. `vitest` import in the test is allowed by the
  `lib/**` rule.

### Step 5 — Production build

- `npm run build`.
- **Pass criteria:** exit 0. Confirms strict `tsc` accepts the new module + test across the
  whole tree, and the test file (present but unbundled) doesn't break the app build. Existing
  `/` + `/_not-found` still prerender.

### Step 6 — Commit

- Stage **only**: `lib/tetrominoes.ts`, `lib/tetrominoes.test.ts`, and
  `docs/active/work/T-002-01-02/*.md`.
- **Do not** stage ticket/story/epic frontmatter or any sibling working-tree file (RDSPI
  concurrency: Lisa owns phase/status transitions; other tickets own their files).
- Message: `feat(T-002-01-02): encode 7 tetrominoes × 4 SRS rotation states with vitest`.
- **Verify:** `git show --stat` shows exactly the 2 code files + 6 artifacts, nothing else.

## Verification matrix (what "done" means)

| Check | Command | Expected |
|---|---|---|
| Unit tests | `npm run test` | new `tetrominoes` suite green; `board` still green |
| 28 states walked | (within suite) | 7×4 iterated, each 4 distinct in-bounds cells |
| SRS correctness | (within suite) | rotation-consistency + known-spawn checks pass |
| Lint + purity | `npm run lint` | exit 0, no output |
| Build | `npm run build` | exit 0, `/` static |
| Commit scope | `git show --stat` | only 2 code files + 6 artifacts |

## Risks & mitigations

- **Coordinate transcription error.** Mitigated by the independent `rotateCW` oracle (test 5)
  anchored to literal known spawn shapes (test 7): a wrong cell fails one or both. During
  research the chosen coordinates were pre-verified self-consistent, lowering this risk.
- **O mishandled by the rotation check.** Mitigated by treating O separately (test 6:
  invariance) and excluding it from the rotate-consistency loop.
- **Accidental scope creep** (colors, kicks, bag, spawn position). Mitigated by the explicit
  out-of-scope guard in Design/Structure; the module exposes only shapes + box + accessor.
- **Sibling-ticket overlap** on `TETROMINO_TYPES`. Mitigated by framing it as the type
  alphabet as data (comment) — T-002-01-03 consumes it for bag sequencing, doesn't redefine it.

## Deviations

None anticipated. Any change from this plan gets recorded in `progress.md` with rationale
before proceeding.
