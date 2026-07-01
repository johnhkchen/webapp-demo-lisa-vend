# Research — T-004-02-02: neon-glow-shadow-utilities

Descriptive map of the codebase as it bears on adding glow/box-shadow bloom utilities keyed to the
per-piece neon tokens. What exists, where, and the constraints. No solutions proposed here.

## The ticket in one line

Provide glow/box-shadow bloom utilities that reference the per-piece neon color tokens
(`--color-piece-{i,o,t,s,z,j,l}`) so filled cells and accents radiate a neon halo without each
component re-deriving shadow values. AC: the glow utilities emit into the production CSS build, and
a throwaway probe element shows a colored neon bloom matching its piece hue.

## Where this sits in the epic

E-004 (neon-glass-design-system) authors a reusable neon/glass **theme vocabulary** as pure config
— tokens, glass/glow utilities, keyframes, transitions — and **edits no component or game-loop
file**. This is the third ticket to land in that epic, after two directly relevant predecessors:

- **T-004-01-01 (done, `depends_on` of this ticket)** — defined the seven
  `--color-piece-{i,o,t,s,z,j,l}` tokens in an `@theme static` block. Those tokens are this
  ticket's raw material; the glow utilities reference them by name.
- **T-004-02-01 (done, sibling under story S-004-02)** — added the `.glass` panel utility. It is
  the structural template for this ticket: same file, same "force emission with no consumer"
  problem, same verification shape. Its `review.md`/`design.md` in `docs/active/work/T-004-02-01/`
  are the authoritative precedent.

## The single source file: `app/globals.css`

The entire theme lives in one file (`app/globals.css`, ~74 lines). Current top-to-bottom shape:

1. `@import "tailwindcss";` — the Tailwind v4 entry (no separate `tailwind.config`; v4 is
   CSS-first, driven by `@theme`).
2. A doc comment + `:root { --background; --foreground; }` base palette.
3. `@theme inline { --color-background; --color-foreground; }` — bridges the base palette into
   `bg-*`/`text-*` utilities.
4. `@theme static { --color-piece-i … --color-piece-l; }` — **the seven piece hues**, in `oklch`,
   with `static` forcing them into the build ahead of any consumer.
5. `@layer components { .glass { … } }` — the sibling's panel utility.
6. `html, body { height: 100% }` and a `body { font-family }` base rule.

The glow block will append into this same file. Ordering matters only loosely (see Constraints).

### The piece tokens (verbatim, the values glow must reference)

```css
@theme static {
  --color-piece-i: oklch(0.85 0.15 195); /* cyan   */
  --color-piece-o: oklch(0.87 0.17 100); /* yellow */
  --color-piece-t: oklch(0.7 0.2 310);   /* purple */
  --color-piece-s: oklch(0.85 0.21 145); /* green  */
  --color-piece-z: oklch(0.68 0.23 25);  /* red    */
  --color-piece-j: oklch(0.62 0.2 260);  /* blue   */
  --color-piece-l: oklch(0.75 0.19 55);  /* orange */
}
```

`@theme` emits each as a real CSS custom property `--color-piece-*` on `:root` **and** generates a
`bg-/text-/border-/ring-piece-*` utility family. For glow the relevant output is the custom
property: a `box-shadow` rule can write `var(--color-piece-i)`.

## The load-bearing constraint: Tailwind v4 tree-shakes unused custom classes

Proven empirically by both predecessors (tailwindcss `^4`, `@tailwindcss/postcss`, Next 16.2.9):

- A plain `@theme` block (no `static`) drops unused tokens — T-004-01-01 hit this and solved it
  with `@theme static`.
- A `@utility foo {}` with no scanned consumer is **tree-shaken out of the production build** —
  T-004-02-01 hit this and solved it with `@layer components`.
- `@layer components { .foo { … } }` content is **emitted unconditionally** (no consumer needed)
  AND sits below the `utilities` layer, so a consumer's atomic utilities still override it.

E-004's hard boundary **forbids a component consumer** for this vocabulary. So any usage-driven
emission mechanism (`@utility`, or bare Tailwind class scanning) is structurally unavailable — the
utility must emit purely from its definition. This is the central fact the Design must respect.

### Verified current build state (baseline)

`npm run build` produces one CSS chunk `.next/static/chunks/*.css`. Confirmed just now:

- `--color-piece-i` (and siblings) **present** in the chunk — tokens emit as expected.
- `glow` — **0 matches** in the chunk. The utility does not exist yet (absent at baseline ✓).
- `.glass{…}` — **present**, fully formed, proving the `@layer components` emission path works in
  this exact build.
- `grep -rn glow app components lib` → **no source consumer** (only a stale mention in the
  `globals.css` header comment). Clean slate.

## Rendering consumers (context only — NOT edited here)

- `components/Board.tsx` — placeholder static CSS-grid board; renders `COLS*ROWS` `Cell`s. Uses
  ad-hoc `border-white/10 bg-white/5 shadow-2xl` inline, not the theme vocabulary yet.
- `components/Cell.tsx` — the eventual first consumer of piece color + glow (a filled cell will get
  its piece hue and bloom). **Out of scope**: wiring glow into `Cell` is the later rendering epic.

These establish *who will consume* glow later, which shapes the utility's grain (per-piece,
single-class application) — but they are not touched by this ticket.

## Styling / build stack facts

- **Tailwind v4, CSS-first.** No JS config file; theme is `@theme` in CSS. Custom classes go in
  `@layer components` or `@utility`.
- **lightningcss** (bundled via `@tailwindcss/postcss`) transforms the output: it auto-prefixes
  from browserslist (e.g. emits `-webkit-backdrop-filter` for `.glass`) and resolves modern color
  syntax to a fallback + wide-gamut pair (`color-mix`/`oklch` → hex-alpha + `lab()`/`oklab()`).
  Relevant to glow: `box-shadow` color from `var(--color-piece-*)` (an `oklch` value) will be
  emitted through the same resolver.
- **No CSS unit-test surface.** The repo test runner is **vitest**, wired to `lib/` pure logic
  only (`npm test` = `vitest run`). A CSS class is verified by build-grep + visual probe, not unit
  tests — matching both predecessors.
- **Gates:** `npm run lint` runs `eslint --max-warnings 0`; `npm run build` must pass. Path alias
  `@/*` → repo root (from `tsconfig.json`).

## Constraints & assumptions carried into Design

1. **Emit with no consumer** — must use a mechanism decoupled from usage (`@theme static` /
   `@layer components`), never `@utility` alone. Non-negotiable; proven.
2. **Reference the tokens by name** — glow color must be `var(--color-piece-*)`, not a re-derived
   literal, so the halo tracks any future token change (the epic's "define once" intent).
3. **Hard boundary** — edit only `app/globals.css` (+ this ticket's `work/` artifacts). No
   `components/`, `lib/`, `app/layout.tsx`, `app/page.tsx`, or config edits.
4. **Shared file with the glass sibling** — both edit `globals.css`. The glass block is
   self-fenced; a glow block appends cleanly after it. Lisa's commit lock serializes if concurrent.
5. **Single-class ergonomics** — later consumers should apply *one* class to a cell and get the
   right-colored bloom, mirroring `.glass`'s "apply one class" grain and the AC's "matching its
   piece hue."
6. **60fps-friendly** — `box-shadow` is GPU-composited and layout-free; the epic wants cheap,
   static visual juice. No animation in this ticket (keyframes are a separate E-004 ticket).
7. **Verification shape is fixed by precedent** — build+grep for the emit half, throwaway probe for
   the visible-bloom half, then revert; lint+build green; source diff = `globals.css` only.
