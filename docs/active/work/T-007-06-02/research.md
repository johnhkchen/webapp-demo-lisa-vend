# Research — T-007-06-02 row-flash-and-60fps-transitions

## Ticket

Play a row-clear flash/animation and smooth 60fps cell transitions in Board/Cell so clears read
as juice rather than a silent instant redraw — the epic's wow payoff. The animation must be driven
off the surfaced cleared-row indices; the production build must stay green.

_Advances: P2 (payoff/juice)._ Depends on T-007-06-01 (surface-cleared-rows), which is `done`.

## The data seam that feeds this ticket (from T-007-06-01)

The cleared-row indices are already plumbed end-to-end. The pipeline:

- `lib/line-clear.ts` — `clearLines(board)` returns `{ cleared, clearedRows, board }`.
  `clearedRows` are the **pre-collapse** indices (ascending) of the rows removed, in the coordinate
  space of the board it was *given* (not the compacted board it returns). Its docstring explicitly
  anticipates this ticket: "A render layer flashes those rows on the pre-collapse board before
  showing the collapsed result (see T-007-06-02)."
- `lib/game.ts` — `GameState.clearedRows: number[]`. Documented as a **transient per-step output**:
  non-empty *only* on the frame whose lock cleared rows, reset to `[]` on every other step
  (every constructive non-lock branch — move/rotate/hold/pause/tick-no-clear — sets `clearedRows: []`).
  The lock branch (`lib/game.ts:173-183`) sets it to the `clearLines` result.
- `components/useGame.ts` — `GameView.clearedRows` is a **straight pass-through** of
  `state.clearedRows` (`useGame.ts:105`), surfaced flat beside `view`/`ghost`/`queue`. No memo, no
  derivation. A dedicated test (`useGame.clearedRows.test.ts`) asserts it is the *same reference*
  the reducer produced on every frame.

### The critical timing constraint

On the clear frame, `state.board` (and therefore `view = overlayPiece(state.board, active)`) is
**already the collapsed board** — `clearLines` collapses in the same `step` that reports
`clearedRows`. So at render time we have:

- the compacted board (survivors already restacked toward the bottom), and
- the pre-collapse indices of the rows that were removed.

We do **not** have the pre-collapse cell contents at those rows. Any flash must therefore paint a
row *position* (a full-width bar at index `y`), not the original piece colors of the cleared row.
This is fine for a "row flash" — a horizontal neon bloom across each cleared row reads as juice —
but it rules out a per-cell "these exact colored cells dissolve" effect without holding the
pre-collapse board, which the current seam does not surface.

The field is also live for **exactly one dispatch**. The next input (a gravity `tick` up to
`GRAVITY_INTERVAL_MS = 800ms` later, or any keypress) resets it to `[]`. A naive "render while
`clearedRows` non-empty" flash would be cut short by a fast keypress and would not restart on a
second consecutive clear (same array value, no React key change). This is the main lifetime problem
the design must solve.

## Render layer as it stands

- `components/Board.tsx` — props-driven CSS grid, **no state, no game logic** (enforced by the
  `lib/**` purity boundary + component conventions). Props today: `board`, `ghost?`, `ghostType?`.
  Renders one `Cell` per square, position-keyed `key = y * cols + x`. Grid container has
  `gap-px`, `p-2`, and explicit `gridTemplateColumns/Rows` derived from the matrix. The ghost
  channel is the established precedent for "an advisory overlay channel zipped onto the grid by the
  same key, kept logic-free."
- `components/Cell.tsx` — presentational leaf. Three visual states (settled / ghost / empty) via
  literal Tailwind class maps (literal on purpose: Tailwind v4 tree-shakes computed class names).
  Root element carries `data-cell` (piece id or `"empty"`) and optionally `data-ghost`.
- `components/GameContainer.tsx` — the single `"use client"` island. Destructures
  `{ state, view, ghost, queue, dispatch }` from `useGame` (note: **does not** currently pull
  `clearedRows`). Owns the rAF gravity loop (`useAnimationFrameLoop`) and keyboard routing. Renders
  `<Board board={view} ghost={ghost} ghostType={...} />` inside a `relative` wrapper alongside the
  `GameOverlay`s, `HoldBox`, `NextPreview`.
- `components/useAnimationFrameLoop.ts` — game-agnostic rAF cadence hook (accumulator drains whole
  intervals; latest-callback ref; cancels on unmount / dep change). Reusable timing seam.

## The CSS vocabulary was pre-provisioned for this ticket (E-004)

