# T-007-04-02 — Research: next-preview-component

## Ticket

Render a `NextPreview` component showing the upcoming 7-bag pieces beside the board so the
player can see what's coming. Advances P4, P2. Depends on **T-007-04-01** (done).

AC: A `NextPreview` renders the upcoming pieces and updates as each spawns; a component test
covers the render and the production build stays green.

## What already exists (the seam is fully prepared)

The dependency ticket **T-007-04-01** already surfaced the lookahead. There is no game-logic
work left in this ticket — it is purely a presentational component plus wiring.

### The data source — `useGame` (`components/useGame.ts`)

- `useGame()` returns a `GameView` (line 68) with a `queue: TetrominoType[]` field.
- `queue` is `useMemo(() => upcomingPieces(state, PREVIEW_COUNT), [state])` (line 93). It
  re-derives on every dispatch because `state` identity changes each `step`, so it stays
  current as pieces spawn. `upcomingPieces` is a **non-consuming** bag peek — reading it never
  desyncs the piece stream (verified by the sibling tests behind T-007-04-01).
- `PREVIEW_COUNT = 5` (line 60) is exported and documented as the single source of truth for
  "how many slots the preview shows" — the comment explicitly names T-007-04-02 as the consumer
  so the component renders exactly as many slots as are surfaced. **No magic-number drift.**
- `queue` length equals `PREVIEW_COUNT` (5) for the default bag; the component should not assume
  a fixed length but map over what it's given.

### The rendering template — `HoldBox` (`components/HoldBox.tsx`)

This is the closest sibling and the pattern to mirror. `HoldBox`:
- Is presentational, props-driven, holds no state and no game logic (CLAUDE.md discipline:
  logic stays pure in `lib/`, components only render).
- Draws a tetromino by reusing shape data: `cellsFor(type, 0)` (spawn cells) painted onto a
  `BOUNDING_BOX[type]`-sized mini grid via a row-major `Set` of filled indices (lines 55–59,
  79–86). It re-derives no offsets of its own.
- Owns a **local literal** `PIECE_FILL: Record<TetrominoType, string>` map of `bg-piece-*`
  tokens (lines 36–44). This duplication is deliberate: Tailwind v4 only emits utilities it
  finds written out as literals in source, so a computed `bg-piece-${type}` would be
  tree-shaken. `Cell.tsx` (`CELL_COLOR`, lines 24–32) establishes the same pattern. Each
  rendering module owns its own static map.
- **Attribute discipline (load-bearing):** filled squares carry `data-hold={type}`, **never**
  `data-cell`. `data-cell` is reserved for board squares — `GameContainer.test`'s flat
  row-major index helpers (`cells()`, `filledCoords()`) count `[data-cell]` and assert
  `ROWS*COLS`. A stray `data-cell` in a side panel shifts those indices and breaks board
  assertions. The new preview must follow the same rule (use a distinct attribute).
- Uses `aria-label` on the container for accessibility + test targeting (`aria-label="Hold"`).
- Neon/glass styling: `rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl`, an
  uppercase tracking-wide label, and a fixed-size inner grid (`72px` box) so layout never jumps.

### Shape data — `lib/tetrominoes.ts`

- `TETROMINO_TYPES` (line 29): the seven ids in canonical order. Its doc comment already names
  "the `NextPreview`" as an iterator of it (line 32) — the preview was anticipated here.
- `BOUNDING_BOX` (line 44): per-piece box side (I=4, O=2, rest=3).
- `cellsFor(type, rotation)` (line 119): the four occupied offsets; `cellsFor(type, 0)` is the
  spawn orientation, exactly what HoldBox uses for its still render.

### The wiring point — `GameContainer` (`components/GameContainer.tsx`)

- The single `"use client"` island. It calls `useGame()` and currently destructures
  `{ state, view, ghost, dispatch }` (line 64) — it does **not** yet pull `queue`.
- Layout (lines 90–102): a `flex items-start gap-4` row with `<HoldBox>` on the left and the
  board (wrapped `relative`, with `GameOverlay`) on the right. The NextPreview conventionally
  sits to the **right** of the board (Tetris guideline: hold left, next right).
- To wire the preview: destructure `queue`, render `<NextPreview queue={queue} />` as a third
  child of the flex row (right of the board wrapper).

### Types — `lib/types.ts`

`TetrominoType` is the piece-id union consumed everywhere; `queue` is `TetrominoType[]`.

## Testing conventions

- Component tests: `// @vitest-environment jsdom`, `vitest` + `@testing-library/react`
  (`render`, `cleanup`, `afterEach(cleanup)`). See `HoldBox.test.tsx`.
- Tests recover a piece's grid cells from DOM order among `.grid > div` and compare to
  `cellsFor(type, 0)` — reuse-not-hardcode is asserted, not just count.
- `GameContainer.test.tsx` asserts `cells(container)` (all `[data-cell]`) stays `ROWS*COLS`
  after side panels render — the new component must not add `data-cell` squares.
- Run: `npm run test` (`vitest run`). Build gate: `npm run build` (vinext). Lint:
  `npm run lint` (`eslint --max-warnings 0`).

## Constraints & assumptions

- **No game logic in the component.** Pure presentation, reuse shape data (CLAUDE.md).
- **No `data-cell`** on preview squares — reserve it for the board. Use a distinct attribute
  (e.g. `data-next`) mirroring HoldBox's `data-hold`.
- **Literal Tailwind class map** required (tree-shaking) — cannot compute class names.
- Single source of truth for slot count: consume `queue` from the hook (which is sized by
  `PREVIEW_COUNT`); do not re-declare a count in the component.
- Deterministic first paint: `queue` derives from a fixed seed, so server and client render the
  same pieces — no hydration mismatch risk (same reasoning as `DEFAULT_SEED`).
- The queue is always non-empty in normal play; but the component should render gracefully for
  an empty array (defensive, no crash).
