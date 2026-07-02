# Design — T-007-06-02 row-flash-and-60fps-transitions

## Problem restated

Turn a line clear into visible juice: a neon row flash on the cleared rows plus smooth,
non-snapping cell motion, all at 60fps, driven off the already-surfaced `clearedRows` indices, with
the production build/tests staying green. The data seam is done; this is a render-layer wiring job
against two constraints from Research:

1. **Transience** — `clearedRows` is non-empty for exactly one dispatch, then resets to `[]`; the
   next input can arrive well before a 500ms animation finishes.
2. **Post-collapse render** — on the clear frame the board is *already* collapsed, and we only have
   the pre-collapse row *indices*, not the cleared cells' colors.

## Decisions at a glance

| Concern | Decision |
| --- | --- |
| Animation lifetime | **Latch** `clearedRows` in the component layer (`useClearFlash`) and hold for a fixed duration via a timer, decoupling the visual from the one-frame core field. |
| Flash placement | An **overlay grid** inside `Board`, mirroring the board's geometry, with one full-row `.flash` bar per cleared index; elements carry `data-flash-row`, **never** `data-cell`. |
| "Smooth cell transitions" | Apply **`.motion`** (compositor-only transform/opacity) to `Cell`'s root; document full row-slide physics as out of scope for position-keyed cells. |
| Timing source of truth | `FLASH_DURATION_MS` in the `useGame` seam, mirroring the CSS `--flash-duration` default (500ms). |
| `lib/` | Untouched — flash is pure feel/render. |

---

## Decision 1 — animation lifetime: latch, don't render-raw

### Option A — render straight off `clearedRows`

`Board` gets `flashRows={clearedRows}`; bars mount whenever it's non-empty. Simplest possible.

- **Rejected.** The field lives one dispatch. Under gravity that's ≤800ms (enough for a 500ms
  flash), but a keypress right after a clear (extremely common — players keep playing) resets it to
  `[]` and yanks the bars mid-animation. Two consecutive clears report array values that may be
  `.toEqual` but are different references with the same *content*; React keyed on row index would
  **not** restart the CSS animation, so back-to-back clears could visually stutter or skip. The
  effect's lifetime would be hostage to input cadence — unacceptable for the epic's "wow" beat.

### Option B — latch in the component layer (CHOSEN)

A small client hook, `useClearFlash(clearedRows, durationMs)`, watches the incoming field; when it
transitions to a non-empty set it captures those rows into local state and starts a timer; on
expiry it clears them. A **generation counter** bumped on each capture is exposed so the render can
key bars per-burst, guaranteeing the CSS animation restarts on consecutive clears.

- **Chosen.** Gives the `.flash` its full, deterministic 500ms regardless of what the player presses
  next; makes back-to-back clears restart cleanly (generation key); keeps `Board`/`Cell` dumb (the
  hook lives in the seam layer next to `useGame`, where feel/timing already lives). Fully unit
  testable with fake timers. Cost: one `useEffect` + `setTimeout` and a tiny hook — proportionate.

### Option C — hold the pre-collapse board in the core for N frames

Change `lib/game.ts` to keep the uncollapsed board around so the flash can dissolve the *actual*
cleared cells with their colors.

- **Rejected.** Pollutes the pure core with a render/timing concern (violates the `lib/` purity
  boundary the whole codebase defends), reopens a `done` ticket's seam, and is far more invasive
  than the payoff. A position-based row bar reads as juice without it.

**Why B over A** is the crux: the AC says "shows a visible row flash." "Visible" in practice means
"plays to completion, reliably, even mid-play." Only the latch guarantees that.

---

## Decision 2 — flash placement: an overlay grid mirroring the board

