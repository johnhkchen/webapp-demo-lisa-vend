# T-007-04-02 — Progress: next-preview-component

Executed the plan step by step. All steps complete; every gate green.

## Step 1 — Create `NextPreview.tsx` ✅

- `components/NextPreview.tsx` created per structure.md:
  - Header doc comment mirroring `HoldBox` (presentational/props-driven, `data-next` attribute
    discipline, local literal `PIECE_FILL` for Tailwind v4 tree-shaking, E-004 juice out of scope).
  - Module-scope literal `PIECE_FILL: Record<TetrominoType, string>` of `bg-piece-*` tokens.
  - Internal `PreviewTile({ type })`: `box = BOUNDING_BOX[type]`,
    `filled = new Set(cellsFor(type, 0).map(c => c.y*box + c.x))`, fixed `64px` `box×box` grid,
    filled squares `data-next={type}` + `PIECE_FILL[type]`, blanks `bg-white/5`.
  - `NextPreview({ queue })`: glass panel, `aria-label="Next"`, uppercase "Next" label,
    `queue.map((type, i) => <PreviewTile key={i} type={type} />)`.
- Note: this file existed uncommitted from a prior session; reviewed it against structure.md/design.md
  and it matched the blueprint exactly, so it was adopted as-is (no edits needed) and committed.
- Commit: `feat(next): add NextPreview panel rendering the upcoming-piece queue` (`fe1883e`).

## Step 2 — Create `NextPreview.test.tsx` ✅

- `// @vitest-environment jsdom`, `vitest` + `@testing-library/react`, `afterEach(cleanup)`.
- Helpers: `nextSquares()` (all `[data-next]` in DOM order) and `tileOrder()` (distinct ids in DOM
  order = queue order top-down).
- Cases: labelled panel renders; one tile per piece × 4 cells (12 total for a 3-queue) in queue
  order; every tetromino drawn as 4 squares tagged with its id; **shape-reuse** — per-tile filled
  grid indices recovered from DOM order equal `cellsFor(type, 0)` (the HoldBox reuse assertion,
  per-tile, scoped to each `.grid`); top-to-bottom queue order; empty queue → panel present, zero
  squares; never emits `data-cell`.
- Commit: `test(next): cover NextPreview render, shape reuse, and attr discipline` (`cb17120`).

## Step 3 — Wire into `GameContainer.tsx` ✅

- Imported `NextPreview`; destructured `queue` from `useGame()`; rendered `<NextPreview queue={queue} />`
  as the third child of the existing `flex items-start gap-4` row (right of the board wrapper).
- Extended the container's header doc comment with a one-line next-queue note (parallel to Hold).
- Commit: `feat(next): show NextPreview beside the board in GameContainer` (`3ee5dcb`).

## Step 4 — Gates (AC) ✅

- `npm run test` → **228 passed / 23 files**. New `NextPreview` suite green; `GameContainer.test`'s
  `[data-cell]` = `ROWS*COLS` invariant intact (preview added no board squares).
- `npm run lint` (`eslint --max-warnings 0`) → clean.
- `npm run build` (vinext) → **build complete**, all environments transformed, production build green
  (explicit AC).
- No fixup commit needed — Steps 1–3 were clean.

## Deviations

None. The lookahead seam was already complete (T-007-04-01) and the `HoldBox` pattern transferred
directly, exactly as design.md anticipated. The only wrinkle was the pre-existing uncommitted
`NextPreview.tsx`, which already conformed to the blueprint and needed no changes.
