# T-009-01-03 — Structure: load-lora-karla-fonts

## Files modified (no files created or deleted)

### `app/layout.tsx`

- Add `import { Lora, Karla } from "next/font/google";` at the top, alongside the existing
  `import type { Metadata } from "next";` / `import "./globals.css";`.
- Add two module-level `const` font loader calls (`lora`, `karla`) per design.md's call shape,
  each exposing a `variable` (`--font-lora`, `--font-karla`).
- Extend the `<html>` element's existing `className="h-full antialiased"` to also include
  `${lora.variable} ${karla.variable}` (template-literal className, since it's now composed from
  three sources instead of one static string).
- No change to `<body>`'s className (`min-h-full flex flex-col bg-background text-foreground`
  stays exactly as-is — this ticket does not touch the background/foreground pipeline
  T-009-01-02 wired).
- No change to `metadata` or the `RootLayout` function signature/children handling.

Public interface: none — `layout.tsx` exports only the default `RootLayout` component and
`metadata`, both unchanged in shape. The two CSS custom properties (`--font-lora`, `--font-karla`)
become available on every element under `<html>`, which is the "interface" downstream
components/CSS now get to depend on.

### `app/globals.css`

One edit, at the existing tail-of-file block (current lines 206-213):
```css
html,
body {
  height: 100%;
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```
becomes:
```css
html,
body {
  height: 100%;
}

body {
  font-family: var(--font-karla), var(--clay-font-body);
}

h1,
h2,
h3 {
  font-family: var(--font-lora), var(--clay-font-display);
}
```
- The `body` rule's value changes (system-ui stack → Karla variable + kit fallback token).
- One new rule (`h1, h2, h3`) is added immediately after it — no existing rule touched or
  reordered elsewhere in the file. All the unrelated in-flight E-004 theme hunks (piece palette,
  `.glass`, `.glow*`, `.flash`, `.motion*`, and the `:root`/`@theme inline` block from
  T-009-01-02) are left untouched, above this tail block.
- No change to the two `@import` lines at the top of the file.

Public interface: none new — this is a plain CSS file with no exports. The *effective* interface
is "what font-family a bare `<body>` or `h1`/`h2`/`h3` resolves to," which changes from
`system-ui` to Karla/Lora respectively — that's the acceptance criterion's actual subject.

## Ordering

Single-step, no cross-file sequencing risk:
1. Edit `app/layout.tsx` first (defines `--font-lora`/`--font-karla`).
2. Edit `app/globals.css` second (consumes those variables — if globals.css were edited first,
   the vars would be undefined in dev until layout.tsx catches up, but this is a same-commit
   change so there's no observable intermediate state either order).
3. Verify via `npm run build` + `npm run dev` (no code depends on build/verify ordering beyond
   "both files exist before either command runs").

## Module boundaries

No new module boundary. `next/font/google` usage stays confined to `app/layout.tsx` — the one
place Next.js expects root font loaders to live (consistent with the removed Geist setup
T-001-01-01 described, and with Next's own convention of loading fonts once at the root and
distributing via CSS variables rather than importing the font loader into every component that
needs a heading style).

## Test-code changes

None planned (see design.md's "explicitly out of scope" + research.md's testing-landscape
section: `vitest.config.ts` doesn't run the vinext Google-Fonts Vite transform, and this ticket's
own acceptance criterion specifies dev-server-render verification, not a unit test). Plan.md
below still defines the concrete manual/dev-server verification steps that stand in for it.
