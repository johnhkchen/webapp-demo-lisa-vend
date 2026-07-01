# Review — T-004-03-01: row-clear-flash-keyframes

Handoff document. What changed, how it was verified, and what a reviewer needs to know without
reading every diff.

## Outcome

A named row-clear **`@keyframes flash`** animation (a neon-tinted bloom that peaks then fades with a
slight vertical collapse) plus a **`.flash`** utility that plays it **once** now live in the theme as
**pure config**, with **no** component or logic edits. The later line-clear juice applies **one**
class (`.flash`) to cleared rows and gets consistent, centrally-defined timing, instead of
hand-rolling a keyframe and its durations per component.

**Acceptance criterion met:** the named `@keyframes flash` animation **and** its `.flash` utility
both emit into the production CSS build (grep-verified present; absent at baseline) with no consumer,
and a throwaway probe played the neon flash-and-fade a single time (verified by pinned-frame
screenshot: bright fill → bloom peak → faded/collapsed end, no loop).

Committed as `f44ea9a`.

## What changed

### Modified
- **`app/globals.css`** — one added doc comment + a bare top-level `@keyframes flash { … }` + an
  `@layer components { .flash { … } }` block, placed after the `.glow` block and before the base
  `html, body` rules (`+43` lines, no deletions). Everything above — the `@import`, `:root` palette,
  `@theme inline` bridge, `@theme static` piece tokens, `.glass`, and `.glow-*` blocks — is untouched.

### Added
- `docs/active/work/T-004-03-01/{research,design,structure,plan,progress,review}.md` — RDSPI
  artifacts.

### Not touched (deliberately — E-004 hard boundary)
- `components/Board.tsx`, `components/Cell.tsx`, `lib/**`, `app/layout.tsx`, `app/page.tsx`, and all
  config files. Applying `.flash` to real cleared rows is the later render/loop epic's scope.

## The deliverable

```css
@keyframes flash {
  0%   { opacity: 1; transform: scaleY(1);    background-color: var(--flash-tint, oklch(0.97 0.06 200)); box-shadow: 0 0 0 0 transparent; }
  35%  { opacity: 1; transform: scaleY(1);    background-color: var(--flash-tint, …);
         box-shadow: 0 0 var(--flash-bloom-1, 8px) var(--flash-tint, …), 0 0 var(--flash-bloom-2, 28px) var(--flash-tint, …); }
  100% { opacity: 0; transform: scaleY(0.85); box-shadow: 0 0 var(--flash-bloom-2, 28px) transparent; }
}
@layer components {
  .flash { animation: flash var(--flash-duration, 500ms) var(--flash-ease, ease-out) both; }
}
```

