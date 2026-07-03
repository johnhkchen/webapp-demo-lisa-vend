# T-009-04-01 — Structure: overlay-banners-clay-retone

## Files touched

### Modified: `components/GameOverlay.tsx`

Single-file change. No new props, no new exports, no signature change to
`GameOverlayProps` or the component's public interface — purely a `className`/doc-comment edit
inside the existing render body.

- **Outer `<div>` (line 49 today):** `className` string edited in place. Remove `bg-black/70`
  and `backdrop-blur-sm`; add `bg-foreground/70`. All other classes
  (`absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg text-center`)
  unchanged.
- **`<h2>` (line 51 today):** `className` string replaced. Remove the gradient/clip/transparent
  group (`bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text
  text-transparent`) and `font-black`. Add `text-background` and `font-bold`. Unchanged:
  `text-3xl tracking-tight sm:text-4xl`. Children/text content (`{paused ? "PAUSED" : "GAME
  OVER"}`) untouched.
- **`<p>` (line 54 today):** `className` string edited. Remove `text-white/70`, add
  `text-background/70`. Unchanged: `text-sm`. Children untouched.
- **Doc comment (lines 1-23):** one sentence in the closing paragraph (currently "Styling here
  is deliberately plain: a legible banner, not a show") gets a clause noting the palette is now
  the clay kit, not the app's former neon/glass one — documentation only, no code-shape change.

No other part of the file (props interface, the `visible`/`paused` early-return logic, the
`mode` default) changes.

## Files NOT touched (and why)

- `components/GameOverlay.test.tsx` — Research confirmed assertions are role/textContent only;
  the retone doesn't change either. No edit needed to keep it green.
- `components/StartOverlay.tsx`, `app/page.tsx` — same gradient idiom, explicitly out of this
  ticket's AC (Design Option list, non-goals).
- `app/globals.css`, `styles/vendor/b28-clay.css` — Design's chosen option (A) reuses
  already-registered `--color-background`/`--color-foreground` tokens; no new token, no new
  `@theme` entry, no kit-file edit required.
- `app/layout.tsx` — font loading already covers the weights this change needs (600/700); no
  change to the font loader.

## Module boundaries / interfaces

Unaffected. `GameOverlay` remains a pure, props-driven, stateless presentational component with
the same public props (`visible`, `mode`, `score`, `lines`) and the same two-`role` contract
(`alert` for game-over, `status` for paused) that `GameContainer` (its only consumer) and the
test suite depend on. This is a leaf-node visual change with no ripple into consumers.

## Ordering

Single atomic edit — one file, one coherent set of class-string replacements. No sequencing
concern (nothing else depends on an intermediate state). Verify via the existing test file
(no changes needed there) immediately after editing.

## Verification surface

- `npm test -- components/GameOverlay.test.tsx` (or `npx vitest run components/GameOverlay.test.tsx`)
  must stay green with zero test-file edits — the AC's explicit correctness bar.
- Visual/manual check (dev server or a quick render) that: no `from-cyan-400`, `via-fuchsia-400`,
  `to-violet-400`, or `bg-black/70` substrings remain in the file (AC's literal wording), the
  banner text is legible (light-on-dark contrast preserved), and the heading renders in the
  Lora font stack (inherits from the global `h2` selector — no new assertion needed since this
  was already true before this ticket, confirmed in Research).
