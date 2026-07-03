# T-009-04-03 — Design: page-header-clay-retone

## Decision up front

Two changes, one in each file:

1. **`app/globals.css`** — add one new token binding, following the exact pattern
   [[e-009-clay-retone-conventions]] anticipated:
   ```css
   :root {
     --background: var(--clay-bg);
     --foreground: var(--clay-ink);
     --primary: var(--clay-primary);
   }
   @theme inline {
     --color-background: var(--background);
     --color-foreground: var(--foreground);
     --color-primary: var(--background: var(--primary));
   }
   ```
   (see Structure for the exact diff — written out fully there to avoid a transcription error
   here). This makes `text-primary` / `bg-primary` / `border-primary` etc. available as a
   Tailwind utility family, mirroring exactly how `background`/`foreground` were wired.

2. **`app/page.tsx`** — swap three class groups:
   - `<h1>`: drop `bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text ...
     text-transparent`, replace with `text-primary`; drop `font-black` → `font-bold`.
   - Subtitle `<p>`: `text-white/50` → `text-foreground/50`.
   - Footer `<p>`: `text-white/30` → `text-foreground/30`.

Resulting markup:
```tsx
<h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl">
  ROWCLEAR
</h1>
<p className="mt-2 text-sm text-foreground/50">Auto-play demo — press any key to play</p>
...
<p className="text-xs text-foreground/30 text-center max-w-md">...</p>
```

## Options considered

### A — New `--color-primary` token bound to `--clay-primary`, `<h1>` uses `text-primary`; subtitle/footer use `text-foreground/N` (chosen)

**Why this wins:**
- **Matches the ticket's own words.** The Context line asks for a "Lora/**steel-blue**
  heading" and "ink-on-cream" subtitle/footer — two distinct color families, not one. Steel
  blue (`--clay-primary`, `#44679b`) is a brand-identity color per the user's global CLAUDE.md
  ("steel blue `#44679b` on warm off-white ... cream"); `--foreground`/ink is a different token
  entirely. Reusing `text-foreground` for the `<h1>` (as GameOverlay's `text-background` did)
  would satisfy the letter of the AC (no gradient strings, Lora renders) but miss the ticket's
  explicit color intent.
- **Follows the exact convention laid down for this situation.** [[e-009-clay-retone-conventions]]
  already anticipated this token gap in T-009-04-01 and prescribed the fix: extend `@theme
  inline` with a new binding rather than reach for arbitrary-value syntax (`text-(--clay-primary)`).
  This keeps every color reference in the codebase going through named, theme-registered
  utilities — zero exceptions after this change.
- **Small, additive CSS change.** One new `:root` var + one new `@theme inline` line. No
  existing binding is touched; `--color-background`/`--color-foreground` behavior is unchanged.
- **Reusable beyond this ticket.** `text-primary`/`bg-primary`/`border-primary` become available
  to any future component that needs the brand steel-blue (T-009-04-02's `.clay-button` already
  gets steel blue for free from the kit's raw CSS class, so this is additive, not a duplicate
  path).

### B — Reuse `text-foreground` for the `<h1>` (no new token), matching T-009-04-01's mechanism exactly

**Rejected.** Would pass the literal AC checklist (gradient strings gone, Lora renders) but
produces an ink-colored (near-black) heading, not steel blue — contradicts the ticket's Context
line verbatim. Also wastes the fact that `--clay-primary` already exists in the vendored kit
specifically for this purpose (brand accent color) — using ink instead makes the page's one
brand-color moment (the game's own title) indistinguishable from body text.

### C — Arbitrary-value syntax: `text-(--clay-primary)` directly against the raw kit variable, skipping a new `@theme inline` binding

**Rejected.** Exactly the path [[e-009-clay-retone-conventions]] already evaluated and rejected
for `--clay-bg`/`--clay-ink` in T-009-04-01, for the same reason: it introduces a second color
idiom (arbitrary CSS-variable syntax) alongside the codebase's established named-token
convention, for zero functional gain — `@theme inline` binding costs three lines and keeps one
idiom.

### D — Add the `--color-primary` binding but keep it unused elsewhere (only `page.tsx` consumes it) vs. also retrofitting `GameOverlay`/`StartOverlay` to use it

**Out of scope.** T-009-04-01 is `done` (closed ticket, don't reopen/edit its committed
diff) and T-009-04-02 is a separate open ticket targeting `.clay-button` (which already gets
steel blue from the kit's own CSS, no Tailwind token needed). This ticket's blast radius is
`app/page.tsx` + one additive line in `app/globals.css`; touching either sibling component
would be scope creep into tickets that are closed or independently in flight.

### E — Use `--clay-primary-strong` (`#3a5885`, the "pressed" steel blue) instead of `--clay-primary` for extra contrast

**Rejected.** `--clay-primary-strong` is documented in the kit as the *pressed/active* state
color for interactive elements (buttons), not a static heading color — using it here would
misuse a state-token as a base-token and produce an inconsistency if a future ticket adds
`--color-primary-strong` for actual pressed-state styling. `--clay-primary` is the base brand
color and is what "steel-blue heading" plainly means.

### F — Drop `tracking-tight` or resize now that the gradient clip constraint is gone

**Rejected — no AC basis.** The AC only names color/transparency/gradient classes and font
family; `tracking-tight`, `text-5xl`/`sm:text-6xl` sizing are untouched layout/type-scale
decisions outside this ticket's stated scope. Changing them would be an uncontrolled visual
tweak alongside the requested one.

## Font weight note

`font-black` → `font-bold` follows [[e-009-clay-retone-conventions]] directly: Lora is loaded
at `["600", "700"]` only; 700 (`font-bold`) is the heaviest available weight, and using
`font-black` (900, not loaded) would make the browser synthesize/embolden the glyphs — a
visual inconsistency the memory flagged specifically for this ticket.
