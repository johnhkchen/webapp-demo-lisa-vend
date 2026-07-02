# T-007-04-02 — Plan: next-preview-component

Ordered, independently-verifiable steps. Each ends in a green checkpoint and an atomic commit.

## Step 1 — Create `NextPreview.tsx`

- Add `components/NextPreview.tsx` per structure.md:
  - Header doc comment (mirror HoldBox's: presentational, props-driven, reuses shape data,
    `data-next` attribute discipline, local literal `PIECE_FILL` for Tailwind tree-shaking).
  - Local literal `PIECE_FILL: Record<TetrominoType, string>`.
  - Internal `PreviewTile({ type })`: `box = BOUNDING_BOX[type]`,
    `filled = new Set(cellsFor(type,0).map(c => c.y*box + c.x))`, fixed-size `box×box` grid,
    filled squares `data-next={type}` + `PIECE_FILL[type]`, blanks `bg-white/5`.
  - `NextPreview({ queue })`: glass panel, `aria-label="Next"`, uppercase "Next" label,
    `queue.map((type, i) => <PreviewTile key={i} type={type} />)`.
- **Verify:** `npm run lint` clean; `npm run test` still green (no test targets it yet, but the
  new module must compile / typecheck via vitest).
- **Commit:** `feat(next): add NextPreview panel rendering the upcoming-piece queue`

## Step 2 — Create `NextPreview.test.tsx`

`// @vitest-environment jsdom`, `vitest` + `@testing-library/react`, `afterEach(cleanup)`.
Helper: `nextSquares(container) = querySelectorAll('[data-next]')`.

Cases (adapted from `HoldBox.test.tsx`):
1. **Labelled panel renders** — `[aria-label="Next"]` present for a non-empty queue.
2. **One tile per queued piece, each = 4 cells** — for `queue = ["I","O","T"]`, exactly 3 tiles
   (group `[data-next]` by value/DOM order) and 12 filled squares total; each tile's squares all
   carry the same `data-next` id in queue order.
3. **Reuses shape data (not hard-coded)** — for a queue of one piece per type, recover each
   tile's filled grid indices from DOM order among its `.grid > div` and assert they equal
   `cellsFor(type, 0)` mapped to `x,y` (the HoldBox reuse assertion, per-tile).
4. **Draws every tetromino** — iterate `TETROMINO_TYPES` as a single queue; each id appears with
   4 squares tagged with its id.
5. **Renders queue order top-to-bottom** — for `["Z","S","I"]`, the sequence of distinct
   `data-next` ids in DOM order is `["Z","S","I"]`.
6. **Empty queue → panel present, no squares** — `queue={[]}` renders `[aria-label="Next"]`
   with zero `[data-next]` squares (defensive, no crash).
7. **Never tags a square `data-cell`** — reserved for board squares (the load-bearing invariant).
- **Verify:** `npm run test` green (new suite passes; existing suites unaffected).
- **Commit:** `test(next): cover NextPreview render, shape reuse, and attr discipline`

## Step 3 — Wire into `GameContainer.tsx`

- Import `NextPreview`.
- Destructure `queue` from `useGame()`.
- Render `<NextPreview queue={queue} />` as the third child of the flex row (right of board).
- Add a one-line note to the container's header doc comment (parallel to the Hold note).
- **Verify:**
  - `npm run test` green — critically, `GameContainer.test`'s `cells()` count stays `ROWS*COLS`
    (proves the preview added no `data-cell` squares) and all hold/board/game-over cases pass.
  - `npm run lint` clean.
- **Commit:** `feat(next): show NextPreview beside the board in GameContainer`

## Step 4 — Build gate (AC) + full verification

- `npm run build` — production build must stay green (explicit AC).
- `npm run test` — full suite green.
- `npm run lint` — `--max-warnings 0` clean.
- Optionally spot-check the rendered app (`npm run dev`) that the next column shows pieces and
  advances as they spawn — but the component test + build are the AC gates.
- **Commit:** none needed if Steps 1–3 are clean; otherwise a fixup commit.

## Testing strategy

- **Unit/component (primary):** `NextPreview.test.tsx` — render, count, shape-reuse, order,
  empty, and attribute discipline. Pure jsdom, no hook — the leaf is deterministic in `type`.
- **Integration (existing, must stay green):** `GameContainer.test.tsx` — its `ROWS*COLS`
  `data-cell` invariant is the guardrail that the preview doesn't pollute the board grid. No new
  container test is strictly required by the AC, but the existing count assertions already
  exercise the wired preview's non-interference.
- **Build:** `npm run build` is an AC gate, run explicitly in Step 4.

## Rollback

Each step is an isolated commit. The leaf (Steps 1–2) has no dependents until Step 3 wires it, so
reverting the wiring commit fully removes the feature with the component left dormant and green.

## Deviations

Record any in `progress.md` as they arise. None anticipated — the seam is complete and the
pattern is established by HoldBox.
