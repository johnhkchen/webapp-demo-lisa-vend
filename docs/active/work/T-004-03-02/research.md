# Research — T-004-03-02: sixty-fps-transition-classes

Map the terrain for authoring GPU-friendly transition utility classes. Descriptive only — what
exists, where, and the constraints this ticket inherits. No solution proposed here.

## The ask

Author transition/animation utility classes restricted to compositor-friendly properties
(`transform`/`opacity`), with tuned durations/easing, so movement (piece shift/drop/rotate) and
state changes (panel/overlay appear) animate at 60fps by *applying a class* rather than each
component re-tuning its own `transition` declaration. This is the last slice of story S-004-03
(`motion-and-flash-vocabulary`) and the fifth and final vocabulary item of epic E-004
(`neon-glass-design-system`): tokens → glass → glow → flash keyframes → **transition classes**.

## Where this lives

The entire E-004 vocabulary lives in **one file**: `app/globals.css`. There is no Tailwind config
file — this is Tailwind v4, configured CSS-first via `@import "tailwindcss"` + `@theme` blocks
directly in `globals.css`. `postcss.config.mjs` wires `@tailwindcss/postcss`; that is the whole
build surface for CSS. The file today, top to bottom:

- `@import "tailwindcss";`
- `:root { --background; --foreground }` + `@theme inline` bridge → `bg-background`/`text-foreground`
- `@theme static { --color-piece-i … --color-piece-l }` — seven neon piece tokens (T-004-01-*)
- `@layer components { .glass { … } }` — glassmorphic panel material (T-004-02-*)
- `@layer components { .glow, .glow-i … .glow-l { … } }` — neon bloom, shared geometry + per-piece
  `--glow-color` override (T-004-02-*)
- bare `@keyframes flash { … }` + `@layer components { .flash { … } }` — row-clear flash (T-004-03-01)
- base `html, body { height: 100% }` + `body { font-family }`

This ticket appends **one more region** in the same file, after `.flash` and before the base
`html, body` rules — the same append discipline every predecessor followed.

## The load-bearing constraint: emit with NO consumer (proven three times)

E-004 has a **HARD BOUNDARY** (epic text, not hidden scope): this epic defines classes/tokens ONLY
and edits **no** `components/` or `lib/` or app-tick file. Applying these classes to Board/Cell/
panels is a later render/loop epic's job. That boundary collides with a Tailwind v4 behavior that
every predecessor documented and worked around:

- **Tailwind v4 tree-shakes `@utility` classes and `@theme`-generated utilities** (including the
  `@theme { --animate-*; @keyframes }` animation path) when **no scanned source references the
  class**. With no component consumer allowed, any such utility silently vanishes from the
  production build.
- **`@layer components { .foo { … } }` emits unconditionally** — it is not gated on a scanned
  consumer — AND sits **below** the `utilities` layer in the cascade, so when a consumer eventually
  applies Tailwind utilities they still override individual properties of the component-layer class.

Consequence for this ticket: the transition classes MUST be authored in `@layer components`, exactly
as `.glass`, `.glow-*`, and `.flash` were. The idiomatic-looking `@utility motion { … }` or
`@theme { --transition-* }` paths are dead on arrival under the no-consumer boundary. This is not a
hypothesis — it is the settled invariant of three shipped tickets (commits for `.glass`/`.glow`/
`.flash`), recorded in doc comments in `globals.css` and in each predecessor's `review.md`.

## The established authoring idiom (what to mirror)

The three shipped blocks converge on a house style this ticket should match:

1. **`@layer components`** for every class (tree-shake survival, above).
2. **Shared geometry on a grouped selector, variants only set a CSS var.** `.glow, .glow-i … .glow-l`
   write the 3-layer `box-shadow` ONCE reading `var(--glow-color, currentColor)`; each `.glow-{piece}`
   only sets `--glow-color`. Zero duplication; retuning the shared rule retunes all variants.
