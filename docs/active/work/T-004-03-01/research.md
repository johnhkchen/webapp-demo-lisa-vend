# Research — T-004-03-01: row-clear-flash-keyframes

Descriptive map of the codebase as it bears on adding a row-clear flash `@keyframes` animation and
its utility class to the theme. What exists, where, how it connects, and the constraints. No
solutions proposed here.

## The ticket in one line

Define a named `@keyframes flash` animation (a neon-tinted bloom/fade) and a utility that plays it,
centrally in the theme, so the later line-clear juice consumes a named animation instead of
inventing flash timing per component. AC: a named `flash` keyframes animation **and** its utility
emit into the production CSS build, and applying the class to a throwaway probe element plays the
neon flash-and-fade **once**.

## Where this sits in the epic

E-004 (neon-glass-design-system) authors a reusable neon/glass **theme vocabulary** as pure config
— tokens, glass/glow utilities, keyframes, transitions — and **edits no component or game-loop
file** (a stated HARD BOUNDARY in the epic, not hidden scope). This ticket is the row-clear
**keyframe** slice of that vocabulary. Its story S-004-03 (motion-and-flash-vocabulary) pairs it
with T-004-03-02 (sixty-fps-transition-classes); together they are the motion half of the design
system.

### Direct lineage

- **T-004-01-01 (done, this ticket's `depends_on`)** — defined the seven
  `--color-piece-{i,o,t,s,z,j,l}` neon tokens in an `@theme static` block. Relevant here only as
  the palette the neon tint *may* draw from; a row clear spans mixed pieces, so the flash tint is
  more naturally a neutral bright neon than a single piece hue (see Design).
- **T-004-02-01 (done) `.glass`** and **T-004-02-02 (done) `.glow-*`** — the two most relevant
  precedents. Both solved the same load-bearing problem this ticket faces: *emit a class into the
  production build with no component consumer, under Tailwind v4's tree-shaking.* Their
  `design.md` / `review.md` in `docs/active/work/T-004-02-0{1,2}/` are the authoritative pattern.
  This ticket reuses their settled mechanism and adds the `@keyframes` wrinkle.
- **T-004-03-02 (sibling, not a dependency)** — owns the *GPU-friendly transition* classes.
  Boundary note: the "keep animation on compositor-friendly properties" concern is primarily *its*
  charter. This ticket owns the *flash visual* (a one-shot bloom/fade); it should stay smooth but
  is allowed a richer paint than the pure transform/opacity transitions.

## The single source file: `app/globals.css`

The entire theme lives in one file (`app/globals.css`, ~128 lines). Current top-to-bottom shape:

1. `@import "tailwindcss";` — the Tailwind v4 entry. No `tailwind.config.js`; v4 is CSS-first,
   driven by `@theme` / `@layer` directives in this file.
2. Base-palette doc comment + `:root { --background: #0a0a0f; --foreground: #ededf2; }`.
3. `@theme inline { --color-background; --color-foreground; }` — bridges the base palette into
   `bg-*` / `text-*` utilities (applied to `<body>` in `app/layout.tsx`).
4. `@theme static { --color-piece-i … --color-piece-l; }` — the seven piece hues in `oklch`;
   `static` forces them into the build ahead of any consumer.
5. `@layer components { .glass { … } }` — T-004-02-01 panel material utility.
6. `@layer components { .glow, .glow-i … .glow-l { box-shadow … } .glow-i { --glow-color … } … }` —
   T-004-02-02 per-piece glow utilities.
7. `html, body { height: 100% }` and `body { font-family: system-ui … }` base rules.

The flash block will append into this same file, after the glow block and before the base
`html, body` rules (mirrors how glow appended after glass). No other source file is in scope.

## The load-bearing constraint: Tailwind v4 tree-shaking (proven twice already)

The predecessors established — empirically, in *this* build — the invariant that dominates every
E-004 ticket:

- **`@utility foo {…}`** (a custom functional utility) is **tree-shaken** unless a scanned source
  file (`app/`, `components/`, …) references the class. E-004 forbids that consumer, so a custom
  `@utility` would be **absent** from the production build.
- **`@layer components { .foo {…} }`** content is **emitted unconditionally** (verified by both
  siblings: the rules survive a clean build with the probe deleted) AND sits **below** the
  `utilities` layer, so a consumer's utilities still override individual properties when composed.

The keyframes wrinkle this ticket adds: Tailwind v4's idiomatic animation path is
`@theme { --animate-flash: flash …; @keyframes flash {…} }`, which generates an `animate-flash`
utility. That utility — and its `@keyframes` — are **conditional on `animate-flash` being scanned
in a consumer**, i.e. the *same* tree-shaking trap. Under the no-consumer boundary that path is
dead on arrival, exactly as `@utility` was for glass/glow. (Design confirms and rejects it.)

The open empirical question for Implement: does a **bare top-level `@keyframes flash`** (written as
plain CSS, outside `@theme`) survive to the production build, and is it kept reachable by an
always-emitted `.flash` rule that references it by name? The predecessors did not exercise
`@keyframes` (both are `box-shadow`/material only), so this is the one genuinely new thing to verify
here. Lightning CSS (Tailwind v4's minifier) does not prune `@keyframes` that are referenced by an
`animation`/`animation-name` declaration; an always-present `.flash { animation: flash … }` rule in
`@layer components` should keep `flash` referenced and therefore emitted. This is the hypothesis
Plan/Implement will confirm by grep on the built chunk.

## Build / verification surface

- **Build output:** `npm run build` emits a hashed CSS chunk under `.next/static/chunks/*.css`
  (currently `.next/static/chunks/40o9oenfbm17p.css`). Grepping that chunk for `flash` /
  `@keyframes` is the objective "emits into the production CSS build" check.
- **Baseline (confirmed):** `grep -rni flash app components lib` → **no matches**; the built chunk
  contains **no** `flash`. So any post-change match is attributable to this ticket (the
  absent-at-baseline contrast the AC leans on).
- **Gates:** `npm run lint` runs `eslint --max-warnings 0` (a stray probe file must not linger under
  lint scope); `npm run build` must exit 0. `npm test` runs `vitest run` but covers `lib/` pure
  logic only — **there is no unit-test surface for CSS**, matching both predecessors.
- **Visual check:** a throwaway route/element under `app/` with `className="flash"` on the dark
  canvas, observed once (screenshot), then reverted — the "plays the neon flash-and-fade once" half
  of the AC. Probe must use a *literal* class name (no dynamic class assembly) so nothing depends on
  Tailwind's extractor.

## Assumptions & constraints surfaced

1. **No consumer, by design.** The flash class renders nothing in the running app until the
   line-clear juice (a later render/loop epic) applies it. "Not visible in the app" is not a defect.
2. **"Plays once"** is explicit in the AC → the animation must **not** loop
   (`animation-iteration-count: 1`, the default) and should hold its faded end state
   (`animation-fill-mode`), so a probe shows a single flash-and-fade, not a repeating pulse.
3. **Neon-tinted** is the visual requirement; the tint spans a cleared (mixed-piece) row, so a
   neutral bright neon (not one piece hue) is the natural default — Design decides, and should keep
   it tunable via a custom property (mirrors the siblings' `var(--x, default)` knobs).
4. **Boundary:** only `app/globals.css` (+ `docs/active/work/T-004-03-01/*`) may change. No
   `components/`, `lib/`, `app/layout.tsx`, `app/page.tsx`, or config edits.
5. **Shared file with three prior E-004 blocks.** The change is a self-fenced append after the glow
   block; Lisa's commit lock serializes if anything lands concurrently (append-order rebase is the
   worst case). All three predecessors are already committed, so a clean append is expected.
6. **Duration/easing are timing the later juice will consume by name** — the ticket context frames
   the value as "a named animation rather than inventing timing per component," so the duration and
   easing should live in the class (tunable), not be left to the consumer.
