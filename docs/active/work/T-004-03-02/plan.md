# Plan — T-004-03-02: sixty-fps-transition-classes

Ordered, independently-verifiable steps. The code change is a single additive block, so the plan is
short; the weight is in the verification recipe, mirroring the three predecessors.

## Testing strategy

- **No unit tests.** The deliverable is CSS; the repo's vitest suite (`npm run test`) covers pure
  `lib/` logic only and is untouched. Adding a test here would test the CSS engine, not our code.
- **Verification is build- + grep- + probe-based**, exactly as T-004-01/02/03-01 did. The three
  legs: (a) the classes **emit** into the production build with **no consumer**, (b) a probe shows a
  transform/opacity change **transitions smoothly** with the defined duration/easing, (c) the
  **gates** (lint, build, boundary) pass.

## Steps

### Step 1 — Baseline (already captured in Research)

`grep -rniE 'transition|motion|will-change' app components lib` → only `lib/rotation.ts` game-logic
hits, no CSS. Confirms the classes are absent before this change, so a post-build grep hit is
attributable to this edit. ✔ done in Research.

### Step 2 — Author the block in `app/globals.css`

Apply the Structure blueprint: append the doc comment + `@layer components { .motion, .motion-fast,
.motion-slow { … } .motion-fast{…} .motion-slow{…} }` region immediately after the `.flash` block
and before the base `html, body` rules. Values: property `transform, opacity`; base duration `150ms`;
fast `90ms`; slow `260ms`; easing `cubic-bezier(0.2, 0, 0, 1)`; knobs `--motion-duration`,
`--motion-ease`. No `will-change`, no `@keyframes`, no `transition: all`.

*Verify:* file reads back with the block correctly placed; the blocks above (`@import`, `:root`,
`@theme` ×2, `.glass`, `.glow*`, `@keyframes flash`, `.flash`) are byte-for-byte unchanged.

### Step 3 — Lint gate

`npm run lint` (`--max-warnings 0`) → exit 0. Catches any CSS the toolchain rejects.

### Step 4 — Production build + emit grep (the core AC check)

`npm run build` → exit 0. Then grep the built CSS chunk under `.next/static/css/`:

- `.motion` rule present with `transition-property:transform,opacity` (minified).
- `.motion-fast` / `.motion-slow` present with their `--motion-duration` overrides (`90ms`/`260ms`
  → may render as `.09s`/`.26s` after minification — accept either form).
- easing `cubic-bezier(.2,0,0,1)` and base duration `150ms`/`.15s` present.

This proves "transition utilities restricted to compositor-friendly properties emit into the
production CSS build" (AC clause 1) with **no consumer**.

### Step 5 — No-consumer grep

`grep -rniE 'motion|transition|will-change' app components lib`, filtered to CSS/class usage → the
only CSS hit is the definition in `app/globals.css`; nothing in `components/`/`lib/`; the
`lib/rotation.ts` hits are unchanged game-logic. Confirms the E-004 boundary held.

### Step 6 — Visual probe (AC clause 2: "animates smoothly … with the defined easing/duration")

A throwaway probe (scratchpad-only, never committed) — options in priority order:

1. **Headless-Chrome pinned frames** (matches the sibling's method): render a page importing the
   built CSS, put a probe `<div class="motion">` with an initial `transform: translateX(0)`, flip to
   `translateX(240px)` + `opacity` change, and screenshot at t=0 / mid / end to show the eased
   interpolation (not an instant jump). Confirms transform+opacity transition with the curve/timing.
2. Fallback: a minimal static HTML file linking the built chunk, opened to eyeball the ease.

The probe verifies smoothness/easing; the grep verifies emission. Revert the probe entirely after.

### Step 7 — Boundary + commit

`git diff --stat -- app components lib` → `app/globals.css` only (the code change). Then commit the
`globals.css` edit **and** the RDSPI artifacts:

```
feat(T-004-03-02): add compositor-only .motion transition utilities (transform/opacity) with tuned duration presets
```

Incremental-commit rule: this is one atomic code change, so one commit. (Predecessors likewise
committed their single additive block once.)

## Verification criteria (definition of done)

- [ ] `.motion` / `.motion-fast` / `.motion-slow` emit into the production build with
      `transition-property: transform, opacity` and the tuned durations/easing (grep-confirmed).
- [ ] No consumer references the classes in `app`(sans globals.css)/`components`/`lib` (grep-confirmed).
- [ ] A probe shows a `transform`/`opacity` change transitioning smoothly with the defined
      easing/duration (screenshot), then reverted.
- [ ] `npm run lint` and `npm run build` exit 0.
- [ ] `git diff --stat -- app components lib` = `app/globals.css` only.
- [ ] `review.md` written summarizing changes, coverage, and open concerns.

## Rollback / fallback

- If the built chunk somehow omits a `@layer components` rule (not expected — proven three times),
  fallback is unchanged from siblings: the rules are already in `@layer components`, which is the
  emit-unconditionally path, so no fallback should be needed. If a bare `.motion` were ever pruned
  (it won't be — no keyframe indirection here, unlike `.flash`), moving the block outside `@layer`
  to top-level plain CSS is the escape hatch. Recorded for completeness only.
- The change is a pure append; `git checkout app/globals.css` fully reverts with zero cross-effects.
