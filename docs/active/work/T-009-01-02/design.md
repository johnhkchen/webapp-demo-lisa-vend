# T-009-01-02 — Design: wire-clay-tokens-into-tailwind-theme

## Decision up front

Add `@import "../styles/vendor/b28-clay.css";` as the second line of `app/globals.css`
(right after `@import "tailwindcss";`), then repoint the existing `--background`/
`--foreground` `:root` vars to `var(--clay-bg)`/`var(--clay-ink)` instead of the hardcoded
hex values. Leave the `@theme inline` block, `<body>` usage, and every other block in
`globals.css` untouched.

```css
@import "tailwindcss";
@import "../styles/vendor/b28-clay.css";

:root {
  --background: var(--clay-bg);
  --foreground: var(--clay-ink);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

## Options considered

### A — Import the kit + redirect `--background`/`--foreground` through `var(--clay-*)` (chosen)

As above. Keeps the existing `--background`/`--foreground` → `@theme inline` →
`--color-background`/`--color-foreground` → `bg-background`/`text-foreground` pipeline fully
intact; only the *source* of the two `:root` values changes, from a literal hex to a
reference into the newly-imported kit tokens.

**Why this wins:**
- Matches the ticket's literal instruction: "bridged through `@theme inline` the same way the
  existing background/foreground pipeline already works." This is the pipeline, unmodified.
- Zero consumer-side change. `app/layout.tsx`'s `bg-background text-foreground` classes keep
  working with no edit — the utility names don't change, only what color they resolve to.
- One-hop indirection (`--background: var(--clay-bg)`) means if the kit ever renames
  `--clay-bg`, exactly one line in `globals.css` needs updating, not every consumer.
- Small, obviously-correct diff: two `:root` value edits + one `@import` line.

### B — Map kit tokens directly into `@theme inline`, dropping the `--background`/`--foreground` indirection

```css
@theme inline {
  --color-background: var(--clay-bg);
  --color-foreground: var(--clay-ink);
}
```

**Rejected.** Removes the `:root` `--background`/`--foreground` layer entirely. This works
functionally (Tailwind v4 allows `@theme inline` to reference any custom property in scope),
but it throws away the indirection the file's own header comment calls out as the intentional
"token -> utility" pipeline shape, and it's a bigger diff than the ticket asks for (deletes a
`:root` block instead of editing two values in it). Also makes a future non-kit override (e.g.
a local dark-mode toggle overriding just `--background`) harder to reintroduce later, since
there'd be no semantic `--background` var left to override.

### C — `@import` the kit at the top of `globals.css` and use kit classes (`.b28-clay`) on `<body>` instead of touching `--background`/`--foreground`

E.g. add `className="b28-clay"` in `app/layout.tsx` and let the kit's own
`.b28-clay { background-color: var(--clay-bg); color: var(--clay-ink); }` rule do the work.

**Rejected.** The acceptance criterion is specifically about `--color-background`/
`--color-foreground` resolving to the new values — this option bypasses that pipeline
entirely and drives the visual result through a different mechanism (a plain class, not the
Tailwind theme token). It would leave `--color-background`/`--color-foreground` still
resolving to the old hex values (unused, but present and wrong), which fails the letter of
the acceptance criterion even if the rendered page looked right. It also touches
`app/layout.tsx`, which the ticket doesn't ask for and which is more naturally
`T-009-01-03`'s territory (font loading also touches `layout.tsx`).

### D — Copy the two hex values from the kit into `globals.css` as new literals (`#faf8f5`/`#1c1917`) without an `@import`

**Rejected outright.** Fails the acceptance criterion's explicit first clause: "`app/
globals.css` imports the vendored kit file." Also defeats the entire point of vendoring via
`just sync-kit` (T-009-01-01) — a future kit re-sync would silently stop propagating if colors
are hand-copied instead of referenced live via `var()`.

## Rejected micro-alternatives within Option A

- **Import path as `@import "../styles/vendor/b28-clay.css"` vs. a `~`/alias path.** No path
  alias exists for `styles/` in this repo (checked `tsconfig.json`/no `vite-tsconfig-paths`
  entry for a CSS alias), and CSS `@import` doesn't resolve TS path aliases anyway — plain
  relative path is correct and is what Tailwind v4's native CSS import resolution expects.
- **Mapping `--foreground` to `--clay-primary` instead of `--clay-ink`.** Rejected — `-primary`
  is the steel-blue accent color (for buttons/links), not body text. `--clay-ink` is
  explicitly documented in the kit as "warm near-black text," the direct foreground analog,
  and matches the ticket title's own wording ("warm off-white/ink").
- **Importing the kit at the bottom of `globals.css` instead of near the top.** CSS `@import`
  must appear before any non-`@import`/`@charset` rules to be valid — since `globals.css`
  already has rules (the `:root` block, `@theme` blocks) below line 2, the kit import must go
  immediately after the existing `@import "tailwindcss"` line, not later in the file.

## What stays untouched (explicit non-goals, confirmed against E-009 scope)

- The `@theme static` oklch piece-color block, `.glass`, `.glow*`, `.flash`, `.motion*` — all
  E-004-era dark-neon/glass material that other E-009 tickets (S-009-02+) own.
- `app/layout.tsx` — no class changes; `bg-background text-foreground` already does the right
  thing once the underlying vars change.
- Font loading (`--clay-font-display`/`--clay-font-body`) — explicitly T-009-01-03.
- The kit's own primitive classes (`.clay-surface`, `.clay-well`, `.clay-button`, `.clay-chip`)
  — unused by this ticket; later tickets adopt them on specific components.
