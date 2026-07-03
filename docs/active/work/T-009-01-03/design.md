# T-009-01-03 — Design: load-lora-karla-fonts

## Goal

Make `--clay-font-display`/`--clay-font-body` (already referenced by the vendored kit) resolve
to *actually loaded* Lora/Karla font files, loaded via `next/font/google` from
`app/layout.tsx`, and make that the default typography for `<body>` and `h1`/`h2`/`h3` app-wide
— without hand-editing the vendored kit file.

## Option A — Opt into the kit's `.b28-clay` class

Add `.b28-clay` to `<html>` or `<body>` in `layout.tsx`. The kit already ships:
```css
.b28-clay { font-family: var(--clay-font-body); }
.b28-clay h1, .b28-clay h2, .b28-clay h3 { font-family: var(--clay-font-display); }
```
Pair with `next/font/google` CSS variables by overriding `--clay-font-body`/`--clay-font-display`
in `globals.css` to prefer the loaded variable, e.g. `--clay-font-body: var(--font-karla),
"Karla", ...;`.

**Rejected.** The `.b28-clay` class also sets `background-color`/`color` on the scoped element
(`background-color: var(--clay-bg); color: var(--clay-ink);` — research, kit lines 67-72).
`<body>` already gets those exact values through the T-009-01-02 Tailwind pipeline
(`bg-background text-foreground`). Adding `.b28-clay` alongside would be a second, redundant path
to the same two properties — harmless today but a landmine: if the two ever drift (e.g. someone
re-syncs the kit and `--clay-bg` changes independent of `--background`), which one wins becomes a
specificity/source-order question nobody intends to answer. This ticket is scoped to fonts; it
should not open a second color-wiring path as a side effect.

## Option B — Plain element selectors in `globals.css`, no kit class needed

Load Lora/Karla in `layout.tsx` via `next/font/google`, exposing each as a CSS variable
(`variable: "--font-lora"` / `"--font-karla"`) applied via `className` on `<html>`. In
`globals.css`, replace the existing tail-of-file `body { font-family: system-ui... }` rule with:
```css
body {
  font-family: var(--font-karla), var(--clay-font-body);
}
h1, h2, h3 {
  font-family: var(--font-lora), var(--clay-font-display);
}
```
This is a **plain, unscoped** rule — no class to opt into, nothing else touches
`background`/`color`. It composes with the kit's existing `--clay-font-*` tokens as a fallback
chain (if the `next/font` variable is ever unavailable for some reason, it degrades to the kit's
own named-font reference, which itself falls back to `Georgia`/`system-ui`).

**Accepted.** Smallest change, no new class, no touching the vendored kit file, no duplicate
color-wiring path, matches the ticket's literal ask ("body carries Karla by default", "an
h1/h2 renders in Lora") without depending on which components choose to add `.b28-clay` later
(that decision — and any deeper clay retone of `page.tsx`'s neon-gradient heading — is out of
scope here per T-009-01-02's own scope note: "font loading... explicitly out of scope here (owned
by T-009-01-03 and S-009-02+)").

## Option C — Set `font-family` directly in `layout.tsx` via `className` on `<html>`/`<body>`, skip `globals.css` entirely

Apply `${lora.variable} ${karla.variable} font-karla` classes (a Tailwind arbitrary-value
utility) directly on `<body>`, and per-heading Tailwind utility classes wherever an `h1`/`h2`
appears.

**Rejected.** Requires touching every heading call site (`page.tsx`, `GameOverlay.tsx`, and any
future one) to add a Lora utility class by hand — easy to forget on the next new heading, whereas
a plain element selector in `globals.css` (Option B) applies automatically. Also would need a new
Tailwind `@theme` font-family utility (`font-karla`/`font-lora`) purely to move two rules that
already have an obvious CSS home; unnecessary indirection for this ticket's scope.

## Font-loading call shape

```ts
import { Lora, Karla } from "next/font/google";

const lora = Lora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-lora",
  display: "swap",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-karla",
  display: "swap",
});
```
- `subsets: ["latin"]` — required by `next/font/google` (no implicit default), and this app has
  no non-Latin copy today (research: only English UI strings).
- Weights: Karla (body) needs a normal (400) and a couple of emphasis weights (500 used by the
  kit's own `.clay-button` at `font-weight: 600` — research, kit line 97 — so 600 is included too,
  700 for any bold body text). Lora (display) is a heading-only face; 600/700 covers the current
  neon `font-black`-styled headings' visual weight intent reasonably (Lora tops out around 700 in
  Google Fonts' static weight set — no 900 exists for Lora, so `font-black` on `page.tsx`'s h1
  stays a CSS synthetic-bold fallback from the browser, unchanged from today; not this ticket's
  scope to fix).
- `display: "swap"` — avoid invisible text during font load (FOIT); standard `next/font` default
  is actually `"swap"` already but stating it explicitly makes the choice legible.
- Both variables applied via `className` on `<html>` (not `<body>`) so the CSS custom properties
  are available repo-wide (any future component under `<body>` can reference `var(--font-lora)`),
  consistent with how `className="h-full antialiased"` already sits on `<html>` rather than
  `<body>`.

## What's explicitly out of scope

- Retoning `page.tsx`'s/`GameOverlay.tsx`'s neon-gradient heading classes to clay colors — that's
  a later theme-epic concern (T-009-01-02's own review.md draws this same line).
- Adding `.b28-clay` anywhere (Option A, rejected above).
- Any change to `styles/vendor/b28-clay.css` itself.
- A new automated test asserting computed `font-family` (see Research: vitest doesn't run the
  vinext Google Fonts transform; sibling ticket precedent is dev-server-only verification, which
  this ticket's own acceptance criterion also names explicitly: "verified in a dev-server render").
