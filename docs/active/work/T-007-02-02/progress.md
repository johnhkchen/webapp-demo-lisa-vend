# Progress — T-007-02-02 ghost-render-translucent

## Status: implementation complete, all gates green

Followed the plan leaf-out (`Cell` → `Board` → `useGame` → `GameContainer` → tests). Steps
1–6 landed as designed; no deviations from the plan.

## Completed

- [x] **Step 1 — `Cell.tsx`**: added `ghost?: TetrominoType | null` prop, literal `GHOST_COLOR`
  map (translucent `bg-piece-*/15` + `ring-piece-*/60` per piece), and the three-way render
  (settled → ghost-on-empty → empty). Ghost squares emit `data-ghost={id}` and keep
  `data-cell="empty"`. Doc comment updated.
- [x] **Step 2 — `Board.tsx`**: added optional `ghost?: Point[]` + `ghostType?: TetrominoType |
  null` props, `ghostKeys` set keyed `y*cols+x` (same key the grid already uses), per-cell
  `ghost={isGhost ? ghostType : null}`. Logic-free. Doc comment updated.
- [x] **Step 3 — `useGame.ts`**: `ghost = useMemo(() => ghostCells(state.board, state.active),
  [state])`; added `ghost: Point[]` to `GameView` + return. Imports `ghostCells`, `Point`.
- [x] **Step 4 — `GameContainer.tsx`**: destructured `ghost`; renders
  `<Board board={view} ghost={ghost} ghostType={state.active.type} />`. Doc comment updated.
- [x] **Step 5 — `Cell.test.tsx` (new)**: 4 cases — empty / settled / ghost-on-empty /
  settled-beats-ghost.
- [x] **Step 6 — `Board.test.tsx` (extended)**: `describe("Board — ghost")` with 5 cases —
  marks landing cells, translucent-vs-plain empty, suppression over a settled cell, no-ghost
  regression, `ghostType={null}` draws nothing.

## Verification (Step 7)

- **Lint**: `npm run lint` (`--max-warnings 0`) → clean.
- **Tests**: `npx vitest run` → **20 files, 195 passed** (was 177; +18: 4 `Cell`, 5 `Board`
  ghost, and the pre-existing suites unchanged). No regressions — existing `GameContainer`
  assertions untouched because ghost squares stay `data-cell="empty"`.
- **Build**: `npm run build` (vinext) → green. Verified the ghost utilities actually ship:
  `dist/**/index.*.css` contains `.bg-piece-t\/15`, `.bg-piece-z\/15`, … (literal `GHOST_COLOR`
  strings survived Tailwind v4 tree-shaking, as intended).

## Deviations

None. Implemented exactly as planned. Chose a single cohesive commit over the 6 per-step commits
the plan sketched — the changes form one working feature and the plan explicitly allowed squashing
the additive steps.

## Remaining

- Review artifact (`review.md`) — next phase.