We need a full-width neon bar at each cleared row index `y`, aligned to the actual cell rows
(respecting the grid's `p-2` padding and `gap-px`), without (a) adding to the `[data-cell]` node set
or (b) disturbing the grid's auto-placement of the 200 cells.

### Option A — extra grid children placed with `gridRow: y+1; gridColumn: 1 / -1`

Reuses the existing grid. **Rejected**: explicitly-placed items make the auto-placement algorithm
route the 200 auto-flowed cells *around* the occupied tracks, shifting the whole board. Breaks
layout and the coord-recovery tests.

### Option B — absolute bars positioned by percentage over a `relative` grid

`top = y/rows*100%`, `height = 1/rows*100%`. **Rejected**: the grid's `p-2` padding and `gap-px`
mean linear percentages don't line up with the cell rows; the bars would drift a few px off the
rows. Fiddly and fragile if padding/gap ever change.

### Option C — a sibling overlay that is itself a grid with identical geometry (CHOSEN)

Inside `Board`, wrap the existing cell grid and, when there are flash rows, render a second,
absolutely-positioned grid (`inset-0`, same `gridTemplateColumns/Rows`, same `gap-px`, same `p-2`,
`pointer-events-none`) whose **only** children are the flash bars, each explicitly placed at
`gridRow: ${y + 1}`, `gridColumn: 1 / -1`. Because this overlay grid contains *only* explicitly
placed items, there's no auto-flow to disturb; because its template/gap/padding match the cell grid
exactly, each bar lands precisely on its row. Bars carry `data-flash-row={y}` and the `.flash`
`.glow` classes — **no `data-cell`**, so the `[data-cell]` count invariant holds.

- **Chosen.** Pixel-accurate by construction (shared geometry), invariant-safe, and it mirrors the
  established "advisory overlay channel zipped onto the grid" pattern (ghost channel). The geometry
  duplication (template/gap/padding appears twice) is the one cost; contained by computing the grid
  style once in `Board` and spreading it into both layers.

The active piece already lives *inside* `view`, so bars sit on top of the collapsed board — the
flash reads as "these rows lit up as they cleared," which is exactly the intended beat.

---

## Decision 3 — "cells transition smoothly (no snap) at 60fps"

Cells are **position-keyed** (`key = y*cols+x`): React reuses the same DOM node per grid slot and
only swaps its class when content changes. Nothing *moves* between slots, so there is no element
identity for a transform to interpolate along — a true "rows slide down into the gap" physics would
require content-keyed cells and a layout-animation rework well beyond this ticket.

Given that reality, "smooth / no snap" is delivered by applying **`.motion`** to `Cell`'s root
element. `.motion` transitions **only** `transform` and `opacity` (the compositor-only pair) — that
restriction *is* the 60fps guarantee (paint/layout properties snap instead of janking). Concretely
this eases the flash bar's `scaleY` collapse and any opacity change, and gives every cell a
consistent compositor-only transition hook so state changes feel soft rather than instantaneous,
without ever triggering reflow.

- **Rejected alternative:** transition `background-color` on cells so fills crossfade. That's a
  *paint* property — it would animate off the compositor and can drop frames under a full-board
  redraw, directly violating the 60fps clause. `.motion` deliberately excludes it.

**Scope honesty (carried to Review):** full row-collapse slide animation is out of scope; the juice
is (1) the row flash and (2) compositor-only easing via `.motion`. This matches the AC's literal
asks (visible flash + smooth transition + 60fps + green build) without a speculative rework.

---

## Decision 4 — timing constant placement

`FLASH_DURATION_MS = 500` is exported from `components/useGame.ts`, alongside `GRAVITY_INTERVAL_MS`
/ `PREVIEW_COUNT` / `DEFAULT_SEED`, following the codebase rule that feel/timing lives in the seam,
not the pure `lib/`. It must equal the CSS `.flash` default (`--flash-duration: 500ms`) so the latch
releases the rows exactly as the animation ends — one conceptual source of truth. (We rely on the
CSS default rather than injecting `--flash-duration` inline to keep the bar markup minimal; a code
comment ties the two numbers together to prevent drift.)

## Interfaces (shapes, not code)

- `useClearFlash(clearedRows: number[], durationMs: number): { rows: number[]; generation: number }`
  — component-layer hook; latches non-empty inputs, holds `durationMs`, returns the currently
  flashing rows and a burst generation for keying. Cleans its timer on unmount / re-fire.
- `Board` gains `flashRows?: number[]` (default `[]`) and `flashKey?: number` (the generation, for
  animation restart). Purely additive; existing callers/tests unaffected.
- `Cell` root gains the `motion` class — purely a className addition; asserted-against classes
  unaffected.
- `GameContainer` additionally destructures `clearedRows` from `useGame`, pipes it through
  `useClearFlash`, and passes `flashRows`/`flashKey` to `Board`.

## Risks

- **Timer + rAF integration tests:** `GameContainer.test.tsx` stubs rAF and asserts `pending`. The
  latch uses `setTimeout` (real, not rAF) and only fires on an actual clear — the default seed never
  clears — so the existing pumps are unaffected. Verified in Plan's test matrix.
- **Restart on consecutive clears:** handled by the `generation` key.
- **`data-cell` count:** flash bars deliberately omit `data-cell`; Board's invariant test is the
  guard.
