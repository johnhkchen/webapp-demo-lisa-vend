# Design — T-004-02-02: neon-glow-shadow-utilities

Decide *how* to author the piece-keyed glow utilities. Options weighed against the codebase reality
from Research (Tailwind v4 tree-shaking, no-consumer boundary, the sibling `.glass` precedent). One
chosen, rejections recorded.

## The decision that dominates: emit with no consumer (settled by precedent)

Research proved — empirically, in this exact build — that `@utility` is tree-shaken without a
scanned consumer while `@layer components { .foo {} }` emits unconditionally and sits below the
`utilities` layer. E-004 forbids a consumer. So the mechanism is **not open**: glow classes go in
`@layer components`, exactly as `.glass` did. This ticket re-uses the sibling's settled Decision 1
rather than re-litigating it. The genuinely open questions are the *shape* and *recipe* below.

## Decision 1 — shape: seven `.glow-{piece}` classes sharing one bloom geometry

The glow color must vary per piece (7 tokens) while the *bloom geometry* (the box-shadow blur/
spread layers) is identical across pieces. Three viable shapes:

**A. Seven fully-independent classes.** Each `.glow-i … .glow-l` restates the whole
`box-shadow: 0 0 … var(--color-piece-i), 0 0 … var(--color-piece-i)`. Simple, self-contained, but
the geometry is copy-pasted seven times — one tweak to the halo means seven edits, and drift is
easy.

