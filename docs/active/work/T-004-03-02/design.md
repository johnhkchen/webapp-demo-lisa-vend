# Design — T-004-03-02: sixty-fps-transition-classes

Decide *how* to author the compositor-friendly transition vocabulary. Options weighed against the
Research reality (Tailwind v4 tree-shaking, the no-consumer boundary, the `.glass`/`.glow`/`.flash`
house style, the compositor-property restriction, and the `will-change` footgun). One chosen per
decision; rejections recorded.

## The decision that is already settled: emit with no consumer, in `@layer components`

Research re-established the invariant three shipped tickets proved in this exact build: `@utility`
and Tailwind v4's `@theme`-generated utilities are **tree-shaken** without a scanned consumer, while
`@layer components { .foo {} }` emits **unconditionally** and sits **below** the `utilities` layer.
E-004 forbids a consumer. So the class mechanism is **not an open question** — the transition
classes go in `@layer components`, exactly as `.glass`/`.glow`/`.flash` did. This removes the only
structural risk; every decision below is about the *content* of the classes.

## Decision 1 — the core is a `transition-property` restricted to `transform, opacity` (chosen)

The 60fps guarantee is not a duration or an easing — it is *which properties are allowed to
transition*. `transform` and `opacity` are the only two broadly compositor-only properties (GPU,
no layout, no paint). So the core class is precisely:

```
transition-property: transform, opacity;
transition-duration: var(--motion-duration, <tuned>);
transition-timing-function: var(--motion-ease, <tuned>);
```

Restricting `transition-property` to exactly those two is what makes *any* element wearing the class
safe to animate at 60fps: even if a consumer also changes a paint/layout property in the same state
flip, only `transform`/`opacity` will *transition* — the rest snap, never reflow-animate. That
restriction IS the deliverable. Rejected alternative: `transition: all …` (the naive default) —
`all` transitions layout/paint properties too and is the exact 60fps footgun this class exists to
prevent. Rejected hard.

## Decision 2 — a curated set: `.motion` + `.motion-fast` / `.motion-slow`, shared geometry (chosen)

The ticket says "tuned duration**s**/easing" and the epic says "transition class**es**" — movement
and state changes want different speeds (a piece nudge should be near-instant; a panel/overlay
settle can be softer). Options:

- **A. One class, one duration, tunable only via `--motion-duration`.** Minimal, but every consumer
  wanting a different speed must hand-set the var — pushing exactly the "per-component tuning" this
  ticket exists to remove back onto the consumer for the most common axis (speed).
- **B. One core `.motion` + two preset variants `.motion-fast` / `.motion-slow` that ONLY override
  `--motion-duration` on the shared geometry (chosen).** Mirrors the `.glow`/`.glow-{piece}` idiom
  exactly: the `transition-property`/duration/easing declarations are written ONCE on a grouped
  selector `.motion, .motion-fast, .motion-slow`; the variants each set just `--motion-duration`.
  Zero duplication, three named speeds out of the box, still fully tunable via the vars.
- **C. A full `@theme` duration/easing scale** (`--transition-duration-fast` … as design tokens).
  Broad speculative surface with no second consumer asking for a shared scale — the predecessors
  explicitly rejected this shape ("extract only when a real consumer appears"). Premature.

**Chosen: B.** It matches the house style beat-for-beat (shared geometry, variants set one var),
delivers the "tuned durations" the ticket names as three ready-to-apply classes, and stays curated
rather than speculative. Three presets — fast/base/slow — is the smallest set that covers "snappy
piece movement" vs. "default" vs. "softer state settle" without inventing a taxonomy.

## Decision 3 — tuned values for game motion

Grounded in what the classes animate (Tetris piece movement + panel/overlay state changes) and the
sibling `.flash`'s `500ms`/`ease-out` frame of reference:

| Class | `--motion-duration` | Rationale |
|---|---|---|
| `.motion-fast` | **90ms** | Piece shift/rotate/soft-drop — must feel instant and keep up with rapid key repeats; long enough to smooth the step, short enough to never lag input. |
| `.motion` (base) | **150ms** | The general default — perceptible-but-brisk; the go-to for most movement/state transitions. |
| `.motion-slow` | **260ms** | Panel/overlay appear, hold/next-preview swaps — a softer settle where a touch more ease reads as polish, still well under the `.flash` 500ms event. |

