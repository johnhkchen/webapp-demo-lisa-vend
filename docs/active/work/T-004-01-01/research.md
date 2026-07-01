# Research — T-004-01-01: per-tetromino-neon-color-tokens

Descriptive map of the codebase as it bears on defining seven signature neon hue tokens
(`--color-piece-{i,o,t,s,z,j,l}`) in the Tailwind theme. What exists, where, how it connects,
and the constraints that shape the work. No solutions proposed here.

## The ticket in one line

Add seven named neon color tokens — one per tetromino (I/O/T/S/Z/J/L) — to the `@theme` layer in
`app/globals.css` so each piece owns one central, reusable color the rest of the neon vocabulary
and later `Cell` rendering reference by name. Tokens must (a) resolve to distinct neon values,
(b) **emit into the production CSS build** (grep-verifiable, absent at baseline), and (c) prove
out via a *throwaway* swatch that renders seven distinct hues.

## Where styling lives

- **`app/globals.css`** — the single styling entry point. Imported once by `app/layout.tsx`
  (`import "./globals.css"`). Current contents:
  - `@import "tailwindcss";` — Tailwind v4 entry.
  - A `:root` block with two raw CSS vars: `--background: #0a0a0f`, `--foreground: #ededf2`.
  - An `@theme inline { … }` block bridging those raw vars into Tailwind theme tokens
    `--color-background` / `--color-foreground`, which generate the `bg-background` /
    `text-foreground` utilities.
  - Base `html, body { height: 100% }` and a `body` font stack.
- **`postcss.config.mjs`** — the only build wiring: `plugins: { "@tailwindcss/postcss": {} }`.
  No `tailwind.config.*` file exists (Tailwind v4 is CSS-first; config lives in `@theme`).
- There are **no** CSS Modules, no other `.css` files, no inline `<style>`. All styling is
  Tailwind-utility or the `@theme` token layer. `globals.css` is the sole theme surface.

## The token pipeline (established by T-001-02-01, commit 2203afd)

The prerequisite ticket proved the full pipeline live and grep-verifiable:

```
:root raw var  →  @theme (inline) token  →  Tailwind utility  →  element className  →  build CSS
--background       --color-background        bg-background        <body>               emitted
```

Its `review.md` documents that `bg-background` / `text-foreground` and `--color-background` /
`--color-foreground` are all **present** in the production CSS and **absent at baseline** — the
exact grep-verifiable shape this ticket's acceptance criterion echoes. That ticket deliberately
added **no new tokens** and left the palette extension to this epic. This ticket is the first
palette extension.

## Consumers, current and future

- **`components/Cell.tsx`** — the atomic board square. Today purely presentational and colorless:
  `<div className="rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5" />`. Its own doc
  comment names the reserved seam: "The playability epic adds the first prop here (fill / color
  for a settled or active piece)." That future prop is the primary intended consumer of these
  tokens — but wiring it is **out of scope** here (see boundary below).
- **`components/Board.tsx`** — renders `COLS * ROWS` `Cell`s in a CSS grid; no per-piece color.
- **`lib/constants.ts`** — pure `COLS = 10`, `ROWS = 20`. No color/piece data exists anywhere
  yet; there is no tetromino type, no piece enum, no existing color map to reconcile against.
  These seven tokens are the *first* place piece identity gets a color in the repo.

## Epic / story framing

- **E-004 neon-glass-design-system** — authors the neon/glass vocabulary as *pure theme config*.
  Its stated **hard boundary**: define classes/tokens ONLY; edit **no** `components/` or `lib/`
  or app-tick file. Applying classes to Board/Cell/panels is a later consuming epic's work.
- **S-004-01 neon-color-token-palette** — this story, a single ticket (this one).
- The epic lists this ticket's siblings-in-spirit (glass utilities, glow/shadow, row-clear
  keyframes, 60fps transitions) as separate future work. This ticket is *only* the seven colors.

## The one real technical risk (empirically probed)

Acceptance requires the tokens to **emit into the production CSS build** and be grep-verifiable —
in the *committed* state, where the throwaway swatch has been removed and nothing references them.

Tailwind v4 **tree-shakes unused theme variables.** Verified empirically against this repo
(tailwindcss 4.3.2, via `npx next build` + grep of the emitted chunk):

- A plain `@theme { --color-probe-unused: … }` with no consumer → **NOT emitted** (tree-shaken
  away). Only the one *used* token (`--color-background`) survived in the output.
- `@theme static { --color-probe-static: … }` with no consumer → **emitted**, and Tailwind even
  auto-generated an sRGB `@supports` fallback alongside the oklch value.

So a naive `@theme` block would satisfy the swatch check but **fail** the "emit in committed
build" check the moment the throwaway swatch is deleted. The `static` variant is the mechanism
that decouples emission from usage — this is the central constraint the Design phase must resolve.

## Conventions to respect

- Existing color literals use **hex** (`#0a0a0f`). Tailwind v4's own default palette uses
  **oklch**. Either is valid; neon intent favors high-chroma oklch for uniform perceived
  brightness. Naming must follow Tailwind's `--color-*` namespace so utilities generate.
- `npm run lint` runs `eslint --max-warnings 0` (zero-warning gate). `npm run build` must pass.
  CSS is not linted, but any throwaway probe added under `app/` is TS/ESLint-scoped and must be
  removed before commit so the gate and the "no component edits" boundary both hold.
- Naming: `--color-piece-i` … `--color-piece-l` (kebab, lowercase piece letters) as the ticket
  spells them; this yields `bg-piece-i`, `text-piece-i`, `border-piece-i`, etc.

## Constraints & assumptions

- **Single file changes:** only `app/globals.css` should change in the committed diff. No
  `components/`, `lib/`, or app-tick edits (epic hard boundary).
- **No new deps, no config file:** Tailwind v4 needs none; `@theme` is the whole surface.
- **Assumption:** "distinct neon values" means seven visibly different, saturated hues keyed to
  the classic Tetris piece identities (I=cyan, O=yellow, T=purple, S=green, Z=red, J=blue,
  L=orange), not arbitrary colors — the epic's "signature hue per piece" language implies the
  canonical mapping. Design will lock exact values.
- **Assumption:** the swatch is a verification probe, not a deliverable — built, observed,
  reverted; never committed.