**B. Base `.glow` + seven color-only modifiers.** `.glow` holds the box-shadow (reading a
`--glow-color` var); `.glow-i { --glow-color: var(--color-piece-i) }` etc. DRY, but a consumer must
apply **two** classes (`glow glow-t`) — `.glow-t` alone renders nothing. That breaks the
single-class ergonomics the AC implies ("a probe element shows a colored bloom matching its piece
hue" — one element, one intent).

**C. (chosen) Grouped-selector geometry + per-class color, each class self-sufficient.** One
grouped rule lists all seven selectors (plus a bare `.glow`) and declares the box-shadow once,
reading `var(--glow-color, currentColor)`. Each `.glow-{piece}` then only sets its
`--glow-color: var(--color-piece-{piece})`. Because `.glow-t` matches *both* the grouped geometry
rule and its own color rule, **applying `.glow-t` alone yields a purple bloom** — single-class
ergonomics *and* the geometry written once.

**Chosen: C.** It is the DRY of B with the one-class application of A, and it degrades nicely: a
bare `.glow` (no piece) blooms in `currentColor`, which serves the "accents" half of the ticket
context (an accent element glows in whatever text color it inherits, no piece needed).

```css
@layer components {
  /* geometry: written once, shared by all glow variants */
  .glow,
  .glow-i, .glow-o, .glow-t, .glow-s, .glow-z, .glow-j, .glow-l {
    box-shadow:
      0 0 var(--glow-spread-1, 4px)  var(--glow-color, currentColor),
      0 0 var(--glow-spread-2, 12px) var(--glow-color, currentColor),
      0 0 var(--glow-spread-3, 24px) var(--glow-color, currentColor);
  }
  /* color: one token reference per piece */
  .glow-i { --glow-color: var(--color-piece-i); }
  .glow-o { --glow-color: var(--color-piece-o); }
  .glow-t { --glow-color: var(--color-piece-t); }
  .glow-s { --glow-color: var(--color-piece-s); }
  .glow-z { --glow-color: var(--color-piece-z); }
  .glow-j { --glow-color: var(--color-piece-j); }
  .glow-l { --glow-color: var(--color-piece-l); }
}
```

## Decision 2 — the bloom recipe (three stacked shadows)

A convincing neon halo is not one shadow but a **stack** of same-color `0 0` (no-offset) shadows at
increasing blur, so the color is tight and bright at the edge and falls off into a soft outer
glow — the classic neon-sign bloom:

| Layer | Value | Role |
|---|---|---|
| inner | `0 0 4px  var(--glow-color)` | tight bright core hugging the element edge |
| mid   | `0 0 12px var(--glow-color)` | the main visible halo |
| outer | `0 0 24px var(--glow-color)` | soft falloff into the dark canvas |

Rationale:
- **No offset (`0 0`)** — a glow radiates equally in all directions; an offset would read as a drop
  shadow, not a bloom.
- **Three layers, not one** — a single `0 0 12px` reads as a flat colored blur; stacking a tight
  core + wide falloff is what makes it read as *emission*. Three is the sweet spot (one too flat,
  five+ is diminishing returns and heavier compositing).
- **Same color, increasing blur** — all three reference the same `--glow-color` so the halo is one
  coherent hue; only the spread grows. On the near-black `--background: #0a0a0f` canvas the outer
  layer fades to nothing, which is exactly the neon-on-black look P2 wants.
- **Spreads are `var(--glow-spread-N, default)`** — the geometry is tunable per-call without a new
  class (a consumer can dial intensity via `style`/utilities later), but the defaults stand alone.
  This costs nothing and avoids a future `glow-lg` class churn.

Values chosen for a Tetris *cell* scale (cells are ~24–30px): a 24px outer bloom is roughly one
cell of halo — visible and lush without swamping neighbors. Tunable if the render epic wants tighter.

## Decision 3 — reference tokens by `var()`, never re-derive

Each `.glow-{piece}` sets `--glow-color: var(--color-piece-{piece})` — the **same token** the color
utilities use, not a copied `oklch(...)` literal. This is the epic's "define once" contract: if a
piece hue is ever retuned in the `@theme static` block, every glow tracks it automatically. It also
makes the emit-and-reference relationship grep-obvious for the AC ("utilities that reference the
piece color tokens").

## Decision 4 — `currentColor` default for the bare `.glow`

`var(--glow-color, currentColor)` means a bare `.glow` (no piece modifier) blooms in the element's
text color. This gives the "accents" in the ticket context a zero-config glow (a white-ish accent
glows white) and makes `.glow-{piece}` a pure specialization. Costs one fallback keyword; adds a
useful generic. **Not** a separate class — it falls out of the grouped geometry rule for free.

## Decision 5 — `@layer components`, appended after `.glass` (placement)

Same layer and same file region as `.glass`, appended immediately after it and before the base
`html, body` rules. Keeping both material-utility blocks adjacent in the `components` layer is
tidy, and the layer position guarantees a consumer's `shadow-*`/other utilities can still override
if needed (though a piece glow is unlikely to be overridden). No interaction with the `@theme`
blocks above.

## Rejected alternatives

- **`@utility glow-*` (functional utility).** Tailwind v4 *can* express `glow-i…` as utilities, but
  they tree-shake without a consumer (proven) — dead on arrival under the no-consumer boundary.
  Rejected, identical reasoning to the sibling.
- **A single `.glow` reading `currentColor` only, no piece classes.** Would satisfy "accents" but
  not "matching its piece hue" — the AC explicitly wants per-piece color. Rejected as under-scoped.
- **`filter: drop-shadow()` instead of `box-shadow`.** `drop-shadow` follows the alpha shape (nice
  for irregular sprites) but is a `filter` (can trigger its own compositing layer, and stacking
  three is heavier), and cells are rectangular so `box-shadow` traces them perfectly. `box-shadow`
  is the cheaper, more predictable choice for rectangular cells. Rejected for this use.
- **Tokenizing the spreads as `@theme` values** (`--glow-spread-mid` etc.). Premature — one recipe,
  no second consumer asking for a shared scale. The inline `var(…, default)` already makes them
  tunable. Extract only when a real second consumer appears (mirrors sibling Decision 5).
- **Per-piece independent classes (shape A).** Rejected for geometry duplication / drift risk; C
  gives the same ergonomics without the copy-paste.

## What the committed change looks like (Structure locks it)

One additive `@layer components` block appended to `app/globals.css` after the `.glass` block, with
a doc comment explaining (a) why `@layer components` not `@utility` — pointing at the shared
tree-shaking lesson — and (b) the grouped-geometry + per-piece-color shape, so the next reader does
not re-derive it.

## Verification approach (Plan sequences it)

1. **Baseline grep** — `glow` absent from the built chunk (already confirmed).
2. **Emit grep** — after `npm run build`, the chunk contains a `.glow-i{…}` (and siblings) with a
   multi-layer `box-shadow` referencing the piece color, **no** source consumer.
3. **Visual probe** — throwaway element(s) with `className="glow-t"` (and a couple other pieces)
   on the dark canvas; confirm each shows a bloom in *its* hue; revert the probe.
4. **Gates** — `npm run lint` and `npm run build` exit 0; source diff = `app/globals.css` only.
