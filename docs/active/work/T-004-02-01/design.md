# Design — T-004-02-01: glassmorphic-panel-utilities

Decide *how* to author the glass panel utility. Options enumerated, weighed against the codebase
reality from Research, one chosen with rationale, rejections recorded. Grounded in the empirical
tree-shaking probe, not assumptions.

## The decision that dominates: how to force emission with no consumer

Research proved the load-bearing fact empirically (tailwindcss 4.3.2, `npm run build` + grep, no
consumer present):

- `@utility glass { … }` → **tree-shaken away** (absent from the committed build).
- `@layer components { .glass { … } }` → **emitted unconditionally**, auto-prefixed.
- plain unlayered `.glass { … }` → **emitted unconditionally**, but wins the cascade over utilities.

The AC requires emission in the committed state where the epic forbids a consumer. So the *only*
viable mechanisms are the two that emit without usage. The choice is between them.

### Decision 1 — define `.glass` inside `@layer components` (not `@utility`, not unlayered)

**Chosen: `@layer components { .glass { … } }`.**

Why, over the two rejected alternatives:

- **vs. `@utility glass`** — structurally impossible here. `@utility` participates in Tailwind's
  extractor, so with no scanned consumer it is tree-shaken (proven). It would pass the probe build
  (the probe references it) and then vanish from the committed build the instant the probe is
  reverted — the exact failure mode T-004-01-01 hit with a plain `@theme` token. Rejected.
  - *(A `@utility glass` + `@source inline("glass")` safelist would force emission and is the
    closest "static utility" analog, but it is two coupled at-rules to express one class, and buys
    nothing over a component-layer rule for a panel-shaped class that never needs variants like
    `hover:` or `md:`. Rejected as needless machinery — see Decision 2.)*
- **vs. unlayered top-level `.glass`** — also emits unconditionally, but unlayered CSS sits
  *outside* Tailwind's cascade layers, so it **beats** anything in the `utilities` layer.
  A consumer writing `<div className="glass rounded-2xl bg-piece-t/10">` would find `.glass`'s
  `background-color` silently overriding `bg-piece-t/10` regardless of author order — hostile to
  the "apply one class, then compose utilities" goal. Rejected for composability.
- **`@layer components`** gives unconditional emission (proven) **and** correct cascade position:
  Tailwind orders `theme → base → components → utilities`, so a consumer's utility classes
  override individual glass properties when composed, while `.glass` alone still styles a bare
  panel. This is precisely how a reusable component-class should behave, and it mirrors the
  sibling's spirit — pick the Tailwind-native mechanism whose *emission is decoupled from usage*
  (`@theme static` for tokens; `@layer components` for a named class).

This is the single choice a reviewer should sanity-check.

### Decision 2 — one class named `.glass`, no variant/utility surface

The AC and epic call for "a glass panel utility … apply one class." A panel is a *composite
surface*, not an atomic property, and it never needs Tailwind variants of its own (a consumer adds
`md:`, `hover:` to the panel via other utilities). So a single component-layer class is the right
grain. **Rejected:** exposing a family (`glass-sm/md/lg`, tunable blur utilities) — that is
speculative generality with no consumer to shape it; the epic explicitly wants the *minimum*
reusable vocabulary. If a second blur strength is ever needed, it is an additive follow-up.

## Decision 3 — the glass recipe (values)

Core (AC-mandated) three, plus two depth cues that make frosted glass read correctly on the dark
neon canvas (`--background: #0a0a0f`):

| Property | Value | Role |
|---|---|---|
| `background-color` | `color-mix(in oklab, white 6%, transparent)` | **Translucency** — low-alpha fill so blurred content shows through |
| `backdrop-filter` / `-webkit-` | `blur(12px) saturate(1.4)` | **Blur** — frosts the background; `saturate` lifts the neon behind it |
| `border` | `1px solid color-mix(in oklab, white 14%, transparent)` | **Hairline border** — the crisp glass edge |
| `box-shadow` | `0 8px 32px rgb(0 0 0 / 0.37)`, plus `inset 0 1px 0 color-mix(in oklab, white 12%, transparent)` | Depth drop-shadow + lit top rim (glass realism) |

