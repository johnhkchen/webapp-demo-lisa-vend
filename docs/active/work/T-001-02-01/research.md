# Research — T-001-02-01: wire-tailwind-styling

Descriptive map of the current styling ground. What exists, where, how it connects, and what
constraints bound this ticket. No solutions here — those are for Design.

## Ticket in one line

"Honor the assented Tailwind fork by wiring it end-to-end so the later neon/glass theme epic
inherits settled styling ground." Acceptance: Tailwind config + PostCSS + globals directives in
place, and a Tailwind utility class on a page element visibly takes effect in `npm run dev`,
surviving `npm run build`.

## Where styling currently lives

- `app/globals.css` — the single stylesheet. First line is `@import "tailwindcss";` (the
  Tailwind v4 CSS-first entry). Then a doc comment, a `:root` block with `--background`
  (`#0a0a0f`) / `--foreground` (`#ededf2`), an `@theme inline { --color-background / --color-foreground }`
  block, and raw base rules on `html, body` (height 100%) plus `body` (background/color from the
  CSS vars, system-font stack).
- `postcss.config.mjs` — one plugin: `{"@tailwindcss/postcss": {}}`. This is the v4 build hook.
- `app/layout.tsx` — imports `./globals.css`; `<html className="h-full antialiased">`,
  `<body className="min-h-full flex flex-col">`. Uses Tailwind utility classes.
- `app/page.tsx` — heavy Tailwind usage: gradient text (`bg-gradient-to-r from-cyan-400 …
  bg-clip-text text-transparent`), flex layout, spacing, `text-white/50`.
- `components/Board.tsx` — Tailwind grid/border/ring/shadow utilities plus a few inline
  `style` values for the dynamic grid template.
- No `tailwind.config.js/ts` file exists. Tailwind **v4** does not require one — content
  detection is automatic and theme customization is CSS-first via `@theme`.

## Toolchain (from package.json / lockfile)

- `next` 16.2.9 (build runs on Turbopack), `react`/`react-dom` 19.2.4.
- devDeps: `tailwindcss` `^4`, `@tailwindcss/postcss` `^4`, `eslint` `^9`, `typescript` `^5`.
- Scripts: `dev` = `next dev`, `build` = `next build`, `start` = `next start`, `lint` = `eslint`.

## How the pieces connect (build pipeline)

1. `next build`/`next dev` runs PostCSS with `@tailwindcss/postcss`.
2. That plugin reads `app/globals.css`, resolves `@import "tailwindcss"`, scans the project
   source for utility class usage (automatic content detection), and emits only the utilities
   actually referenced, plus any `@theme` tokens those utilities consume.
3. The emitted CSS is chunked into `.next/static/chunks/*.css` (prod) and served.

## Verified baseline (observed, not assumed)

- `npm run build` → **passes** (Next 16.2.9 / Turbopack, `/` + `/_not-found` prerendered
  static, TypeScript clean).
- Inspecting the emitted prod CSS (`.next/static/chunks/2kxp7h0m44l6u.css`, ~11 KB):
  - Utilities **actually used** in JSX are present: `bg-clip-text`, gradient utilities
    (`--tw-gradient-*`), etc. → Tailwind **is** wired and applying end-to-end today.
  - The `@theme inline` bridge utilities — `.bg-background`, `.text-foreground` — are
    **absent** from the output. So is the `--color-background` theme variable. Because nothing
    in the source references those utilities, Tailwind v4 emits neither the utility nor its
    backing token. **The token→utility bridge is defined but dead.**

## The central observation

Tailwind was wired *incidentally* by the scaffold ticket (T-001-01-01), which ran
`create-next-app --tailwind`. That ticket's own review and design explicitly scoped Tailwind as
"only needs to apply" and deferred all token/config expansion to "the theme epic." As a result:

- The **utility pipeline is proven** (used classes reach the browser).
- The **`@theme` token pipeline is unproven** — the one bridge that exists (`--color-background`
  / `--color-foreground` → `bg-background` / `text-foreground`) is declared in `globals.css` but
  consumed nowhere, so it never reaches the build output. The `body` still colors itself with
  raw `background: var(--background)` CSS, bypassing the Tailwind bridge entirely.

This is the seam this ticket sits on: the difference between "Tailwind happens to work" and
"Tailwind is wired end-to-end, token bridge included, as settled ground the theme epic extends."

## Constraints and boundaries (what bounds the work)

- **Do not build the neon/glass theme.** Vision/charter and the scaffold's own artifacts
  reserve theme tokens, glow, and animation for a later epic (E-002-family per the memory
  index). This ticket must not introduce brand colors, glow, or motion.
- **Do not re-litigate v3 vs v4.** The Tailwind fork is human-assented; v4 is installed. Adding
  a `tailwind.config.js` to force v3-style config would reopen settled ground.
- **Sibling ticket T-001-02-02** owns the `app/`/`components/`/`lib/` track boundary and a pure
  `lib/` placeholder. It shares `app/page.tsx`/layout scope loosely; coordinate to avoid
  competing edits. (Both depend only on T-001-01-01.)
- **Must survive `npm run build`.** The AC explicitly requires the utility proof to hold through
  a production build, not just dev.
- **`lint` must stay green** — the scaffold left a clean flat ESLint config; new code must not
  introduce warnings.

## Assumptions

- `node_modules` is installed (verified present); the environment can run `next build`.
- Tailwind v4's automatic content detection covers `app/` and `components/` (default behavior;
  confirmed by used utilities appearing in output).
- No JS-based Tailwind config is expected or wanted at this stage.

## Open questions for Design

- Is the legitimate delta of this ticket purely *verification* of the existing wiring, or does
  "end-to-end" fairly include **proving the `@theme` token bridge** by putting the generated
  `bg-background`/`text-foreground` utilities into real use (replacing the raw-CSS body colors)?
- If we touch `globals.css`/`layout.tsx`, how do we stay strictly inside "wire + prove" and
  outside "theme"?
