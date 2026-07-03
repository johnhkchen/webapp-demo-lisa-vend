# T-009-04-01 — Research: overlay-banners-clay-retone

## Ticket scope

`GameOverlay.tsx` renders the game-over/paused banner over the board. AC requires:
- Remove `from-cyan-400`/`via-fuchsia-400`/`to-violet-400` gradient-clip heading.
- Remove `bg-black/70` dark-glass dim layer (also drop the accompanying `backdrop-blur-sm`,
  per the ticket Context's "clay-toned scrim" framing and CLAUDE.md's "no glass" mandate).
- Render in clay tones with a Lora heading.
- `GameOverlay.test.tsx` must still pass unmodified in behavior (it asserts on role/text
  content only, never on class names — confirmed below).

Dependency `T-009-01-03` (Lora/Karla font loading) is `phase: done`. Its `status` field still
reads `open`, but Lisa advances `phase` independently of `status` (rdspi-workflow.md §Ticket
Format) and the fonts are demonstrably wired (see below) — not a blocker.

## Current state of `components/GameOverlay.tsx`

Single default-export function component, props-driven, no state (`components/GameOverlay.tsx:36-59`).
Two variants gated by `mode`: `"gameOver"` (role="alert") and `"paused"` (role="status"). Shared
chrome, only role/heading/subtext differ. Returns `null` when `!visible`.

Current markup (lines 46-58):
```tsx
<div
  role={paused ? "status" : "alert"}
  className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/70 text-center backdrop-blur-sm"
>
  <h2 className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
    {paused ? "PAUSED" : "GAME OVER"}
  </h2>
  <p className="text-sm text-white/70">
    {paused ? "Press P to resume" : `Score ${score} · Lines ${lines}`}
  </p>
</div>
```

Three classes are the retone targets: the outer `bg-black/70 ... backdrop-blur-sm` dim layer,
the `h2`'s gradient-clip-text treatment, and the `p`'s `text-white/70` (implied by the AC's
"clay tones" — white-on-black text has no home once the black scrim is gone).

The doc comment block (lines 1-23) describes this as "deliberately plain: a legible banner, not
a show" and explicitly scopes out the animated neon juice (E-004's `.flash`/`.glow`) — this
retone stays inside that same restraint, it's a palette swap, not a redesign.

## `GameOverlay.test.tsx` — what it actually asserts

6 tests (`components/GameOverlay.test.tsx:9-56`). All assertions are on `role` (`alert`/`status`,
via `getByRole`/`queryByRole`) and `textContent` (regex match on "game over"/"paused"/score/
lines/"press p to resume") or DOM presence (`container.firstChild === null` when hidden). **Zero**
assertions touch `className` or any visual/color property. Any styling change is free-form as
long as: the two `role`s stay attached to the two variant `<div>`s, the heading/subtext copy is
unchanged, and hidden still renders `null`. This gives full latitude on the clay retone.

## The vendored clay kit — `styles/vendor/b28-clay.css`

Imported globally in `app/globals.css:2` (`@import "../styles/vendor/b28-clay.css";`, landed by
`T-009-01-01`). Defines (all under `:root`, so available everywhere, no scoping needed):

- Palette tokens: `--clay-bg` (#faf8f5), `--clay-surface`/`--clay-surface-raised` (raised clay),
  `--clay-well` (#ece7dd, recessed), `--clay-border`, `--clay-ink` (#1c1917), `--clay-ink-soft`
  (#736b66, muted text), `--clay-primary` (#44679b steel blue) + `--clay-primary-strong`,
  `--clay-on-primary` (white).
- Type tokens: `--clay-font-display` (Lora stack), `--clay-font-body` (Karla stack).
- Radii: `--clay-radius-sm/base/lg/pill`.
- Shadow recipes: `--clay-shadow-raised` (warm drop + top-left highlight), `--clay-shadow-pressed`,
  `--clay-shadow-well` (deeper recess, for boards/inputs).
- Motion: `--clay-ease`, `--clay-press`.
- Primitive classes: `.b28-clay` (root opt-in: bg/color/font), `.clay-surface` (raised panel),
  `.clay-well` (recessed panel — "things you look INTO"), `.clay-button`(+`--soft` variant),
  `.clay-chip` (small raised token).

None of these primitive classes or tokens are consumed anywhere in `components/` yet — this
would be the first component-level clay adoption (`T-009-02-01`, the piece-palette retone, only
touches `app/globals.css` `@theme` values, not component markup).

## How clay tokens already reach Tailwind utilities in this repo

`app/globals.css:15-23`:
```css
:root {
  --background: var(--clay-bg);
  --foreground: var(--clay-ink);
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```
This bridges `--clay-bg`/`--clay-ink` into Tailwind v4's `bg-background`/`text-foreground`
utilities (consumed today only by `app/layout.tsx:31`'s `<body>`). No other `--clay-*` token
(surface, well, border, ink-soft, primary) has a Tailwind utility binding yet — components that
want those must either add `@theme inline` entries, use arbitrary-value utilities
(`bg-[var(--clay-surface)]`), or use the kit's plain `.clay-surface`/`.clay-well` classes
directly (framework-agnostic, no Tailwind involvement, works via className exactly like today's
literal Tailwind strings).

## Font wiring — already live, no work needed here

`app/layout.tsx:5-17` loads Lora (weights 600/700) and Karla (400/500/700) via `next/font/google`,
exposing `--font-lora`/`--font-karla` CSS variables on `<html>` (line 30). `app/globals.css:211-219`:
```css
body { font-family: var(--font-karla), var(--clay-font-body); }
h1, h2, h3 { font-family: var(--font-lora), var(--clay-font-display); }
```
So **any** `<h2>` in the tree — including `GameOverlay`'s heading — already renders in Lora with
zero per-component change. The AC's "Lora heading" is satisfied by the existing `<h2>` tag once
the gradient-clip-text override (which doesn't change font-family but does force
`text-transparent` + a background gradient, visually masking whatever font renders underneath)
is removed. No `font-lora`-class or inline style is required, though one could be added for
explicitness/redundancy against future global-CSS changes.

## Sibling overlay not in scope: `StartOverlay.tsx`

`components/StartOverlay.tsx` has the same cyan/fuchsia/violet gradient-clip + `bg-black/50
backdrop-blur-sm` idiom (lines 32-36), and its own doc comment explicitly says it "uses the app's
cyan→fuchsia→violet gradient so it belongs to the same system as the title and the other
overlays." This ticket's AC only names `GameOverlay.tsx` — `StartOverlay.tsx` is out of scope
here (presumably a sibling ticket in `S-009-04`: `T-009-04-02`/`T-009-04-03`). Not touching it,
but noting the two will visually diverge until its own retone lands.

## `app/page.tsx` — also out of scope but same pattern

`app/page.tsx:7` has an identical gradient-clip `<h1>` for the app title. Same note as above:
not this ticket's AC, left untouched.

## Constraints / assumptions carried into Design

- No new dependency, no new global CSS needed — the clay kit is already fully vendored and
  imported.
- Styling can be done via the kit's plain classes (`.clay-surface`/`.clay-well`) or via
  Tailwind arbitrary-value utilities referencing `--clay-*` vars directly; both are valid,
  neither requires new `@theme` plumbing (Design phase picks one).
- "No glass" (CLAUDE.md) means `backdrop-blur-sm` should go, not just the black tint — the
  banner must sit as an opaque/near-opaque clay surface, not a frosted dim layer.
- Both variants (`alert/gameOver` and `status/paused`) share one chrome block; the retone
  should keep that single shared className, per the component's existing "read as one system"
  design intent.