Rationale for the numbers:

- **`blur(12px)`** — the canonical glassmorphism midpoint: clearly frosted yet the background is
  still legible. `saturate(1.4)` is a light touch that makes neon bleed through as color, which is
  the whole point of *neon*-glass. Both are single values, easy to tune later.
- **`white 6%` fill / `white 14%` border** — on a near-black background, ~6% white reads as a
  faint frost without washing out; a slightly brighter (14%) border gives the hairline definition
  glass needs. `color-mix(in oklab, …)` is chosen over `rgba()` because lightningcss resolves it
  to a compact hex-alpha (proven: `rgba(255,255,255,0.08)` → `#ffffff14`) and it reads as
  intent ("white, mostly transparent") rather than magic numbers.
- **`box-shadow` + inset highlight** — not AC-required, but glass without depth reads as a flat
  translucent rectangle. The drop shadow lifts the panel; the `inset 0 1px 0` white rim simulates
  light catching the top glass edge. Both are cheap, static, and composited on the GPU (no layout
  cost) — consistent with the epic's "60fps-friendly" intent.

**No hardcoded `border-radius`, padding, or size.** Shape, rounding, and spacing are the
consumer's to compose via utilities (`rounded-2xl`, `p-4`). `.glass` owns *only* the frosted-glass
material, which keeps it reusable across differently-shaped scoreboard/preview/hold surfaces.

## Decision 4 — prefixing: rely on lightningcss, but write both

The probe showed lightningcss auto-emits `-webkit-backdrop-filter` from browserslist. To keep the
*source* self-documenting and robust to a future browserslist change, write both
`-webkit-backdrop-filter` and `backdrop-filter` explicitly (webkit first). lightningcss dedups; the
emitted order (`-webkit-` then unprefixed) is preserved. Low risk, maximal clarity.

## Decision 5 — no theme tokens for glass params (this ticket)

Considered promoting blur radius / tint / border alpha to `@theme static` tokens (as the sibling
did for colors). **Rejected for now:** colors are a *shared vocabulary* many surfaces reference by
name; glass parameters are internal to this one recipe with no second consumer. Tokenizing them
now is premature abstraction. The values live inline in `.glass`, trivially tunable. If glow
(T-004-02-02) or later work wants a shared blur scale, that is the moment to extract a token — not
before.

## What the committed change looks like (preview; Structure locks it)

One additive block appended to `app/globals.css`, after the `@theme static` colors, with a doc
comment explaining the `@layer components` choice (why not `@utility`) so the next reader does not
re-derive the tree-shaking lesson:

```css
@layer components {
  .glass {
    background-color: color-mix(in oklab, white 6%, transparent);
    -webkit-backdrop-filter: blur(12px) saturate(1.4);
    backdrop-filter: blur(12px) saturate(1.4);
    border: 1px solid color-mix(in oklab, white 14%, transparent);
    box-shadow:
      0 8px 32px rgb(0 0 0 / 0.37),
      inset 0 1px 0 color-mix(in oklab, white 12%, transparent);
  }
}
```

## Verification approach (Plan will sequence it)

1. **Grep committed build** — after `npm run build`, the emitted CSS chunk contains a `.glass`
   rule with `backdrop-filter` (and `-webkit-` prefix), with **no** consumer in source. Absent at
   baseline.
2. **Throwaway probe** — a temporary panel with `className="glass"` centered over a *busy*
   background (gradient / overlapping neon blobs) under `app/`, viewed in `npm run dev`; confirm
   the panel is visibly blurred, translucent, and bordered. Then revert the probe.
3. **Gates** — `npm run lint` (`--max-warnings 0`) and `npm run build` both exit 0; `git status`
   shows only `app/globals.css` changed in source.
