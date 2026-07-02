# T-007-04-02 — Design: next-preview-component

## Problem

Show the upcoming pieces (already surfaced as `queue: TetrominoType[]` from `useGame`) beside
the board. This is a presentational component + one wiring edit. The design decisions are:
(1) how the component consumes the queue, (2) how each piece mini-tile is drawn, (3) attribute
& styling discipline, (4) where it sits in the layout.

## Decisions

### D1 — Props shape: accept `queue: TetrominoType[]`, render one tile per entry

**Chosen:** `NextPreview({ queue }: { queue: TetrominoType[] })`. Map over `queue` and render a
mini-tile per id. The component does **not** import `PREVIEW_COUNT` or slice — it renders
exactly what it's handed.

- *Why:* Single source of truth. `useGame` already sizes `queue` to `PREVIEW_COUNT` (documented
  as the count the preview shows, naming this ticket). Consuming the array verbatim means no
  second count to drift. Mirrors `HoldBox`, which takes `type`/`canHold` straight off the hook.
- *Rejected — `NextPreview({ queue, count })`:* redundant; `queue.length` already is the count.
- *Rejected — component reads the hook itself:* breaks the presentational discipline every
  other component (`Board`, `Cell`, `HoldBox`, `GameOverlay`) follows — logic/state stays in the
  hook + container, leaves are props-driven and trivially testable.

### D2 — Draw each tile by reusing `cellsFor(type, 0)` on a `BOUNDING_BOX[type]` grid

**Chosen:** Exactly `HoldBox`'s technique, factored into a small internal `PreviewTile`:
build `filled = new Set(cellsFor(type, 0).map(c => c.y*box + c.x))`, render a `box*box`
row-major grid, fill `data-next={type}` squares with the neon token, blanks with `bg-white/5`.

- *Why:* Reuses the same shape data the board uses — zero re-derived offsets, and the "reuses
  shape data, not hard-coded coords" test from `HoldBox.test` transfers directly. Proven pattern.
- *Rejected — a shared `<PieceTile>` extracted from HoldBox:* tempting (DRY), but HoldBox's tile
  is entangled with its own `canHold` dimming, `72px` sizing, and `data-hold` attribute. Pulling
  a shared component means touching the landed, tested `HoldBox` leaf and inventing a
  configurable attribute/size API — a bigger blast radius than the ~30 lines duplicated. The
  codebase **already chose duplication** here on purpose: `Cell.CELL_COLOR`, `HoldBox.PIECE_FILL`
  are the same literal map copied precisely to keep leaves decoupled and satisfy Tailwind
  tree-shaking. Following that established grain beats a premature abstraction. (If a third
  consumer appears, extraction can be revisited as its own cleanup ticket.)

### D3 — Local literal `PIECE_FILL` map (Tailwind v4 tree-shaking)

**Chosen:** Copy the `Record<TetrominoType, string>` of `bg-piece-*` literals into `NextPreview`,
same as `HoldBox`/`Cell`.

- *Why:* Non-negotiable constraint, not a preference: Tailwind v4 only emits utilities found as
  literals in source. A computed `bg-piece-${type}` is silently dropped and the tiles render
  colorless. Every rendering module owns its own static map by design.

### D4 — Attribute discipline: `data-next={type}`, never `data-cell`

**Chosen:** Filled preview squares carry `data-next={type}`; the container carries
`aria-label="Next"`.

- *Why:* `data-cell` is load-bearing for `GameContainer.test`'s row-major board indexing
  (`cells()` counts `[data-cell]` and asserts `ROWS*COLS`). A side panel emitting `data-cell`
  would shift indices and break board assertions — exactly the rule `HoldBox` calls out for
  `data-hold`. `data-next` is the parallel, test-friendly hook; `aria-label="Next"` mirrors
  `aria-label="Hold"` for a11y + test targeting.

### D5 — Vertical stack of tiles, neon/glass panel, right of the board

**Chosen:** A single glass panel (`rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl`)
with an uppercase "Next" label, containing a vertical `flex-col` of fixed-size mini-grids (one
per queued piece, top = next to spawn). Placed as the third child of `GameContainer`'s flex row,
to the **right** of the board wrapper.

- *Why:* Matches the Tetris guideline HUD (hold left, next column right) and reuses HoldBox's
  exact panel styling so the two side panels read as one system. Fixed tile sizing keeps layout
  stable as pieces cycle (no reflow). Vertical order = spawn order, top-down, the universal
  convention.
- *Rejected — horizontal row of tiles:* wastes width beside a tall board and diverges from the
  standard vertical next-queue.
- *Rejected — a new outer flex wrapper / grid rework:* unnecessary; the existing
  `flex items-start gap-4` row takes a third child cleanly.

### D6 — Tile sizing: uniform box, all pieces in a fixed-width slot

**Chosen:** Each tile renders on its own `BOUNDING_BOX[type]` grid (I=4, O=2, rest=3) but inside
a fixed-size square slot (like HoldBox's `72px`), so tiles line up regardless of piece box.

- *Why:* Consistent column width → no horizontal jitter as I (4-wide) and O (2-wide) alternate.
  HoldBox already fixes its box to a stable pixel size for the same reason.

## Non-goals

- No animation/juice on piece advance (E-004 scope; HoldBox/GameOverlay carry the same note).
- No configurable count UI, no per-piece labels, no drag/interaction — pure read-only HUD.
- No change to `useGame`/`lib` — the seam is already complete (T-007-04-01).

## Risk & verification

- **Hydration:** `queue` is seed-deterministic, so SSR and client first paint match — no risk.
- **Empty queue:** map over `[]` renders an empty (but present) panel — no crash. Covered by a test.
- **Build gate:** AC explicitly requires the production build stays green — run `npm run build`.
- Verified against: `HoldBox.test.tsx` (transferable assertions), `GameContainer.test.tsx`
  (`data-cell` count invariant).