**Shape (the design's core idea):** a fast attack into a bright neon **bloom peak at 35%**, then the
majority of the timeline is an `opacity` 1→0 **fade** plus a subtle `scaleY(0.85)` **collapse** — so
a cleared row reads as a celebratory pop that then leaves, not a plain dissolve. Timing, tint, and
bloom radii are all `var(--flash-*, default)` knobs, so a consumer can retint/retime per call without
a new class (mirrors the siblings' `--glow-*` knobs). Default tint is a **neutral bright neon** (not a
`--color-piece-*` hue) because a cleared row spans mixed pieces.

## Why bare `@keyframes` + `@layer components`, not `@theme { --animate-flash }` (load-bearing)

Tailwind v4's idiomatic animation path — `@theme { --animate-flash: flash …; @keyframes flash {…} }`
— generates an `animate-flash` utility, but that utility **and** its keyframes are **tree-shaken**
unless a scanned source references the class. E-004 forbids any component consumer, so that path is
dead on arrival — the exact trap `.glass`/`.glow`/the piece tokens already hit and rejected `@utility`
for. So instead:
- the **keyframes** are written as **bare top-level CSS** (not a Tailwind-generated artifact, so not
  subject to `animate-*` gating), and
- the **class** lives in `@layer components`, which emits **unconditionally** and sits **below** the
  `utilities` layer (so a consumer's `animate-*`/other utilities still compose/override).

The keystone: `.flash` sets `animation: flash …`, i.e. it **references `flash` by name**, which keeps
the keyframes reachable/emitted even under any unused-keyframe pruning. This ticket is the first
E-004 slice to exercise `@keyframes`, and the build confirmed the hypothesis: a bare top-level
`@keyframes` survives, kept alive by the always-emitted `.flash`. The doc comment in `globals.css`
records this so the next reader does not re-derive it.

## Verification

| Check | Command | Result |
|---|---|---|
| Absent at baseline | build + grep chunk / source for `flash` | **0 matches** |
| Keyframes emit, no consumer | `npm run build` + grep chunk | `@keyframes flash{0%{…}35%{…}to{…}}` **present** |
| Utility emits, no consumer | grep chunk | `.flash{animation:flash var(--flash-duration,.5s) var(--flash-ease,ease-out) both}` **present** |
| References knobs, tunable | grep emitted rule | tint/duration/easing/bloom all resolve `var(--flash-*, default)` |
| No consumer in source | `grep -rn flash app components lib` | only the `globals.css` definition |
| Renders correctly + plays once | headless-Chrome pinned-frame screenshot | t=0 bright fill / t=175ms bloom peak / t=499ms faded + collapsed; single play, no loop; probe was scratchpad-only |
| Lint clean | `npm run lint` (`--max-warnings 0`) | exit 0 |
| Production build | `npm run build` | exit 0 |
| Boundary held | `git diff --stat -- app components lib` | only `app/globals.css` (+43) |

No unit tests apply — the deliverable is CSS; the repo's vitest suite covers `lib/` logic only.
Verification is build-, grep-, and screenshot-based, matching the AC and all three predecessor
tickets.

## Open concerns / notes for downstream

1. **No consumer yet, by design.** `.flash` animates nothing in the running app until a component
   applies it. Correct for E-004's theme-only mandate — do not read "not visible in the app" as a
   defect. Intended first consumer: the line-clear juice applying `.flash` to cleared-row cells/rows
   in a later render/loop epic.
2. **Do not convert to `@theme { --animate-flash }` / `@utility`** without a consumer or a
   `@source inline("flash")` safelist — both the utility and its keyframes will silently drop from
   the production build. Same invariant as `.glass`/`.glow`; the doc comment states it.
3. **The `.flash` background/bloom paint is intentionally richer than a compositor-only transition.**
   A row clear is a discrete, brief (≤4-row) event where a lush neon bloom is the point (P2). Opacity
   and transform still drive the perceptible motion, but `background-color`/`box-shadow` do animate.
   If the render epic ever stacks many simultaneous flashes and sees jank, dial the bloom down via
   `--flash-bloom-*` or shorten `--flash-duration` per call — no class change needed. The pure
   compositor-friendly transitions are T-004-03-02's charter, not this one.
4. **`.flash` sets `background-color` during the animation.** On a real cell that already has a
   `bg-piece-*` fill, the flash's tint fill will override the piece color *for the duration of the
   flash* (that is the intended "light up white then leave" effect). If a consumer instead wants the
   piece hue to bloom (keep the piece color, only add the halo), it should override `--flash-tint`
   to that piece token, or the render epic can apply a glow-only variant — flagged so the consumer
   chooses deliberately rather than being surprised.
5. **`both` fill mode holds the faded end frame.** After one run the element stays at
   `opacity: 0; scaleY(0.85)`. The consumer is expected to remove the row (or the `.flash` class)
   once the animation ends (`animationend`), so the element does not linger invisible. Noted so the
   consumer wires cleanup rather than assuming the element springs back.
6. **Wide-gamut duplication in the build is expected.** Lightning CSS emits the `@keyframes` twice —
   an sRGB fallback (`#d3ffff`) and a `lab(...)` wide-gamut version — the same gamut-fallback
   behavior `.glass`'s `color-mix` produced. Not a defect; the two are a `@supports`-style pair.
7. **Shared file with three prior E-004 blocks.** The region is self-fenced and appended after
   `.glow`; all three predecessors were already committed, so this was a clean append. Lisa's commit
   lock serializes if anything lands concurrently (append-order rebase is the worst case).

## Bottom line

Smallest correct change: one additive doc comment + `@keyframes` + `@layer components` block, fully
verified (grep for both halves + a pinned-frame screenshot showing bloom→fade playing once),
boundary-clean, and tunable. This completes the flash half of story S-004-03; T-004-03-02
(sixty-fps-transition-classes) is the remaining sibling. Ready for the render/loop epic that applies
`.flash` to real cleared rows.
