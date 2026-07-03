# T-009-01-03 — Research: load-lora-karla-fonts

## Ticket

Stand up Lora (display) + Karla (body) font loading via `next/font/google` in `app/layout.tsx`.
`globals.css` still hardcodes a `system-ui` stack. Acceptance criterion: body carries Karla by
default, an h1/h2 renders in Lora, verified in a dev-server render (computed `font-family` no
longer `system-ui`). Depends on `T-009-01-02` (done — clay tokens wired into the Tailwind theme).

## Current state

### `app/layout.tsx`
Server component. `<html lang="en" className="h-full antialiased">`, `<body className="min-h-full
flex flex-col bg-background text-foreground">`. No font import of any kind today. `metadata.title
= "RowClear"`.

### `app/globals.css`
- Line 1-2: `@import "tailwindcss";` then `@import "../styles/vendor/b28-clay.css";`.
- Lines 15-23: `:root { --background: var(--clay-bg); --foreground: var(--clay-ink); }` bridged
  via `@theme inline` into `--color-background`/`--color-foreground` (wired by T-009-01-02).
- Lines 206-213 (tail of file): plain `html, body { height: 100%; }` and
  `body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }` — **this is
  the line the acceptance criterion says must stop winning.**
- No existing rule sets `font-family` on `h1`/`h2`/`h3` anywhere in the file.
- The rest of the file (piece palette, `.glass`, `.glow*`, `.flash`, `.motion*`) is unrelated
  E-004/E-007 theme work already in the working tree; none of it touches typography.

### `styles/vendor/b28-clay.css` (vendored kit, from T-009-01-01/`just sync-kit`)
Already defines the exact tokens this ticket needs to point real fonts at:
```
--clay-font-display: "Lora", "Lora Fallback", Georgia, serif;
--clay-font-body: "Karla", "Karla Fallback", system-ui, -apple-system, sans-serif;
```
It also ships an **opt-in** class, not applied anywhere in this repo:
```css
.b28-clay { font-family: var(--clay-font-body); ... }
.b28-clay h1, .b28-clay h2, .b28-clay h3 { font-family: var(--clay-font-display); ... }
```
Nothing in `app/` or `components/` currently adds the `.b28-clay` class to any element, so these
kit rules are inert today. The kit file is generated/vendored (per T-009-01-01's structure.md:
"nothing under `styles/vendor/` should be hand-edited") — it is not the place to add project-
specific wiring; that belongs in `app/globals.css` / `app/layout.tsx`, same division T-009-01-02
already followed for the background/foreground tokens.

### Consumers of `h1`/`h2` today
- `app/page.tsx` line 7: `<h1 className="bg-gradient-to-r from-cyan-400 via-fuchsia-400
  to-violet-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
  ROWCLEAR</h1>` — renders unconditionally on `/`, no Tailwind class here sets `font-family`.
- `components/GameOverlay.tsx` line 51: an `<h2>` with the same neon-gradient utility classes,
  rendered only when `visible` is true (game-over/pause banner) — not present in the DOM on
  initial load.
- No other `h1`/`h2`/`h3` elements exist in `app/` or `components/`.

Because `page.tsx`'s `h1` is the only heading guaranteed to be in the initial dev-server render,
it is the practical target for the "an h1/h2 heading renders in Lora" verification step.

## Toolchain: does `next/font/google` work under vinext?

Confirmed via `node_modules/vinext/dist/plugins/fonts.js`: vinext ships a dedicated
`vinext:google-fonts` Vite plugin (registered internally by the `vinext()` plugin in
`vite.config.ts` — no separate wiring needed, same pattern noted for `plugin-rsc`/`plugin-react`
in that file's own comment).

Mechanics: the plugin transforms any `import { X } from "next/font/google"` call site, replaces
it with a virtual module, and at build/dev time:
1. Fetches the Google Fonts CSS for the requested family/weights from `fonts.googleapis.com`.
2. Downloads the referenced `.woff2` files and caches them under `.vinext/fonts/<family-hash>/`.
3. Rewrites the cached CSS's `url(...)` references to a served path
   (`/<assetsDir>/_vinext_fonts/...`) and injects a `<style data-vinext-fonts>` block plus
   `<link rel="preload">` tags.
4. On production build (`writeBundle`), copies the cached `.woff2` files into
   `<clientOutDir>/<assetsDir>/_vinext_fonts/` so the rewritten URLs resolve at runtime.

So the font is **self-hosted** (served from the app's own origin, no runtime call to Google) —
the network dependency is confined to build/dev time (fetching the CSS + woff2 once, then
cached in `.vinext/fonts/`). This is the same shape as stock Next.js's `next/font/google`
behavior; vinext reimplements it rather than being incompatible with it.

## Prior art / tension to flag

`docs/active/work/T-001-01-01/review.md` (the original scaffold ticket) explicitly **removed**
a generator-provided `next/font/google` (Geist) import, with this stated rationale (its Concern
#1): "fetches from Google Fonts at build time — a network dependency that risks clean/offline
builds... If a branded display font is wanted, the theme epic should self-host it, not
reintroduce a build-time fetch."

This ticket's acceptance criterion explicitly directs the opposite: load Lora/Karla via
`next/font/google`. `next/font/google` *is* the self-hosting mechanism (per the vinext plugin
mechanics above) — the "network dependency" is a one-time build-time fetch, not a runtime
dependency on Google's CDN, which is the concern T-001-01-01 was actually flagging (offline/
air-gapped builds fail on first fetch until `.vinext/fonts/` is cached). This ticket is the
"theme epic" T-001-01-01 pointed at; Design should record this as a deliberate, ticket-directed
reversal, not an oversight.

## Testing landscape

- `vitest.config.ts` resolves the `@/*` alias only; it does not import the `vinext()` Vite
  plugin, so the `vinext:google-fonts` transform does not run under `vitest run`. No existing
  test imports `next/font/google` or renders `app/layout.tsx`. `app/layout.tsx`/`app/page.tsx`
  have no test files today (confirmed: `app/` contains only `layout.tsx`, `page.tsx`,
  `globals.css`, `favicon.ico`).
- Precedent from T-009-01-02 (also a CSS-token-wiring ticket, same epic): no new unit test added;
  verification was build output inspection + a live `npm run dev` + `curl` render, because the
  acceptance criterion is itself about computed browser styles, which vitest/jsdom without the
  vinext transform cannot faithfully reproduce.

## Constraints / assumptions carried into Design

- Must not hand-edit `styles/vendor/b28-clay.css` (generated, re-synced wholesale).
- Must not regress T-009-01-02's background/foreground token wiring or the unrelated in-flight
  E-004 theme hunks already in `app/globals.css`'s working tree.
- `npm run build` must keep succeeding (network access to Google Fonts must be available during
  this session's build — confirmed reachable in principle since `just sync-kit` already fetches
  from `b28.dev` in this same environment).
- Verification path is dev-server + curl/computed-style inspection, not a new automated test,
  mirroring the sibling ticket's precedent.
