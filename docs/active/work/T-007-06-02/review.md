# Review — T-007-06-02 row-flash-and-60fps-transitions

Handoff for a human reviewer. What changed, how it's covered, and what to watch.

## What the ticket asked

> Clearing lines in the running game shows a visible row flash and cells transition smoothly (no
> snap) at 60fps; the animation is driven off the surfaced cleared-row indices and the production
> build stays green.

Delivered by wiring the already-surfaced `clearedRows` (T-007-06-01) to the E-004-provisioned
`.flash`/`.motion` CSS, via a latch that gives the flash its full lifetime.

## Changes

### New

- **`components/useClearFlash.ts`** — the latch. `clearedRows` is a transient *one-frame* field
  (the core resets it to `[]` on the next step), so rendering the flash straight off it would be cut
  short by the next keypress. The hook captures a clear frame's rows, holds them for `durationMs`,
  and exposes a `generation` counter so the CSS animation restarts on back-to-back clears. Capture
  uses React's "adjust state while rendering" pattern (array-identity compare); only the release
  timer is an effect (state set from its async callback → no synchronous effect setState).
- **`components/useClearFlash.test.ts`** — 6 fake-timer tests: idle, capture+generation bump,
  persistence across the empty resets that follow a clear, timed release, restart-before-expiry, and
  unmount timer cleanup.
- **`components/Board.flash.test.tsx`** — 4 tests: one bar per index on the right `gridRow`, the
  `[data-cell]` count invariant holds (bars carry `data-flash-row`, not `data-cell`/`data-ghost`),
  no overlay when empty, grid + overlay coexist.

### Modified

- **`components/useGame.ts`** — `FLASH_DURATION_MS = 500`, in the seam beside `GRAVITY_INTERVAL_MS`
  (feel/timing never in pure `lib/`); documented to equal the CSS `.flash` default.
- **`components/Board.tsx`** — additive `flashRows?`/`flashKey?` props. Grid geometry extracted to a
  shared style object; an absolutely-positioned overlay grid (same template/gap/padding, `border
  border-transparent` to match the cell grid's border-box, `pointer-events-none`) paints one
  `.flash .glow` bar per cleared row at `gridRow: y+1; gridColumn: 1 / -1`. Logic-free, mirrors the
  ghost-channel precedent.
- **`components/Cell.tsx`** — `.motion` on all three render branches: compositor-only
  (transform/opacity) transition hook, the 60fps guarantee. `background-color` deliberately not
  transitioned (paint, off-compositor).
- **`components/GameContainer.tsx`** — destructures `clearedRows`, runs it through `useClearFlash`,
  passes `flashRows`/`flashKey` to Board.
- **Test tweaks** — Cell asserts `.motion`; GameContainer asserts no flash overlay during idle play.

### Untouched (by design)

`lib/**` (purity boundary), `app/globals.css` (E-004 already shipped `.flash`/`.motion`/`.glow`).

## Test coverage

- **Full suite:** 279 passed / 28 files. **Lint:** clean (`--max-warnings 0`). **Build:** vinext
  production build green — the AC's explicit gate.
- **Mechanism (well covered):** the two pieces carrying real logic — the latch lifecycle and the
  overlay rendering/invariants — are unit-tested directly with fake timers and props. Back-to-back
  clears (generation restart), latch persistence through the empty-reset frame, and the `[data-cell]`
  invariant are all pinned.
- **Regression:** the existing GameContainer rAF-pump blocks (gravity/pause/game-over) still pass —
  the latch's `setTimeout` never arms in those paths because the default seed never clears a line.

### Coverage gaps (human attention)

1. **No automated end-to-end "play until a line clears → bars appear."** GameContainer owns a
   fixed-seed `useGame` with no board-injection seam, and the default seed never completes a row
   through play (pieces fall straight down — same reason `GameContainer.test.tsx`'s existing clear
   test builds the clear at the `clearLines` seam, not via input). The clear→flash path is therefore
   verified as two proven halves (latch + overlay) plus the existing proof that a completed row
   reaches Board. A true integration test would need a seed/board-injection test seam on
   `useGame`/`GameContainer` — out of scope here; worth a small future ticket if E2E clear coverage
   is desired.
2. **The animation itself is not asserted visually.** Tests confirm the `.flash`/`.motion` classes
   and DOM structure are applied; jsdom can't assert the actual keyframe playback or 60fps. Manual
   confirmation recommended (see below).

## Manual verification suggested

Run `npm run dev`, stack a full bottom row, and clear it: confirm (a) a neon bar flashes across the
cleared row and fades over ~500ms, (b) it isn't cut short if you keep pressing keys, (c) two quick
clears each flash. This is the one behaviour unit tests can't observe.

## Open concerns / limitations

- **Flash paints row *positions*, not the cleared cells' colors.** On the clear frame the board is
  already collapsed and only the pre-collapse indices are surfaced, so the bar is a neutral neon
  wash at the row (the E-004 `.flash` default tint), overlaid on the settled result. This reads as
  "these rows lit up as they cleared" — intended — but it is not a per-cell dissolve of the original
  piece colors. Achieving that would require the core to retain the pre-collapse board (rejected in
  Design: it pollutes pure `lib/` and reopens a done seam).
- **No true row-collapse slide.** Cells are position-keyed (`y*cols+x`), so React reuses DOM by
  slot and nothing "moves" for a transform to interpolate. "Smooth / no snap" is delivered via
  `.motion` easing, not sliding physics — a full layout animation would need content-keyed cells and
  is a larger rework beyond this ticket's AC.
- **Timing coupling:** `FLASH_DURATION_MS` (release) must stay equal to the CSS `--flash-duration`
  (visual). Both are 500ms and cross-referenced in comments; a future retune must change both.
- **`prefers-reduced-motion` is not yet honored** — neither the flash nor `.motion` gate on it. Not
  in this AC, but a reasonable accessibility follow-up.

## Verdict

AC met: a visible, full-duration row flash driven off the surfaced `clearedRows`, compositor-only
60fps cell transitions, and a green production build — with `lib/` purity and all existing invariants
intact. Ready for review; the E2E clear test and reduced-motion support are the candidate
follow-ups.
