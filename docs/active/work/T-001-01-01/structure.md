# Structure — T-001-01-01: scaffold-nextjs-approuter-typescript-project

The file-level blueprint. Exact set of files created/modified/deleted, their
responsibilities, and public interfaces. No code here — the shape of the code.

Assumes the generator wires Tailwind v4 + flat ESLint (per Design). If the installed
tooling differs (Tailwind v3), the *files listed* adjust as noted inline; the tree shape
and responsibilities do not.

## Final tree (target end-state)

```
webapp-demo-lisa-vend/
├── package.json            # created — scripts, deps
├── package-lock.json       # created — committed for clean-checkout reproducibility
├── tsconfig.json           # created — TS + Next plugin + @/* path alias
├── next.config.ts          # created — Next config (minimal)
├── next-env.d.ts           # created (generated) — Next types; committed
├── postcss.config.mjs      # created — Tailwind/PostCSS pipeline
├── eslint.config.mjs       # created — flat config, next presets
├── .gitignore              # created — node_modules, .next, etc.
├── tailwind.config.ts      # created ONLY if generator wires Tailwind v3 (v4: omit)
├── app/
│   ├── layout.tsx          # created — root layout, imports globals.css, metadata
│   ├── page.tsx            # created — route "/", renders <Board/>
│   └── globals.css         # created — Tailwind entry + base page background
├── components/
│   └── Board.tsx           # created — static placeholder grid (CSS grid of cell divs)
├── lib/
│   └── constants.ts        # created — pure board dims (COLS, ROWS), framework-free
└── public/                 # generator may add; prune demo SVGs (see Deletions)
```

Directories `components/` and `lib/` are seeded with exactly one file each so downstream
epics inherit clean, non-colliding tracks.

## Files — responsibilities & interfaces

### `package.json`
- **Role:** dependency + script manifest.
- **Scripts (required by CLAUDE.md):** `dev` → `next dev`, `build` → `next build`,
  `start` → `next start`, `lint` → `next lint` (or `eslint` under flat config, whatever the
  generator wires).
- **Deps:** `next`, `react`, `react-dom`. **Dev:** `typescript`, `@types/*`, `tailwindcss`
  (+ `@tailwindcss/postcss` on v4 or `postcss`+`autoprefixer` on v3), `eslint`,
  `eslint-config-next`.
- **No** extra runtime deps — scaffold only.

### `tsconfig.json`
- **Role:** TypeScript config. Strict mode on, `jsx: preserve`, `moduleResolution:
  bundler`, Next plugin, and `paths: { "@/*": ["./*"] }` so `@/lib/...` and
  `@/components/...` resolve. `include` covers `next-env.d.ts`, `**/*.ts(x)`,
  `.next/types`.

### `next.config.ts`
- **Role:** Next configuration. Minimal — default export of a typed `NextConfig` object,
  no custom options needed for the scaffold. Present so downstream config has a home.

### `next-env.d.ts`
- **Role:** Next-generated ambient types. Committed (Next regenerates but expects it
  tracked). Not hand-edited.

### `postcss.config.mjs`
- **Role:** PostCSS pipeline that runs Tailwind. v4: `plugins: ["@tailwindcss/postcss"]`.
  v3: `plugins: { tailwindcss: {}, autoprefixer: {} }`.

### `eslint.config.mjs`
- **Role:** Flat ESLint config extending `next/core-web-vitals` + `next/typescript`.
  Owned-for-verification by sibling T-001-01-02; this ticket only ensures it is present,
  wired to `lint`, and green against the scaffold code. No custom rules added.

### `.gitignore`
- **Role:** ignore `node_modules/`, `.next/`, build output, `*.log`, `.env*`,
  `.DS_Store`. Ensures the committed tree is clean.

### `app/globals.css`
- **Role:** single global stylesheet, imported once by `layout.tsx`.
- **Content:** Tailwind entry (v4: `@import "tailwindcss";` / v3: the three `@tailwind`
  directives) plus a minimal base — full-height `body`, a dark background so the neon theme
  epic has a canvas, sensible `box-sizing`. No theme tokens yet.

### `app/layout.tsx`
- **Role:** root layout (Server Component). Renders `<html lang="en"><body>{children}</body>`,
  imports `./globals.css`, exports `metadata` (`title: "Tetris"`, a short description).
- **Interface:** default export `RootLayout({ children }: { children: React.ReactNode })`.

### `app/page.tsx`
- **Role:** the `/` route. Renders a centered container with a heading/placeholder and
  `<Board />`. Server Component (no client interactivity yet — no `"use client"`).
- **Interface:** default export `Home()`.
- **Imports:** `@/components/Board`.

### `components/Board.tsx`
- **Role:** presentational placeholder board — a CSS grid of empty cell `div`s proving the
  DOM/CSS-grid render approach and that Tailwind applies.
- **Interface:** default export `Board()` — **no props, no state, no hooks.** Deliberately
  trivial so the game epic replaces its body without a competing implementation.
- **Imports:** `COLS`, `ROWS` from `@/lib/constants` (proves alias + lib→component path).
- **Rendering:** an outer element with `display:grid` (Tailwind `grid` +
  `grid-template-*` via inline style or arbitrary classes) of `COLS × ROWS` cell divs,
  each an empty bordered square. Not wired to any game state.

### `lib/constants.ts`
- **Role:** pure, framework-free board dimensions.
- **Interface:** `export const COLS = 10;` `export const ROWS = 20;`. No React import, no
  side effects. Seeds the `lib/` track and proves purity boundary.

## Deletions / prunes (from generator output)

- Remove demo assets the generator drops in `public/` (`next.svg`, `vercel.svg`,
  `file.svg`, etc.) — not referenced by our board.
- Replace generator boilerplate in `app/page.tsx` and `app/globals.css` entirely with the
  files above.
- Decline `src/` layout (`--no-src-dir`); if generated anyway, move `app/` to root.

## Ordering that matters

1. Generate/author config + deps first (nothing compiles without `package.json`/tsconfig).
2. `lib/constants.ts` before `components/Board.tsx` (import target must exist).
3. `components/Board.tsx` before `app/page.tsx` (page imports Board).
4. `globals.css` + `layout.tsx` any time before first `dev`/`build`.
5. Verify (`dev`/`build`/`lint`) last, then commit including `package-lock.json`.

## Explicitly NOT in this structure

No game loop, tetromino/collision/scoring logic, `requestAnimationFrame`, neon/glass theme
tokens, animations, hold/ghost/preview components, localStorage, or Vercel config. Those
are downstream epics. `components/` and `lib/` hold one placeholder file each — no more.
