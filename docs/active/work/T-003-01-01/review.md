# T-003-01-01 — Review

Handoff for `board-cell-grid-from-state`: replace the placeholder Board with a props-driven
Board/Cell pair that paints a board matrix, filled cells visually distinct from empty. No game
logic in the components.

## What changed

**Modified**
- `components/Cell.tsx` — was propless placeholder; now `Cell({ cell }: { cell: CellValue })`.
  Branches on `cell === null`: empty → translucent well (`bg-white/5 ring-…`), filled → opaque
  per-piece neon fill via a static literal `CELL_COLOR` map (`bg-piece-i…l`). Renders
  `data-cell={cell ?? "empty"}`. Imports the `Cell` value type aliased as `CellValue` (name clash
  with the component).
- `components/Board.tsx` — was propless placeholder; now `Board({ board }: { board: BoardMatrix })`.
  Flattens the row-major matrix (`board.flatMap(...map...)`) into one `<Cell>` per square. Grid
  `rows`/`cols` derive from the matrix (`board.length` / `board[0]?.length`), falling back to
  `ROWS`/`COLS` only for an empty matrix. Keeps the neon/glass container chrome; `aria-label`
  changed from "Tetris board (placeholder)" → "Tetris board".
- `app/page.tsx` — passes `board={emptyBoard(COLS, ROWS)}` (stopgap so the app compiles; the live
  hook state arrives in T-003-01-02). Header copy unchanged.
- `package.json` / `package-lock.json` — added devDeps `@testing-library/react`, `jsdom`
  (+ transitive `@testing-library/dom`).

**Added**
- `components/Board.test.tsx` — rendered-DOM tests (jsdom via `// @vitest-environment jsdom`).
- `vitest.config.ts` — minimal; resolves the `@/*` alias only (no global environment). See Deviation.

## Acceptance criteria

> Rendering Board with a fixture board matrix shows an ROWS×COLS grid where filled cells are
> visually distinct from empty ones; no game logic lives in the component.

**Met.** `Board.test.tsx` renders `emptyBoard(COLS, ROWS)` → exactly `ROWS*COLS` cells, all empty;
a fixture with `I`/`T` cells → those cells carry `bg-piece-i`/`bg-piece-t` and empty cells carry no
`bg-piece-` class (visually distinct: opaque neon vs. translucent well). Components hold no game
logic — they branch only on `cell === null` and index a static color map.

## Test coverage

- **New:** 3 tests in `components/Board.test.tsx` — (1) empty-board cell count + all-empty; (2)
  filled cells distinct (piece fill present on filled, absent on empty), with exact counts; (3) grid
  dimensions derive from the matrix (3×2 fixture → 6 cells, `repeat(3…)`/`repeat(2…)`).
- **Suite:** 13 files / 122 tests pass (119 pre-existing lib + 3 new). Lib suite still runs in node.
- **Gates:** `npm run build` succeeds; `npm run lint` clean (`--max-warnings 0`); `tsc --noEmit`
  clean. Verified all 7 `bg-piece-*` utilities are present in the built CSS — the primary Tailwind-v4
  literal-class risk is closed, not just assumed.

**Gaps / not covered (by design):**
- No visual/snapshot assertion of the actual rendered colors (jsdom does not compute styles); the
  test asserts the class contract, and the build-CSS grep confirms those classes resolve to the
  neon tokens. Adequate for this ticket; true pixel verification belongs to the visual epic (E-004).
- No hook/state/loop tests — there is no state here; that is T-003-01-02.

## Open concerns / notes for the reviewer & next ticket

1. **`app/page.tsx` stopgap.** It renders an all-empty board via `emptyBoard`. T-003-01-02 must
   replace this with the live `GameState.board` from the state hook and add the **active-piece
   overlay** (out of scope here — this ticket paints settled cells only, matching `game.ts`'s
   "renderer overlays the active piece"). The single-prop change was chosen to minimize what the
   next ticket has to undo.
2. **`vitest.config.ts` is new infra** (planned deviation, see `progress.md`). It only maps the `@`
   alias and intentionally leaves the environment as node so lib tests stay fast; component tests
   opt into jsdom per-file. If a future ticket wants jsdom for more component tests, keep using the
   docblock rather than flipping a global environment.
3. **Tailwind literal-class dependency.** The `CELL_COLOR` map must stay literal strings. Any refactor
   to computed class names (`` `bg-piece-${t}` ``) would silently drop the utilities from the build.
   This constraint is documented in the `Cell.tsx` docstring.
4. **`data-cell` attribute** ships in production markup. It is a low-cost test/debug seam (and encodes
   piece identity); harmless, but noted in case a reviewer prefers it stripped.
5. **`aria-label` change** ("… (placeholder)" → "Tetris board") — if any other test/tooling matched
   the old label, it would need updating; a repo grep shows no other consumer.

## Risk assessment: **Low.** Presentational change behind a clean props contract; fully covered by
build + lint + type + render tests, with the one framework-specific risk (Tailwind class emission)
explicitly verified against the built output.
