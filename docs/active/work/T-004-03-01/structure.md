# Structure — T-004-03-01: row-clear-flash-keyframes

The blueprint: exact file-level changes, the shape of the block, its placement, and the invariants
that must hold. Not code prose — the shape the Implement phase fills in.

## Files

### Modified — `app/globals.css` (the only source change)

One additive region appended **after** the existing `.glow` `@layer components` block and **before**
the `html, body { height: 100% }` base rule. Nothing above it changes: `@import`, `:root`,
`@theme inline`, `@theme static` (piece tokens), `.glass`, and `.glow-*` are all untouched.

The region is two adjacent pieces, in this order (keyframes first so the reader sees the animation
before the class that plays it):

1. A doc comment (why top-level `@keyframes` + `@layer components`, not the `@theme --animate-*`
   path; and that `.flash` referencing `flash` is what keeps the keyframes emitted).
2. A **bare, top-level `@keyframes flash { … }`** (plain CSS, outside `@theme`).
3. An **`@layer components { .flash { animation: flash … } }`** block.

Resulting top-to-bottom file order:

1. `@import "tailwindcss";`
2. base-palette doc comment + `:root { --background; --foreground; }`
3. `@theme inline { … }` — background/foreground bridge
4. `@theme static { --color-piece-* }` — the seven piece tokens
5. `@layer components { .glass { … } }` — T-004-02-01
6. `@layer components { .glow, .glow-* { … } }` — T-004-02-02
7. **NEW** doc comment + `@keyframes flash { … }` + `@layer components { .flash { … } }` — this ticket
8. `html, body { height: 100% }` and `body { font-family }` — base rules

### Added — `docs/active/work/T-004-03-01/*.md`

RDSPI artifacts: `research.md`, `design.md`, `structure.md`, `plan.md`, `progress.md`, `review.md`.

### Explicitly NOT touched (epic hard boundary)

`components/Board.tsx`, `components/Cell.tsx`, `lib/**`, `app/layout.tsx`, `app/page.tsx`, and all
config files (`postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`, `next.config.ts`,
`package.json`). No consumer of `.flash` is added anywhere.

## The block (shape to implement)

```css
/*
 * Row-clear flash animation (E-004). A named `@keyframes flash` (neon-tinted bloom → fade + slight
 * collapse) plus a `.flash` utility that plays it ONCE. The later line-clear juice applies `.flash`
 * to cleared rows and gets consistent timing, instead of hand-rolling a keyframe per component.
 *
 * Two decisions worth not re-deriving:
 *  - NOT `@theme { --animate-flash; @keyframes }`: that path tree-shakes both the `animate-flash`
 *    utility and its keyframes unless a scanned source uses the class, and E-004 forbids a consumer
 *    (same trap `.glass`/`.glow`/the tokens hit). So the keyframes are bare top-level CSS and the
 *    class lives in `@layer components`, which emits unconditionally and sits below `utilities`.
 *  - `.flash` sets `animation: flash …`, i.e. it REFERENCES `flash` by name — that reference is
 *    what keeps the `@keyframes` reachable/emitted even under unused-keyframe pruning.
 * Tint/duration/easing are `var(--flash-*, default)` so a consumer can retint/retimes per call
 * without a new class; a cleared row is mixed-piece, so the default tint is a neutral bright neon.
 */
@keyframes flash {
  0% {
    opacity: 1;
    transform: scaleY(1);
    background-color: var(--flash-tint, oklch(0.97 0.06 200));
    box-shadow: 0 0 0 0 transparent;
  }
  35% {
    opacity: 1;
    transform: scaleY(1);
    background-color: var(--flash-tint, oklch(0.97 0.06 200));
    box-shadow:
      0 0 var(--flash-bloom-1, 8px)  var(--flash-tint, oklch(0.97 0.06 200)),
      0 0 var(--flash-bloom-2, 28px) var(--flash-tint, oklch(0.97 0.06 200));
  }
  100% {
    opacity: 0;
    transform: scaleY(0.85);
    box-shadow: 0 0 var(--flash-bloom-2, 28px) transparent;
  }
}

@layer components {
  .flash {
    animation: flash var(--flash-duration, 500ms) var(--flash-ease, ease-out) both;
  }
}
```

## Public interface (what consumers get)

- **`.flash`** — apply to a cleared-row element to play the neon bloom-and-fade **once**. Timing and
  tint are baked in; no per-component keyframe authoring. Intended first consumer: the line-clear
  juice in a later render/loop epic (not now).
- **Tuning knobs (optional, no new class):**
  - `--flash-tint` — the neon hue of the peak fill + bloom (default neutral bright neon).
  - `--flash-duration` — total run length (default `500ms`).
  - `--flash-ease` — the timing function (default `ease-out`).
  - `--flash-bloom-1` / `--flash-bloom-2` — the two bloom blur radii (defaults `8px` / `28px`).
  Defaults stand alone, so every knob is opt-in.

## Internal organization

- **Keyframes then class.** `@keyframes flash` is written first (bare, top level), then the
  `@layer components { .flash }` that plays it — reads top-down, and keeps the keyframes lexically
  next to their only referencer.
- **No `@theme` changes** — flash consumes/opts-in to custom properties but defines none in the
  theme; all knobs are `var(--x, default)` with inline defaults.
- **Self-fenced** — the whole region is bracketed by its doc comment; independent of the `.glow`
  block above it, so append/rebase against the siblings is trivial.

## Invariants (must hold after the change)

1. **Both halves emit with no consumer.** After `npm run build`, `.next/static/chunks/*.css`
   contains **`@keyframes flash{…}`** AND a **`.flash{animation:flash …}`** rule, with **no**
   `flash` reference in `app/`, `components/`, or `lib/` source.
2. **Plays once.** No `infinite` / no iteration-count > 1; `.flash` relies on the default count of 1
   and uses `both` fill so it ends on the faded/collapsed frame.
3. **Neon-tinted bloom + fade.** The keyframes ramp a neon `box-shadow` bloom to a mid-timeline peak
   and fade `opacity` 1→0 with a slight `scaleY` collapse.
4. **Tunable, references no piece-hue literal for its default in a per-piece way.** All knobs are
   `var(--flash-*, default)`; the default tint is a single neutral neon value, not a copied
   `--color-piece-*` (a row clear is mixed-piece).
5. **Boundary held.** `git diff --stat` source scope = `app/globals.css` only (+ `work/` artifacts).
6. **Gates green.** `npm run lint` (`--max-warnings 0`) and `npm run build` exit 0.
7. **Do not move to `@theme --animate-*` / `@utility`** without a consumer or `@source inline(...)`
   safelist — it will silently drop from the build. (Doc comment states this; same invariant as the
   siblings.)

## Ordering of changes

Single-step and additive: append the doc comment + `@keyframes` + `@layer components` block, rebuild,
grep for both halves, probe, revert probe, commit. No multi-file sequencing. The only ordering that
matters is *append after the `.glow` block* (placement), fixed above. If the bare `@keyframes` is
unexpectedly pruned from the build (not anticipated), the fallback (Plan) is to nest it in a
`@theme static { @keyframes flash {…} }` block — recorded there, not applied preemptively.
