# T-003-01-01 — Plan

Ordered, independently-verifiable steps. Each step is an atomic commit.

## Step 1 — Props-driven `Cell` + `Board`, keep app compiling

**Do:**
- Rewrite `components/Cell.tsx` per Structure: `CellProps { cell }`, `CELL_COLOR` literal map,
  empty vs. filled className, `data-cell` attr, updated docstring.
- Rewrite `components/Board.tsx` per Structure: `BoardProps { board }`, matrix-derived rows/cols,
  same grid chrome, `flatMap` of `<Cell cell=… />`, updated docstring.
- Update `app/page.tsx` to pass `board={emptyBoard(COLS, ROWS)}`.

**Verify:**
- `npx tsc --noEmit` (or `npm run build`) type-checks — Board/Cell/page all agree on props.
- `npm run lint` clean (no `lib/**` boundary violation; no unused imports).
- `npm run build` succeeds (Tailwind emits `bg-piece-*`; no runtime error from empty board).

**Commit:** `feat(T-003-01-01): make Board/Cell props-driven, painting a board matrix to the grid`

## Step 2 — Component test tooling

**Do:**
- Add devDeps `@testing-library/react` and `jsdom` (+ `@testing-library/dom` if not transitive):
  `npm install -D @testing-library/react jsdom`.

**Verify:**
- `node_modules/@testing-library/react` and `node_modules/jsdom` exist.
- `npm test` still green (existing lib suite unaffected — still node env).

**Commit:** `chore(T-003-01-01): add @testing-library/react + jsdom for component tests`

**Fallback (if install has no network):** skip this step and Step 3's execution; still author
`Board.test.tsx` so it runs once deps are available, and record the unverified-locally gap in
`review.md`. Do **not** block the source change (Step 1) on tooling.

## Step 3 — Rendered-DOM test for the AC

**Do:**
- Add `components/Board.test.tsx` per Structure with the `// @vitest-environment jsdom` docblock and
  the three tests (empty count, filled-distinct, dimensions-track-matrix).

**Verify:**
- `npm test` runs the new file under jsdom and passes; lib suite still passes in node.
- Deliberately confirm test #2 actually asserts the color class (would fail if fill were not
  distinct) — sanity that it tests the AC, not a tautology.

**Commit:** `test(T-003-01-01): render Board from a fixture matrix, assert filled vs empty grid`

## Testing strategy

- **Unit / render (this ticket):** `components/Board.test.tsx` under jsdom is the sole new test.
  It exercises the real component tree (Board → Cell) against fixture matrices from `emptyBoard`,
  directly verifying the AC: an ROWS×COLS grid, filled cells visually distinct (carry `bg-piece-*`),
  empty cells not. No game logic to unit-test — the components contain none by design.
- **No integration test** here: there is no state/hook/loop yet (that is T-003-01-02). Wiring the
  live board+active-piece view is verified in that ticket.
- **Type + lint + build** are first-class verification gates (Step 1) since the change is chiefly a
  props-contract change and a Tailwind-literal-class dependency — the build catches a mistyped
  color class (utility not emitted) and the boundary lint catches accidental `lib/` contamination.

## Verification criteria (definition of done)

- [ ] `Board` renders an ROWS×COLS grid from a passed matrix; grid dims come from the matrix (D2).
- [ ] Filled cells (`cell !== null`) render an opaque per-piece neon fill (`bg-piece-*`); empty
      cells render the translucent well — visually distinct (AC).
- [ ] No game logic in `Board`/`Cell` (AC): they only branch on `cell === null` and index a static
      color map.
- [ ] `npm run build` and `npm run lint` pass; `npm test` passes (lib node suite + new jsdom test).
- [ ] `app/page.tsx` still renders (empty-board stopgap; hook is T-003-01-02).

## Risks / watch-items

- **Tailwind literal-class**: the #1 failure mode. Guard by using the literal `CELL_COLOR` map and
  confirming a filled cell actually paints in the built output (build + visual/test class check).
- **`Cell` name clash**: type-only alias `Cell as CellValue` in component files; the React `Cell`
  keeps its name.
- **jsdom env scoping**: rely on the per-file docblock; do NOT add a global vitest config that would
  drag lib tests into jsdom.
- **Dep install availability**: covered by the Step 2 fallback.