3. **Every knob is `var(--name, default)`.** `--glow-color`, `--glow-spread-N`, `--flash-tint`,
   `--flash-duration`, `--flash-ease`, `--flash-bloom-N`. A consumer retunes per call without a new
   class. Defaults are baked so the bare class is useful with zero configuration.
4. **A doc comment above each block** records *why* `@layer components` (not `@utility`), what the
   knobs are, and any non-obvious decision, so the next author does not re-derive it.
5. **No speculative variants.** Predecessors explicitly rejected per-piece flash colors and a
   `@theme` motion/duration scale as premature — "extract only when a real second consumer appears."
   Curated, minimal, tunable beats a broad speculative surface.

## Compositor-friendly properties (the 60fps substance)

The "60fps" in the title is not decoration — it is a concrete property restriction. Browser rendering
has three stages: **layout** (geometry) → **paint** (pixels) → **composite** (GPU layer assembly).

- Animating `transform` and `opacity` can be done by the **compositor alone** — no layout, no paint —
  so they run on the GPU and hit 60fps even under main-thread load. These are the *only* two broadly
  compositor-only properties.
- Animating `width`/`height`/`top`/`left`/`margin` triggers **layout** every frame (reflow);
  `background`/`color`/`box-shadow` trigger **paint**. Both are main-thread and drop frames.

So a "60fps transition class" is, precisely, a transition whose `transition-property` is restricted
to `transform, opacity`. That restriction IS the deliverable's guarantee. Note the sibling `.flash`
*does* paint (`background-color`/`box-shadow` animate) — deliberately, because a row clear is a
discrete ≤4-row event where the lush bloom is the point (its review flags this and hands the
"pure compositor-friendly transitions" charter explicitly to THIS ticket).

## `will-change` — a known footgun to reckon with (not obviously in scope)

`will-change: transform` hints the browser to pre-promote an element to its own compositor layer.
Applied *transiently* right before an animation it can smooth the first frame; applied
**permanently via a static utility class** it is an anti-pattern — it keeps a GPU layer alive for
every element forever, inflating memory and sometimes *hurting* performance. Whether to expose it,
and how, is a real design question (Design must decide), because a naive `.motion { will-change }`
would violate its own 60fps intent at scale. The `transition-property` restriction, by contrast, is
pure upside with no cost.

## Verification surface (how predecessors proved "emits, renders")

No unit tests apply — the deliverable is CSS; the repo's vitest suite (`lib/*.test.ts`, run via
`npm run test`) covers pure game logic only and is untouched here. The proven verification recipe:

- **Baseline grep** — the class/property is absent from source and the built CSS chunk (confirmed:
  `grep -rniE 'transition|motion|will-change' app components lib` returns only game-logic hits in
  `lib/rotation.ts`, nothing CSS).
- **Emit grep** — after `npm run build`, the built chunk under `.next/` contains the class rule.
- **No-consumer grep** — no reference to the class in `app/`/`components/`/`lib/`.
- **Visual probe** — a throwaway element toggling a transform/opacity change with the class plays a
  smooth transition (screenshot / pinned frames), then the probe is reverted.
- **Gates** — `npm run lint` (`--max-warnings 0`) and `npm run build` exit 0; `git diff --stat` over
  `app components lib` shows only `app/globals.css`.

## Constraints & assumptions carried into Design

- **One file, additive.** Only `app/globals.css`, appended after `.flash`. No config, no component.
- **`@layer components` is mandatory**, not a choice — the no-consumer boundary forces it.
- **`transition-property: transform, opacity`** is the non-negotiable core (the 60fps guarantee).
- **Tunable via `var(--…, default)`**, curated not speculative — match the house style.
- **`depends_on: [T-001-02-01]`** (Tailwind wired) is satisfied (`phase: done`); the three E-004
  siblings that share the file are all committed, so this is a clean append with no live conflict.
- Open question for Design: exactly which classes (one core vs. a small duration scale), the default
  duration/easing values tuned for game motion, and whether/how to expose `will-change`.
