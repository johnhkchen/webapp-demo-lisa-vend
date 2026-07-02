# T-007-04-02 — Review: next-preview-component

## Summary

Added a `NextPreview` HUD panel that renders the upcoming-piece queue beside the board and advances
on its own as pieces spawn. Purely presentational + one wiring edit — no game logic touched. The
lookahead seam (`useGame`'s `queue`, sized by `PREVIEW_COUNT`) was already delivered by the
dependency ticket T-007-04-01, so this ticket only consumed it.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `components/NextPreview.tsx` | created | Presentational leaf: glass panel + one `PreviewTile` per queued id. Commit `fe1883e`. |
| `components/NextPreview.test.tsx` | created | 7 component tests (render, count, shape-reuse, order, empty, attr discipline). Commit `cb17120`. |
| `components/GameContainer.tsx` | modified | Import + destructure `queue` + render `<NextPreview>` right of the board; header doc note. Commit `3ee5dcb`. |

No `lib/`, `useGame.ts`, `HoldBox`, or `Cell` changes.

### Design fidelity

Implementation matches design.md decisions D1–D6:
- **D1** — component takes `queue: TetrominoType[]` and renders it verbatim (one tile per entry); it
  imports no `PREVIEW_COUNT` and does no slicing, so the hook is the single source of truth for count.
- **D2** — each tile reuses `cellsFor(type, 0)` on a `BOUNDING_BOX[type]` grid (HoldBox's technique),
  no re-derived offsets. Duplication over a shared `<PieceTile>` was deliberately kept (matches the
  codebase grain: `Cell.CELL_COLOR` / `HoldBox.PIECE_FILL`).
- **D3** — local literal `PIECE_FILL` map (Tailwind v4 tree-shaking; computed class names would drop).
- **D4** — filled squares carry `data-next={type}`, never `data-cell`; container is `aria-label="Next"`.
- **D5/D6** — vertical glass panel, uppercase "Next" label, fixed `64px` slots (no column jitter),
  placed to the right of the board (hold left / next right, per the Tetris HUD guideline).

## Test coverage

`NextPreview.test.tsx` (jsdom) covers:
- Labelled panel renders for a non-empty queue.
- One tile per piece, each exactly 4 filled squares (12 for a 3-item queue), grouped by id in order.
- Every tetromino drawn as 4 squares tagged with its id.
- **Shape-reuse** (the strongest assertion): per-tile filled indices recovered from DOM order equal
  `cellsFor(type, 0)` — guards against hard-coded coordinates, transferred from `HoldBox.test`.
- Queue rendered top-to-bottom in order.
- Empty queue → panel present, zero squares (defensive, no crash).
- Never emits `data-cell` — protects `GameContainer.test`'s `[data-cell] === ROWS*COLS` invariant.

Full suite: **228 tests / 23 files passing.** Lint clean (`--max-warnings 0`). Production build green
(vinext) — the explicit AC gate.

### Coverage gaps (accepted)

- **No new integration test** asserting the wired preview advances as pieces spawn. The seam that
  keeps `queue` current under spawns is already covered by T-007-04-01's `useGame.queue.test.ts`
  ("surfaced queue matches subsequent spawns"), and `GameContainer.test` exercises the wired render's
  non-interference (board count invariant). The component is deterministic in `type`, so a
  render-with-a-fixed-queue unit test is the meaningful surface; end-to-end advance is emergent from
  two already-tested seams. Deemed sufficient for the AC ("component test covers the render").
- No visual/snapshot test of neon styling — consistent with the rest of the component suite (which
  asserts structure/attributes, not pixels).

## Open concerns / limitations

- **No advance animation/juice.** Tiles snap on re-render; the flash/slide belongs to E-004, matching
  the scope notes on `HoldBox`/`GameOverlay`. Not a defect for this ticket.
- **Index keys** on tiles (`key={i}`). Intentional: the queue is positional (slot 0 = next) and ids
  repeat across the bag, so the slot index is the correct stable key. React will reconcile fills in
  place as ids shift — acceptable and cheap for ≤5 static tiles.
- **Hydration** — `queue` is seed-deterministic (`DEFAULT_SEED`), so SSR and client first paint match;
  no mismatch risk. No runtime concern surfaced during the build.

## Verdict

AC met: `NextPreview` renders the upcoming pieces, updates as each spawns (via the memoized `queue`),
a component test covers the render, and the production build stays green. Nothing requires human
attention beyond normal review of the diff. No follow-up ticket needed unless a third tile consumer
appears (then extract a shared `<PieceTile>` per design.md D2's note).
