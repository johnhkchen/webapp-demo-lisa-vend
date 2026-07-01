# Progress — T-002-01-02: tetromino-set-and-rotation-states

Implementation log against `plan.md`.

## Completed

- **Step 1 — `lib/tetrominoes.ts`.** Created. Pure, framework-free shape module:
  - `TETROMINO_TYPES` (canonical 7-id order), `BOUNDING_BOX` (I:4, O:2, others:3),
    `TETROMINO_CELLS` (7 × 4 states of 4 `Point` offsets), `cellsFor(type, rotation)` accessor.
  - Local `p(x, y)` cell constructor keeps the 28-state table readable.
  - Leading module doc: purity, coordinate convention, and the shape-only / sibling-bag boundary.
- **Step 2 — `lib/tetrominoes.test.ts`.** Created. Explicit Vitest imports; helpers `keyOf`,
  `asSet`, `rotateCW`; `KNOWN_SPAWN` reference. 8 `it` blocks: completeness, exactly-4-cells,
  distinctness, in-bounds, full-cycle CW rotation consistency, O-invariance, known-spawn
  spot-checks, `cellsFor` identity. Enumeration tests loop all 7 × 4 = 28 states.
- **Step 3 — Tests.** `npm run test` → **2 files, 12 tests, all pass** (~163ms). New
  `tetrominoes` suite green; `board` suite still green.
- **Step 4 — Lint.** `npm run lint` → exit 0, no output. `lib/**` purity satisfied (no
  React/Next import); `vitest` import allowed; warning-clean under `--max-warnings 0`.
- **Step 5 — Build.** `npm run build` → exit 0. Strict `tsc` accepts the new module + test
  across the whole tree; `/` + `/_not-found` still prerender static.
- **Step 6 — Commit.** See below.

## Deviations from plan

None. The plan executed as written.

## Notes

- The rotation-consistency test checks the **full cycle** (`0→1→2→3→0`), slightly stronger than
  the plan's `k→k+1` for `k=0,1,2`: the wrap `3→0` is included, so the closed loop is verified.
- O's bounding box is 2×2 with cells at the box origin `(0,0)(1,0)(0,1)(1,1)`. This keeps the
  in-bounds invariant clean and is the honest minimal representation of the O shape; O's
  absolute spawn column is a position concern (out of scope). All four O states are identical.
- The coordinate tables were pre-verified self-consistent under CW rotation during Research
  before authoring, so Step 3 passed first run with no data corrections needed.
