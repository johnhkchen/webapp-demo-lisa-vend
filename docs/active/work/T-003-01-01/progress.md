# T-003-01-01 — Progress

## Status: Implement complete — all plan steps done, verified.

### Step 1 — Props-driven Cell + Board, keep app compiling ✅
Commit: `feat(T-003-01-01): make Board/Cell props-driven, painting a board matrix to the grid`
- `components/Cell.tsx`: `CellProps { cell }`, static literal `CELL_COLOR` map, empty-vs-filled
  className, `data-cell` attr, updated docstring.
- `components/Board.tsx`: `BoardProps { board }`, matrix-derived `rows`/`cols`, same neon/glass grid
  chrome, `flatMap` of `<Cell cell=… />`, updated docstring, `aria-label="Tetris board"`.
- `app/page.tsx`: passes `board={emptyBoard(COLS, ROWS)}` stopgap.
- Verified: `tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds. Confirmed all 7
  `bg-piece-*` utilities emit in the built CSS (the Tailwind-literal-class risk) via
  `grep bg-piece- .next/**/*.css`.

### Step 2 — Component test tooling ✅
Commit: `chore(T-003-01-01): add @testing-library/react + jsdom for component tests`
- `npm install -D @testing-library/react jsdom` — `@testing-library/dom` came in transitively.
- Network was available; the Plan's offline fallback was not needed.

### Step 3 — Rendered-DOM test ✅
Commit: `test(T-003-01-01): render Board from a fixture matrix, assert filled vs empty grid`
- `components/Board.test.tsx` (jsdom docblock): 3 tests — empty count, filled-distinct, dims-track.
- All 13 test files / 122 tests pass (119 lib + 3 new). Lib suite still node env.

## Deviation from plan (documented)
- **Added `vitest.config.ts`** (not in the original Structure/Plan file list). The `@/*` path alias
  is defined in `tsconfig.json` but vitest had no config, so it could not resolve `@/components/…`
  in the test (existing lib tests use relative imports and never hit this). The config is minimal —
  only the `@` alias — and deliberately does **not** set a global environment, so the per-file jsdom
  docblock still governs and the lib suite stays in node. Rationale: alias resolution is the correct
  fix; rewriting component imports to relative paths would diverge from the `@/` convention used
  everywhere else in `app/`/`components/`.

## Remaining: none for this ticket. Review artifact next.
