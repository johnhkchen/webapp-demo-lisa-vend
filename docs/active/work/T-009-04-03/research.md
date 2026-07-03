# T-009-04-03 — Research: page-header-clay-retone

## Ticket scope

`app/page.tsx` is the only file named in the AC. Three strings must disappear:
`from-cyan-400`/`via-fuchsia-400`/`to-violet-400`, `bg-clip-text`/`text-transparent` (on the
`<h1>`), and `text-white/50`/`text-white/30` (subtitle and footer `<p>`s). The title must render
in Lora; subtitle/footer move to "ink-on-cream" tones per the ticket Context line.

## Current file (`app/page.tsx`, 18 lines)

```tsx
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <header className="text-center">
        <h1 className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
          ROWCLEAR
        </h1>
        <p className="mt-2 text-sm text-white/50">Auto-play demo — press any key to play</p>
      </header>
      <GameContainer attract />
      <p className="text-xs text-white/30 text-center max-w-md">
        RowClear is an independent, non-commercial project ...
      </p>
    </main>
  );
}
```

Three text elements, no state, no props, no test file (`find` for `page.test.*` returns
nothing — this component has never had direct test coverage; `GameContainer`/`Board`/etc. carry
their own tests and are unaffected since this ticket touches only `page.tsx`).

## Font pipeline (`app/layout.tsx`, `app/globals.css`)

- `next/font/google` loads **Lora** at weights `["600", "700"]` only (`layout.tsx:5-10`) and
  **Karla** at `["400", "500", "700"]`. No weight 900 exists for either family.
- `globals.css:215-219` already routes all `h1`/`h2`/`h3` elements to `var(--font-lora)` by
  bare tag selector — **the `<h1>` already renders in Lora today**, just with `bg-clip-text` +
  `text-transparent` painting the gradient into the glyph shapes instead of a solid ink color.
  Removing the gradient/clip classes is what makes the existing Lora rendering *visible* as
  Lora rather than as a gradient swatch.
- `font-black` (weight 900) is currently applied to the `<h1>`. Per
  [[e-009-clay-retone-conventions]] (recorded during T-009-04-01), any heading moved onto Lora
  must drop `font-black` → `font-bold` (700) since no 900 weight is loaded — this was flagged
  in that memory as an open item specifically for this ticket and T-009-04-02.

## Token pipeline (`app/globals.css:15-23`)

```css
:root {
  --background: var(--clay-bg);   /* #faf8f5 warm off-white */
  --foreground: var(--clay-ink);  /* #1c1917 warm near-black */
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

`body` (in `layout.tsx:31`) already applies `bg-background text-foreground`, so plain text in
`page.tsx` inherits ink-on-cream by default — the `<p>` elements only need opacity-scaled
variants of `text-foreground` to read as muted-ink-on-cream, not a new color family. This exact
substitution (`text-white/N` → `text-foreground/N`, or `text-background/N` against a dark
scrim) is precisely what T-009-04-01 did for `GameOverlay.tsx` (see
`docs/active/work/T-009-04-01/design.md`, "Option A — chosen").

**No `--color-primary` (or any steel-blue) Tailwind token exists yet.** `styles/vendor/b28-clay.css:24`
defines `--clay-primary: #44679b` (steel blue) in `:root`, but `globals.css`'s `@theme inline`
block only bridges `--clay-bg`/`--clay-ink` today (confirmed via grep — zero hits for
`color-primary`/`text-primary`/`bg-primary` anywhere in `app/`, `components/`, or `styles/`).
The ticket title ("page-header-clay-retone") and Context line ("plain Lora/steel-blue heading")
call for the `<h1>` specifically to land on steel blue, not on `--foreground` (ink) — that's a
third color, distinct from the ink/cream pair the subtitle/footer use.

[[e-009-clay-retone-conventions]] anticipated exactly this: "add new `@theme inline` bindings
for other `--clay-*` tokens if a component needs e.g. ... `--clay-primary` — follow the same
binding pattern rather than arbitrary values." This ticket is that anticipated follow-up.

## Precedent: T-009-04-01 (`GameOverlay.tsx`, done) and T-009-04-02 (`StartOverlay.tsx`, open)

- T-009-04-01 retoned a gradient-clip `<h2>` to `text-background` (a *dark scrim* with light
  text) and dropped `font-black` → `font-bold`. Same gradient strings, opposite background
  (overlay is a dark layer over the board; `page.tsx`'s header sits directly on the light page
  body) — so the target color differs (steel-blue primary here, not `text-background`), but the
  mechanics (token reuse, weight fix) carry over directly.
- T-009-04-02 (StartOverlay "Press Start" pill) is still in `phase: research`, unrelated to this
  ticket's file, and out of scope — it targets `.clay-button`, a button primitive, not heading
  text.
- Neither precedent introduced a new `@theme inline` binding; this ticket will be the first.

## Constraints / assumptions surfaced

- No test file exists for `page.tsx` today; verification is build/lint/manual-render, not a
  Vitest/RTL suite. No new test file is implied by the AC (unlike T-009-04-01's AC, which named
  `GameOverlay.test.tsx` explicitly).
- `GameContainer attract` (the game board itself) is unaffected — its own retone tickets are
  tracked separately (T-009-01-xx, T-009-02-xx, T-009-03-xx per the dependency chain).
- The footer copyright/disclaimer text and the subtitle are both plain `<p>` tags with no
  semantic distinction beyond size/position — both map onto the same ink-on-cream family, just
  different opacity steps (matching the existing `/50` vs `/30` split).
- `max-w-md` and `text-center` on the footer, and `mt-2`/`text-sm` on the subtitle, are layout
  classes untouched by this retone — only color/font-weight classes are in scope.