`app/globals.css` already ships purpose-built, tree-shake-safe utilities in `@layer components`
(chosen over `@utility`/`@theme` precisely because E-004 forbade a component consumer at the time):

- **`.flash`** — plays a named `@keyframes flash` **once** (`animation: flash 500ms ease-out both`).
  The keyframes: neon tint at 0%, tint + double-layer bloom (box-shadow) at 35%, fade to
  `opacity: 0` + `scaleY(0.85)` at 100%. Tint/duration/easing/bloom are all
  `var(--flash-*, default)` knobs. The comment states outright: "The later line-clear juice applies
  `.flash` to cleared rows and gets consistent timing." **Default `--flash-duration` is 500ms.**
- **`.motion` / `.motion-fast` (90ms) / `.motion-slow` (260ms)** — compositor-only transitions:
  `transition-property: transform, opacity` **only**. The comment names this restriction as *the*
  60fps guarantee — even if a consumer flips a paint/layout property, only transform/opacity
  transition, so no reflow-animation and no dropped frames. Default duration 150ms. Deliberately
  **no `will-change`** (a per-call optimization the render epic applies imperatively, not baked in).
- **`.glow` / `.glow-{piece}`** — neon halo box-shadows in a piece hue or `currentColor`.

So the ticket is largely a *wiring* job: connect the already-surfaced `clearedRows` to the
already-authored `.flash`/`.motion` CSS. The design's job is choosing *how* to make the transient
one-frame field drive a full-duration, compositor-only animation without breaking the render layer's
purity/invariants or the existing test suite.

## Test landscape (must stay green)

- `Board.test.tsx` — asserts `container.querySelectorAll("[data-cell]").length === ROWS * COLS`
  exactly, and `[data-ghost]` counts. **Any flash element must NOT carry `data-cell`** (or it
  inflates the count and fails these tests). Ghost coord recovery relies on flat row-major
  `[data-cell]` order — flash elements must stay outside that node set.
- `Cell.test.tsx` — checks className `contains`/`not.contains` of `bg-piece-*` variants. Adding a
  neutral utility class (e.g. `.motion`) to Cell's root is safe (no `bg-piece-` substring).
- `GameContainer.test.tsx` — many tests count `[data-cell]` === ROWS*COLS and recover coords from
  it. Has a "reflects a line clear" test that builds a clear at the `clearLines` seam directly (the
  default seed never completes a line — pieces fall straight down). Also has deterministic rAF-pump
  integration blocks (game-over, pause) that assert `pending` (scheduled frame) state. New timers
  (e.g. a flash latch `setTimeout`) must not interfere with these or leak.
- `useGame.clearedRows.test.ts` — pins the pass-through/identity contract; unaffected if we only
  *consume* `clearedRows`.

Runner: `vitest run` (jsdom for component tests). Build: `vinext build` (must pass). Lint:
`eslint --max-warnings 0`.

## Constraints & conventions observed

- **`lib/` stays pure** — the flash is a render/feel concern; nothing new belongs in `lib/`. The
  `clearedRows` data seam is already complete; no core change is needed or wanted.
- **Feel/timing lives in the component seam**, not `lib/constants.ts` — precedent:
  `GRAVITY_INTERVAL_MS`, `PREVIEW_COUNT`, `DEFAULT_SEED` all live in `useGame.ts` with that exact
  rationale. A flash-duration constant belongs there too, and should mirror the CSS `500ms` default
  (one source of truth, no drift).
- **Board/Cell hold no game logic** — a flash channel must be advisory props zipped on, mirroring
  the ghost-channel precedent.
- **Tailwind v4 tree-shaking** — only literal class strings survive; `.flash`/`.motion`/`.glow`
  already exist as `@layer components` rules so referencing them by literal name is safe.
- **SSR/hydration** — `useGame` is deterministic on purpose (fixed seed). Any timer-based latch must
  not run during render and must be effect-driven so server and first client render agree (an empty
  flash set on first paint).

## Open questions carried into Design

1. How to give the 500ms `.flash` its full lifetime despite `clearedRows` being live for one
   dispatch only — render straight off the field, or latch it in the component layer with a timer?
2. Where to place the flash overlay so it aligns to the exact cleared rows without disturbing the
   grid's auto-flow or the `[data-cell]` count (overlay grid vs. absolute bars vs. per-cell class).
3. What "cells transition smoothly (no snap)" realistically means given **position-keyed** cells
   (React reuses DOM by grid position, so nothing "moves" for a transform to interpolate) — likely
   `.motion` easing of opacity/transform on Cell, with full row-slide physics out of scope.