**Easing — `--motion-ease` default `cubic-bezier(0.2, 0, 0, 1)`** (a "standard/decelerate" curve:
fast attack, gentle settle). It reads as responsive-then-smooth for both a piece landing and a panel
easing in, and is a well-worn UI-motion default. Exposed as a var so a consumer can swap to
`linear`/`ease-in-out`/a bespoke curve per call. All three classes share this easing; only duration
varies by preset (the axis that actually differs between motion kinds). A consumer needing a
different easing sets `--motion-ease` on the element — no new class.

## Decision 4 — `will-change`: excluded from the classes, documented, offered as opt-in nothing (chosen)

Research flagged `will-change` as a footgun: baked into a static utility it permanently pins a GPU
layer per element, inflating memory and sometimes *hurting* perf — the opposite of the 60fps intent.
Options:

- **A. Bake `will-change: transform` into `.motion`.** Rejected — a shared class applied broadly
  would leave every element permanently layer-promoted. Directly self-defeating at scale.
- **B. Ship a separate opt-in `.will-animate { will-change: transform, opacity }`.** Plausible, but
  `will-change` is only correct applied *transiently* right before an animation and removed after —
  that is per-call, imperative, render-epic behavior, and there is no consumer yet to wire the
  add/remove lifecycle. Shipping a static class invites exactly the misuse (leave it on) that makes
  it harmful. Speculative under the no-consumer boundary; the predecessors' "no speculative variant"
  rule applies.
- **C. Exclude `will-change` entirely; document why in the block comment (chosen).** The
  `transition-property: transform, opacity` restriction already delivers the compositor-only 60fps
  guarantee with *zero* cost. `will-change` is a situational micro-opt the consuming render epic can
  apply transiently if a specific animation needs first-frame smoothing — it is not part of a
  reusable, always-on vocabulary. Recording the reasoning in the doc comment prevents a future
  author from "helpfully" adding it to the shared class.

**Chosen: C.** Smallest correct surface; avoids shipping a footgun; the property restriction is the
real guarantee. This is called out explicitly so "why no `will-change`?" is answered in-file.

## Decision 5 — transitions, not `@keyframes` (scope boundary with the sibling)

This ticket owns **transitions** (state-flip A→B interpolation applied by a class); the sibling
T-004-03-01 owns the **`@keyframes flash`** animation. They are complementary vocabulary items, not
overlapping: `.motion*` interpolate whatever transform/opacity a consumer flips between (a piece
moving one cell, a panel fading in); `.flash` plays a fixed self-contained row-clear keyframe. No
`@keyframes` here — that keeps the two blocks cleanly separated and avoids re-treading the
keyframe-tree-shaking ground the sibling already settled.

## Decision 6 — placement: `@layer components`, appended after `.flash`

Same file, same layer, same append discipline as all three predecessors: a doc comment + one
`@layer components` block, inserted after the `.flash` block and before the base `html, body` rules.
No interaction with the `@theme` blocks or the sibling motion block above it. The `components`-layer
position guarantees a future consumer's Tailwind `transition-*`/`duration-*`/`ease-*` utilities can
still override individual properties by composing on top.

## Rejected alternatives (summary)

- **`transition: all …`** — transitions layout/paint too; the exact footgun this class prevents.
- **`@utility motion { … }` / `@theme { --transition-* }`** — tree-shaken without a scanned consumer
  under the no-consumer boundary; dead on arrival (same trap `.glass`/`.glow`/`.flash` rejected).
- **One class only (no presets)** — pushes speed tuning (the most common axis) back onto every
  consumer, re-creating the per-component tuning the ticket removes.
- **Full `@theme` duration/easing token scale** — broad speculative surface, no second consumer;
  premature per the predecessors' extract-on-demand rule.
- **`will-change` in the shared class** — permanent layer promotion; self-defeating at scale.
- **A shipped `.will-animate` opt-in** — `will-change` is transient/per-call; a static class invites
  the leave-it-on misuse; speculative with no lifecycle consumer.

## What the committed change looks like (Structure locks it)

One additive region in `app/globals.css` after `.flash`: a doc comment (records why
`@layer components` not `@utility`, the `transform, opacity` 60fps rationale, the knobs, and the
deliberate `will-change` exclusion) + one `@layer components` block with a grouped
`.motion, .motion-fast, .motion-slow` geometry rule and two one-line duration-override variants.
