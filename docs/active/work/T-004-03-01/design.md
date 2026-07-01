# Design — T-004-03-01: row-clear-flash-keyframes

Decide *how* to author the row-clear flash animation. Options weighed against the codebase reality
from Research (Tailwind v4 tree-shaking, the no-consumer boundary, the `.glass`/`.glow` precedent,
and the new `@keyframes` wrinkle). One chosen, rejections recorded.

## The decision that dominates: emit with no consumer (settled by precedent, extended to keyframes)

Research re-established the invariant both siblings proved in this exact build: `@utility` (and,
equivalently, Tailwind v4's `@theme { --animate-*; @keyframes }` animation path) is **tree-shaken**
without a scanned consumer, while `@layer components { .foo {} }` emits **unconditionally** and sits
below the `utilities` layer. E-004 forbids a consumer. So the *class* mechanism is not open — the
`.flash` class goes in `@layer components`, exactly as `.glass`/`.glow` did.

The one genuinely new question: **where do the `@keyframes` live**, and are they kept reachable?
That is Decision 1. Everything else (the flash recipe, tint, timing) is the creative part.

## Decision 1 — keyframes at top level, kept alive by an always-emitted `.flash` rule (chosen)

Three ways to express a named animation in Tailwind v4:

**A. `@theme { --animate-flash: flash …; @keyframes flash {…} }`.** The idiomatic v4 path; generates
an `animate-flash` utility. But the utility *and* its `@keyframes` are conditional on `animate-flash`
appearing in a scanned source — the **same tree-shaking trap** `@utility` hit. Under the no-consumer
boundary it is dead on arrival. Rejected for identical reasons to the siblings' `@utility` rejection.

**B. Bare top-level `@keyframes flash {…}` + a `.flash` utility in `@layer components` that sets
`animation: flash …` (chosen).** The `@keyframes` is written as plain CSS outside `@theme`, so it is
not a Tailwind-generated artifact subject to `animate-*` gating. The `.flash` rule lives in
`@layer components`, which emits unconditionally (proven twice) and **references `flash` by name via
its `animation` declaration** — so even under any unused-`@keyframes` pruning, `flash` is *used* and
kept. Both halves of the AC ("a named `@keyframes` animation **and** its utility") come from one
self-contained block, with no consumer required.

**C. Everything inline on `.flash` with no separate `@keyframes`.** Impossible — an animation
*requires* a named `@keyframes` block; "a named `@keyframes flash`" is literally in the AC. Rejected.

**Chosen: B.** It reuses the settled `@layer components` mechanism for the class, keeps the
`@keyframes` as ordinary CSS (the surest way to have it survive to the build), and makes the class
the thing that keeps the keyframes reachable — the AC's "animation *and* its utility both emit"
falls out of one block. Implement will grep-confirm both survive a clean build with the probe gone;
if a bare top-level `@keyframes` were somehow dropped (not expected), the fallback is to move it
inside `@theme static { @keyframes flash {…} }` (the `static` blocks already force emission for the
piece tokens) — recorded in Plan's rollback.

## Decision 2 — the flash recipe: a neon bloom peak, then fade-and-collapse

"Neon-tinted bloom/fade" for a row that is being cleared. The shape that reads as *juice*:

| Stop | State | Role |
|---|---|---|
| `0%`   | opacity 1, tint fill at full, no bloom, `scaleY(1)` | the row as it was — flash begins |
| `35%`  | opacity 1, **tint fill + wide neon `box-shadow` bloom at peak**, `scaleY(1)` | the bright pop — the "clear!" beat |
| `100%` | opacity 0, bloom expanded and gone, `scaleY(0.85)` | fade out + a slight vertical collapse as the row leaves |

Rationale:
- **Bloom = a stacked neon `box-shadow`** in the tint color (echoing the `.glow` recipe: tight core
  + wide halo), ramped from nothing at `0%` to peak at `35%`, so the row *lights up* before it goes.
  A single-stop fade would read as "row disappears"; the bloom peak is what makes it read as a
  celebratory clear.
- **Fade = `opacity` 1→0** across the tail. Opacity is the compositor-friendly driver and carries
  the "fade" half cleanly regardless of what the paint-heavier bloom does.
- **A slight `scaleY` collapse (1 → 0.85)** adds motion so the fade is not purely a dissolve; it
  hints at the row being removed. `transform` is compositor-friendly. Kept subtle so it never looks
  like a layout shift (the real removal is the consumer's job; this is only the flourish).
- **Front-loaded peak (`35%`)** — the pop should hit fast and the fade should own the majority of
  the timeline, which is what makes a flash feel snappy rather than sluggish.

This is deliberately a *richer* paint than the pure transform/opacity transitions T-004-03-02 owns:
a row clear is a discrete, brief, ≤4-row event where a lush neon bloom is the point (P2, the wow).
Opacity/transform still drive the perceptible motion, so it stays smooth.

## Decision 3 — neutral bright neon tint, tunable via `--flash-tint`

A cleared row spans mixed pieces, so keying the flash to one `--color-piece-*` hue would be
arbitrary. The default tint is a **bright neon-white** — high lightness, low-but-present chroma in
the cyan band so it reads as *neon* white rather than flat white on the near-black canvas
(`oklch(0.97 0.06 200)`). It is exposed as `var(--flash-tint, <default>)` so the consumer (or a
future per-piece flash) can override the hue per call without a new class — the same tunable-knob
pattern the siblings use (`--glow-color`, `--glow-spread-*`). The bloom `box-shadow` and the peak
fill both read `--flash-tint`, so one override retints the whole flash.

## Decision 4 — timing lives in the class, tunable, and plays exactly once

The ticket's value is "a named animation rather than inventing timing per component," so the
duration and easing belong in `.flash`, not the consumer:

```
animation: flash var(--flash-duration, 500ms) var(--flash-ease, ease-out) both;
```

- **`500ms`** — long enough to register the bloom-and-fade, short enough to feel snappy; a row clear
  should not stall the game. Tunable via `--flash-duration`.
- **`ease-out`** — fast attack into the bloom, gentle settle on the fade. Tunable via `--flash-ease`.
- **No iteration count** → defaults to **1** → "plays once" (AC). Explicitly *not* `infinite`.
- **`both` fill mode** — holds the `100%` faded/collapsed end state after the run (and applies `0%`
  before it starts if delayed), so a probe shows a single flash that ends *gone*, not a snap back to
  the start frame. (`forwards` would also hold the end; `both` is chosen so a future `animation-delay`
  consumer also gets the correct pre-start frame.)

## Decision 5 — placement: `@layer components`, appended after the glow block

Same file region and layer as the material utilities, appended immediately after the `.glow` block
and before the base `html, body` rules. The bare `@keyframes flash` sits directly above the
`@layer components { .flash {} }` block (keyframes-then-consumer reads top-down). Keeping the motion
block adjacent to the other E-004 blocks is tidy; the `components` layer position guarantees a
consumer's `animate-*`/other utilities can still compose/override. No interaction with the `@theme`
blocks above.

## Rejected alternatives

- **`@theme { --animate-flash; @keyframes }` (Tailwind idiomatic).** Tree-shaken without a scanned
  `animate-flash` consumer — dead under the no-consumer boundary. Rejected, same reasoning as the
  siblings' `@utility` rejection. (Recorded as the primary rejection because it is the "obvious" v4
  way a reader would reach for.)
- **`@utility flash {…}` with the animation inline.** Still needs a named `@keyframes`, and the
  utility itself tree-shakes without a consumer. Rejected.
- **Looping/pulsing flash (`infinite`).** Directly contradicts the AC's "once." A pulse is a
  different vocabulary item (idle/attention), not a row-clear. Rejected / out of scope.
- **Per-piece flash colors (`.flash-i … .flash-l`).** A cleared row is mixed-piece, so per-piece
  flash is arbitrary and speculative. The single tunable `--flash-tint` covers a future per-call
  hue without seven classes. Rejected as premature (mirrors the siblings deferring speculative
  variants until a real consumer asks).
- **Tokenizing duration/easing as `@theme` values** (`--animate-duration-flash` etc.). Premature —
  one animation, no second consumer asking for a shared motion scale (that is closer to
  T-004-03-02's charter). The inline `var(…, default)` already makes them tunable. Extract only when
  a real second consumer appears (mirrors sibling Decision 5).
- **`filter: brightness()` for the bloom** instead of a tint fill + `box-shadow`. `filter` can spawn
  its own compositing layer and is heavier stacked; the `box-shadow` bloom matches the established
  `.glow` recipe and reads as emission on the dark canvas. Rejected for consistency and cost.

## What the committed change looks like (Structure locks it)

One additive region in `app/globals.css` after the `.glow` block: a doc comment, a bare
`@keyframes flash {…}`, and an `@layer components { .flash {…} }` block. The doc comment records
(a) why not the `@theme --animate-*` path — pointing at the shared tree-shaking lesson — and (b)
that `.flash` referencing `flash` by name is what keeps the keyframes emitted, so the next reader
does not re-derive it.

## Verification approach (Plan sequences it)

1. **Baseline grep** — `flash` absent from source and the built chunk (confirmed in Research).
2. **Emit grep** — after `npm run build`, the chunk contains **both** `@keyframes flash{…}` and a
   `.flash{animation:flash …}` rule, with **no** `flash` reference in `app/`/`components/`/`lib/`.
3. **Visual probe** — a throwaway element with `className="flash"` on the dark canvas plays a single
   neon bloom-then-fade (screenshot), then the probe is reverted.
4. **Gates** — `npm run lint` and `npm run build` exit 0; source diff = `app/globals.css` only.
