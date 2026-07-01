# Structure — T-004-02-02: neon-glow-shadow-utilities

The blueprint: exact file-level changes, the shape of the block, its placement, and the invariants
that must hold. Not code prose — the shape the Implement phase fills in.

## Files

### Modified — `app/globals.css` (the only source change)

One additive `@layer components` block appended **after** the existing `.glass` block and **before**
the `html, body { height: 100% }` base rule. Nothing above it changes: `@import`, `:root`,
`@theme inline`, `@theme static` (the piece tokens), and the `.glass` block are all untouched.

Resulting top-to-bottom file order:

1. `@import "tailwindcss";`
2. base-palette doc comment + `:root { --background; --foreground; }`
3. `@theme inline { … }`  — background/foreground bridge
4. `@theme static { --color-piece-* }`  — the seven piece tokens (glow's raw material)
5. `@layer components { .glass { … } }`  — sibling panel utility
6. **NEW** doc comment + `@layer components { <glow block> }`  — this ticket
7. `html, body { height: 100% }` and `body { font-family }`  — base rules

### Added — `docs/active/work/T-004-02-02/*.md`

RDSPI artifacts: `research.md`, `design.md`, `structure.md`, `plan.md`, `progress.md`, `review.md`.

### Explicitly NOT touched (epic hard boundary)

`components/Board.tsx`, `components/Cell.tsx`, `lib/**`, `app/layout.tsx`, `app/page.tsx`, and all
config files (`postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`, `next.config.ts`,
`package.json`). No consumer of the glow classes is added anywhere.

## The block (shape to implement)

```css
/*
 * Per-piece neon glow utilities (E-004). `.glow-{i,o,t,s,z,j,l}` radiate a neon halo in that
 * piece's signature hue; a bare `.glow` blooms in currentColor for accents. Filled cells/accents
 * apply ONE class and get the bloom — no component re-derives box-shadow values.
 *
 * Shape: the box-shadow geometry (a 3-layer 0-offset bloom) is written ONCE on a grouped selector
 * reading `var(--glow-color, currentColor)`; each `.glow-{piece}` only sets `--glow-color` to the
 * matching `--color-piece-*` token. So `.glow-t` alone = purple bloom (single-class), geometry not
 * duplicated, and the hue tracks the token if it is ever retuned.
 *
 * `@layer components` (NOT `@utility`) on purpose: Tailwind v4 tree-shakes custom `@utility`
 * classes with no scanned consumer, and E-004 forbids a component consumer — a `@utility glow-*`
 * would vanish from the production build (same trap `.glass` and the color tokens hit). Component-
 * layer rules emit unconditionally AND sit below `utilities`, so consumer utilities still compose.
 * Spreads are `var(--glow-spread-N, default)` so intensity is tunable per-call without new classes.
 */
@layer components {
  .glow,
  .glow-i, .glow-o, .glow-t, .glow-s, .glow-z, .glow-j, .glow-l {
    box-shadow:
      0 0 var(--glow-spread-1, 4px)  var(--glow-color, currentColor),
      0 0 var(--glow-spread-2, 12px) var(--glow-color, currentColor),
      0 0 var(--glow-spread-3, 24px) var(--glow-color, currentColor);
  }

  .glow-i { --glow-color: var(--color-piece-i); }
  .glow-o { --glow-color: var(--color-piece-o); }
  .glow-t { --glow-color: var(--color-piece-t); }
  .glow-s { --glow-color: var(--color-piece-s); }
  .glow-z { --glow-color: var(--color-piece-z); }
  .glow-j { --glow-color: var(--color-piece-j); }
  .glow-l { --glow-color: var(--color-piece-l); }
}
```

## Public interface (what consumers get)

- **`.glow-i … .glow-l`** — apply to a filled cell / element to give it that piece's neon halo.
  Self-sufficient: one class = geometry + hue. Intended first consumer: `Cell` in the later render
  epic (not now).
- **`.glow`** — a generic accent glow in `currentColor`; for non-piece accents.
- **Tuning knobs (optional, no new class):** `--glow-spread-1/-2/-3` override the three blur radii;
  `--glow-color` can be set directly for a custom hue. Defaults stand alone, so knobs are opt-in.

## Internal organization

- **One `@layer components` block**, two rule groups: the grouped-selector geometry rule, then the
  seven single-declaration color rules. Geometry first so the reader sees the shared recipe before
  the per-piece specializations.
- **No `@theme` changes** — glow consumes existing tokens; it defines none.
- **Self-fenced** — the block is bracketed by its doc comment and its own `@layer components {}`,
  independent of the `.glass` block above it; append/rebase against the sibling is trivial.

## Invariants (must hold after the change)

1. **Emits with no consumer.** `.glow-i{…}` (and siblings) present in `.next/static/chunks/*.css`
   after `npm run build`, with **no** `glow` reference in `app/`, `components/`, or `lib/` source.
2. **References tokens, not literals.** Each color rule uses `var(--color-piece-*)`; no `oklch(...)`
   literal is copied into the glow block.
3. **Single-class application.** `.glow-t` used alone produces a purple bloom (matches both the
   grouped geometry rule and its own color rule).
4. **Boundary held.** `git diff --stat` source scope = `app/globals.css` only (+ `work/` artifacts).
5. **Gates green.** `npm run lint` (`--max-warnings 0`) and `npm run build` exit 0.
6. **Do not convert to `@utility`** without a consumer or `@source inline(...)` safelist — it will
   silently drop from the build. (Doc comment states this; same invariant as `.glass`.)

## Ordering of changes

Trivial and single-step: append the block, rebuild, grep, probe, revert probe, commit. No
multi-file sequencing. The only ordering that matters is *append after `.glass`* (placement), which
Structure fixes above.
