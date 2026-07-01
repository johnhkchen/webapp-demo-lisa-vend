# Review — T-004-02-02: neon-glow-shadow-utilities

Handoff document. What changed, how it was verified, and what a reviewer needs to know without
reading every diff.

## Outcome

Seven per-piece neon **glow utilities** (`.glow-i … .glow-l`) plus a generic `.glow` accent now
live in the Tailwind theme layer as **pure config**, with **no** component or logic edits. Any
future filled cell or accent gets a neon halo in its piece's signature hue by applying **one**
class, instead of re-deriving `box-shadow` bloom values per component. Each glow references the
`--color-piece-*` token by name, so the halo tracks the palette if a hue is ever retuned.

**Acceptance criterion met:** the glow utilities emit into the production CSS build (grep-verified
present; absent at baseline) with no consumer, and a throwaway probe rendered a colored neon bloom
matching each piece's hue.

Committed as `30f5daf`.

## What changed

### Modified
- **`app/globals.css`** — one added doc comment + `@layer components { … }` block, placed after
  the `.glass` block and before the base `html, body` rules. Nothing above changed: the
  `@import`, `:root` palette, `@theme inline` bridge, `@theme static` piece tokens, and `.glass`
  block are untouched.

### Added
- `docs/active/work/T-004-02-02/{research,design,structure,plan,progress,review}.md` — RDSPI
  artifacts.

### Not touched (deliberately — E-004 hard boundary)
- `components/Board.tsx`, `components/Cell.tsx`, `lib/**`, `app/layout.tsx`, `app/page.tsx`, and all
  config files. Applying `.glow-*` to a real `Cell` is a later rendering epic's scope, not this one.

## The utilities

```css
@layer components {
  .glow, .glow-i, .glow-o, .glow-t, .glow-s, .glow-z, .glow-j, .glow-l {
    box-shadow:
      0 0 var(--glow-spread-1, 4px)  var(--glow-color, currentColor),
      0 0 var(--glow-spread-2, 12px) var(--glow-color, currentColor),
      0 0 var(--glow-spread-3, 24px) var(--glow-color, currentColor);
  }
  .glow-i { --glow-color: var(--color-piece-i); }   /* … through .glow-l */
}
```

**Shape (the design's core idea):** the 3-layer, 0-offset bloom geometry is written **once** on a
grouped selector reading `var(--glow-color, currentColor)`; each `.glow-{piece}` only sets
`--glow-color` to its token. So `.glow-t` used **alone** yields a purple bloom (single-class
ergonomics) while the geometry is never duplicated. A bare `.glow` blooms in `currentColor` for
non-piece accents. Spreads are `var(--glow-spread-N, default)`, so intensity is tunable per-call
(via `style`/utility) without a new class — defaults stand alone.

**Why three stacked `0 0` shadows:** a tight bright core (4px) + main halo (12px) + soft falloff
(24px) reads as light *emission* on the near-black canvas; a single blur reads flat. No offset
because a glow radiates equally, not directionally. `box-shadow` (not `filter: drop-shadow`) because
cells are rectangular and box-shadow is the cheaper, GPU-composited, layout-free choice.

## Why `@layer components`, not `@utility` (the load-bearing decision)

Identical to the `.glass` sibling and re-proven here: Tailwind v4 **tree-shakes unused custom
`@utility` classes**, and E-004 forbids any component consumer — so a `@utility glow-*` would be
absent from the production build. `@layer components` content emits **unconditionally** (verified:
glow rules present after a clean build with the probe deleted) AND sits **below** the `utilities`
layer, so a consumer's `shadow-*`/other utilities still compose/override. The doc comment in
`globals.css` records this so the next reader does not re-derive the tree-shaking lesson.

## Verification

| Check | Command | Result |
|---|---|---|
| Absent at baseline | build + grep chunk for `glow` | **0 matches** |
| Emits with no consumer | `npm run build` + grep chunk | grouped 3-layer `box-shadow` rule **present**; all 7 `.glow-{p}{--glow-color:var(--color-piece-{p})}` **present** |
| References tokens, not literals | grep emitted color rules | each resolves `var(--color-piece-*)`; no copied `oklch(...)` |
| No consumer in source | `grep -rn glow app components lib` | only the `globals.css` definition |
| Renders correctly | headless-Chrome screenshot of throwaway probe | seven swatches each bloom in their piece hue (I cyan / O yellow / T purple / S green / Z red / J blue / L orange); probe reverted |
| Emission survives probe removal | rebuild after deleting probe | glow rules **still present**, no `glow` consumer |
| Lint clean | `npm run lint` (`--max-warnings 0`) | exit 0 |
| Production build | `npm run build` | exit 0 |
| Boundary held | `git status` source diff | only `app/globals.css` |

No unit tests apply — the deliverable is CSS; the repo's vitest suite covers `lib/` logic only.
Verification is build-, grep-, and screenshot-based, matching the AC and both predecessor tickets.

## Open concerns / notes for downstream

1. **No consumer yet, by design.** The glow classes render nothing in the running app until a
   component applies one. Correct for E-004's theme-only mandate — do not read "not visible in the
   app" as a defect. Intended first consumer: a filled `Cell` in a later rendering epic
   (`<div className="bg-piece-t glow-t">`).
2. **Do not convert `.glow-*` to `@utility`** without a consumer or `@source inline("glow-i glow-o
   …")` safelist — it will silently drop from the production build. Same invariant as `.glass`; the
   doc comment states it.
3. **Bare `.glow` needs a non-black `currentColor` to be visible.** In the probe the accent swatch
   inherited black text, so its `currentColor` halo was invisible on the black canvas — expected.
   Consumers using bare `.glow` for accents should ensure the element's color contrasts the
   background, or use a piece variant.
4. **Intensity is intentionally lush** (24px outer bloom ≈ one cell of halo at ~24–30px cell size).
   If the render epic finds glows bleeding into neighbors on a dense board, dial them down per-call
   via `--glow-spread-*` (no class change needed) rather than editing the shared recipe — or, if a
   second fixed intensity is genuinely needed, add a `glow-sm`/`glow-lg` variant then (deferred now
   as speculative — see `design.md` Decision 2/5).
5. **Shared file with `.glass` (T-004-02-01).** Both edit `globals.css`; this block is self-fenced
   and appended after `.glass`. If they had landed concurrently, Lisa's commit lock serializes and
   an append-order rebase is the worst case. Here `.glass` was already committed, so it was a clean
   append.
6. **`var()` color survives lightningcss.** The `box-shadow` color is `var(--color-piece-*)` (a
   runtime custom property), so lightningcss passes it through unresolved — no fallback/gamut
   duplication like `.glass`'s literal `color-mix`. The multi-layer shadow emitted intact.

## Bottom line

Smallest correct change: one additive `@layer components` block, fully verified (grep + real
screenshot showing all seven hues), boundary-clean, token-referencing. Story S-004-02
(glass + glow surface utilities) is now complete. Ready for the rendering epic that applies
`.glow-*` to real cells.
