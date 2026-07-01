# Design — T-004-04-01: throwaway-probe-all-effects

Decide *how* to prove the E-004 vocabulary is live end-to-end, grounded in the Research reality: the
theme is settled, all five items already emit into the production chunk, the boundary forbids a
tracked consumer, and a local headless Chrome exists. Enumerate options, pick one, record rejections.

## Decision 1 — probe medium

Something must consume `.glass`, `.glow-*`, `.flash`, `.motion*`, and the seven hues and render them.
Where does that consumer live?

**Option A — Temp Next route (`app/probe/page.tsx`), dev/build, screenshot, delete.**
Renders through the real app pipeline. But: it is a *tracked* file under `app/`; the boundary is only
honored if I remember to delete it, and any crash mid-run leaves a boundary violation on disk. It also
drags in React/Next just to paint static divs. Rejected — fragile "throwaway," needless machinery.

**Option B — Computed-style assertions only (no pixels).** Load the built chunk in headless Chrome,
`getComputedStyle` each probe element, assert `backdrop-filter`, `box-shadow`, `transition-property`,
the seven `--color-piece-*` values, and the resolved `@keyframes flash`. Deterministic and cheap. But
the AC says *renders* — reads as a visible effect, and prior siblings paired grep with an actual
frame. Computed style alone can't show the glow *bloomed* or the hues read as one neon set. Rejected as
*sole* proof; kept as a corroborating layer.

**Option C (CHOSEN) — Standalone HTML probe in the scratchpad, linking the *built* CSS chunk, rendered
+ screenshotted by headless Chrome.** A single `probe.html` under
`/private/tmp/.../scratchpad/` with a `<link rel="stylesheet">` to the emitted
`.next/static/chunks/*.css`, laying out all five effects in one viewport, on the app's dark
(`#0a0a0f`) background. Headless Chrome loads it and writes one PNG. Then both files are discarded with
the scratchpad.

Why C wins on the Research constraints:
- **Throwaway + boundary by construction.** The scratchpad is outside the git tree; git never sees it.
  `git diff --stat` is empty over `app components lib` no matter what — the boundary can't be violated
  by a file git can't track. No "remember to delete."
- **Tests what actually shipped.** Linking the *emitted* chunk (not a hand-copied rule set) means the
  probe renders the exact CSS the production build produces — the honest subject of the proof.
- **One frame, all five effects** — trivial to lay out in static HTML; no React needed to paint divs.
- **Real pixels** — a genuine screenshot satisfies "renders," and computed-style assertions (Option B,
  folded in) run in the same headless session as a deterministic backstop.

## Decision 2 — how to freeze the row-clear flash in a still

`.flash` is a **one-shot** `@keyframes` (`… both`, ends at `opacity:0`). A naive screenshot risks
catching it at frame 0 (invisible bloom) or frame 100% (faded to nothing). Options:

- **A — screenshot at a random moment.** Flaky; may catch the transparent tail. Rejected.
- **B — negative `animation-delay` to park mid-animation.** Set `animation-delay: -175ms` (≈35% of the
  500ms default, the bloom peak keyframe) so the element renders *frozen at peak bloom* the instant the
  page loads — no timing race. **Chosen.** It shows the flash at its most legible without depending on
  capture timing. (The base `.flash` still exists elsewhere on the page running normally; the frozen
  copy is purely so the still frame proves the bloom.)
- **C — pin two frames (start+mid) via Chrome virtual-time.** Heavier; B already removes the race.
  Rejected as overkill for a still.

## Decision 3 — what "all seven hues simultaneously" looks like

Render a row of seven cells, each `bg-piece-{i,o,t,s,z,j,l}` (the emitted utility family), so the
whole neon set is visible at once and can be eyeballed as "similar perceived brightness, high chroma,
one coherent set" (the T-004-01-01 design intent). At least one cell also carries its matching
`.glow-{piece}` so the neon-halo utility is exercised on a real hue in the same frame. This collapses
"all seven hues" **and** "a neon glow" into one on-brand cluster.

## Decision 4 — layout of the single probe frame

One dark viewport, five labelled zones, all painted at once:
1. **Seven hues** — a row of seven `bg-piece-*` swatches (I O T S Z J L).
2. **Neon glow** — one (or several) of those swatches also `.glow-*`, blooming in-hue.
3. **Glass panel** — a `.glass` card (composed with Tailwind `rounded-*`/`p-*` to prove utilities layer
   over it) floating over a colorful backdrop so the backdrop-blur is visibly frosted.
4. **Row-clear flash** — a strip of cells with `.flash`, one copy frozen at peak bloom (Decision 2).
5. **60fps transition** — an element with `.motion` whose `transform`/`opacity` is toggled; the still
   shows it mid-interpolation, and the computed-style pass asserts `transition-property:transform,
   opacity` + the `.15s` / `cubic-bezier(.2,0,0,1)` timing.

## Decision 5 — deterministic proof alongside the picture

The screenshot is corroborating; the **objective** proof is build + grep + boundary, exactly the
recipe all five siblings used, run once here as the consolidating pass:
- `npm run build` and `npm run lint` exit 0 (captured in Research; re-run in Implement).
- Grep the built chunk for each of the five items with its computed value (captured in Research).
- `grep -rniE '<class>' app components lib` shows **no** consumer of any vocabulary class in the
  tracked tree (the boundary, positively verified — not just "diff is empty").
- `git diff --stat -- app components lib` is **empty** (no vocabulary added by this ticket) — stronger
  than the AC's "only theme/globals changes," which allows for a change this ticket simply doesn't need
  to make.
- Headless-Chrome computed-style assertions (Option B, folded in) confirm the classes resolve to the
  intended properties in a real engine, not just as text in the chunk.

## What this ticket deliberately does NOT do

- **No edit to `app/globals.css`.** The vocabulary is complete and verified; touching it would be
  gratuitous. Net tracked change is zero. (The AC permits theme changes; none are needed.)
- **No new keyframes / classes / tokens.** This is verification, not authoring.
- **No permanent probe, demo page, or Storybook.** "Throwaway" is explicit in the AC. A durable visual
  catalog might be nice someday, but it is out of scope and would need its own boundary story (it would
  be a permanent consumer of the vocabulary). Flagged for Review, not built here.
- **No component wiring** — applying these classes to Board/Cell/panels is the render/loop epic's job
  (E-003 seam and beyond), explicitly out of E-004.

## Chosen approach in one line

A scratchpad-only `probe.html` links the **emitted** production CSS chunk and paints all seven piece
hues + a glass panel + a neon glow + a peak-frozen row-clear flash + a compositor transition in one
dark frame; headless Chrome captures one screenshot **and** asserts computed styles; build/grep/boundary
gates provide the deterministic proof; everything the probe touches lives outside the git tree, so
"throwaway" and "boundary held" are true by construction, not by cleanup.
