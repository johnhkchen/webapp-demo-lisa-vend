# T-009-01-02 — Research: wire-clay-tokens-into-tailwind-theme

## Ticket ask

Replace the hand-rolled dark `#0a0a0f`/`#ededf2` `:root` pair in `app/globals.css` with the
kit's `--clay-*` tokens, bridged through `@theme inline` the same way the existing
background/foreground pipeline already works, so the base palette becomes warm
off-white/ink instead of neon-dark.

Acceptance criterion: `app/globals.css` imports the vendored kit file and
`--color-background`/`--color-foreground` resolve to the kit's warm off-white/ink values
(not `#0a0a0f`/`#ededf2`); `npm run build` succeeds and the rendered body background is the
new light clay tone.

## What exists today

### The vendored kit (`styles/vendor/b28-clay.css`, from T-009-01-01)

Landed by T-009-01-01, not yet referenced anywhere. Relevant tokens on `:root`:

- `--clay-bg: #faf8f5` — warm off-white, "the page"
- `--clay-ink: #1c1917` — warm near-black text
- Also present: `--clay-primary`, `--clay-surface`, `--clay-surface-raised`, `--clay-well`,
  `--clay-border`, `--clay-ink-soft`, `--clay-on-primary`, font vars
  (`--clay-font-display`/`--clay-font-body`), radii, and the warm box-shadow recipes
  (`--clay-shadow-raised`/`-pressed`/`-well`).
- The file also defines an opt-in `.b28-clay` class (sets `background-color`/`color`/
  `font-family` on whatever element it's applied to) and primitive classes
  `.clay-surface`/`.clay-well`/`.clay-button`/`.clay-button--soft`/`.clay-chip`. None of
  these are this ticket's concern — only the `:root` custom properties matter here.
- The file is plain CSS (no `@theme`, no Tailwind-specific syntax) — it defines raw custom
  properties on `:root`, nothing more. Safe to `@import` from `globals.css` without
  triggering any Tailwind processing conflicts.

### Current theme wiring (`app/globals.css`)

```css
@import "tailwindcss";

:root {
  --background: #0a0a0f;
  --foreground: #ededf2;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

The file's own header comment (lines 3-12) explicitly documents this pipeline: "Color flows
token -> utility, not raw CSS: the `:root` vars below are bridged by `@theme inline` into the
`bg-background`/`text-foreground` utilities, which `app/layout.tsx` applies to `<body>`."
This is the exact pipeline the ticket says to reuse — indirection through an intermediate
`--background`/`--foreground` var, not a direct `--color-background: var(--clay-bg)` mapping.

Below that pair, the same file defines a large `@theme static` block of seven oklch neon
piece colors (`--color-piece-i..l`), a `.glass` panel utility, `.glow*` utilities, a `.flash`
keyframe/utility, and `.motion*` utilities — all part of the *old* dark-neon/glass epic (E-004)
and explicitly out of this ticket's scope (E-009's context section calls these out as the
material E-009 as a whole replaces, across later tickets/stories, not this one).

### Consumers of `--background`/`--foreground` and `bg-background`/`text-foreground`

- `app/layout.tsx:16` — `<body className="min-h-full flex flex-col bg-background
  text-foreground">`. The only Tailwind-utility consumer.
- No other `.tsx`/`.ts` file references `background`/`foreground` (confirmed via grep across
  `components/`, `app/`, `lib/`).
- `components/Cell.tsx` references `background`/`foreground`-adjacent strings, but on closer
  read those are piece-color (`bg-piece-*`) utilities, unrelated to this pair.

### Tailwind / build setup

- Tailwind v4, CSS-first config (`@import "tailwindcss"` in `globals.css`, no `tailwind.config.*`).
- `postcss.config.mjs` wires `@tailwindcss/postcss`, no other PostCSS plugins (no
  `postcss-import`) — Tailwind v4's own `@import` handling resolves relative CSS imports
  natively (this is standard Tailwind v4 behavior, not something this repo configures).
- Build: `npm run build` → `vinext build`. Dev: `vinext dev`. No separate CSS build step.
- Test runner: `vitest run`, jsdom environment, 32 test files / 302 tests today (per
  T-009-01-01's review). None of them assert on `globals.css` content or resolved CSS
  variable values — CSS token changes are not covered by the existing unit-test suite.

## Constraints and assumptions surfaced

- The ticket explicitly scopes to `--color-background`/`--color-foreground` only. The oklch
  piece palette, `.glass`, `.glow*`, `.flash`, `.motion*` blocks are untouched — confirmed by
  E-009's epic doc, which frames retoning the piece palette and panel materials as separate,
  later tickets (S-009-02+).
  - `--clay-ink` is the closest kit analog for foreground/text-on-background. It's the
    "warm near-black text" token, distinct from `--clay-primary` (steel-blue accent) — using
    ink (not primary) for `--foreground` matches "warm off-white/ink" from the ticket title
    wording exactly.
- The import path: kit lives at `styles/vendor/b28-clay.css`, consumer is `app/globals.css`.
  Relative path from `app/` to `styles/vendor/` is `../styles/vendor/b28-clay.css`.
- CSS `@import` statements must precede other rules (except `@charset`)  in a stylesheet,
  same constraint Tailwind's own `@import "tailwindcss"` already satisfies as the first line.
  Import order between the two `@import`s doesn't semantically matter here — the kit only
  defines custom properties, so ordering relative to Tailwind's own imported layers doesn't
  create cascade conflicts either way. Convention in this codebase (and typical Tailwind v4
  setup) is framework import first, then supporting imports.
- No `--clay-background`/`--clay-foreground` tokens exist in the kit — the mapping is
  necessarily `--clay-bg` → background, `--clay-ink` → foreground, a rename across
  vocabularies, not a 1:1 token name match. This is expected per the kit's own design (it's
  a shared, app-agnostic vocabulary; each consumer maps kit tokens to its own semantic names).
- `npm run build` succeeding is an explicit acceptance criterion — must verify after the edit,
  not just visually reason about it.
- No dev server / browser verification tooling was invoked yet in this repo's RDSPI history
  for CSS-only changes (T-009-01-01 didn't need one, its CSS wasn't wired into anything). This
  ticket's acceptance criterion asks for the "rendered body background" to be the new tone —
  worth a lightweight verification (e.g. computed style check or visual dev-server check) in
  Plan/Implement, not just a build-succeeds check.
