# Progress — T-001-01-01: scaffold-nextjs-approuter-typescript-project

## Status: COMPLETE — all acceptance checks green

## What was done (vs. plan.md)

| Plan step | Status | Notes |
|---|---|---|
| 1. Generate scaffold | ✅ | Generated in a temp dir (repo non-empty), copied config + `app/` + `node_modules` in. Repo `CLAUDE.md` preserved (generator's own CLAUDE.md/AGENTS.md/README.md NOT copied). |
| 2. Confirm raw build | ✅ | `npm run build` exit 0 before customization. |
| 3. Prune demo content | ✅ | Deleted `public/*` demo SVGs (dir now empty); rewrote `page.tsx`, `globals.css`, `layout.tsx`. |
| 4. `lib/constants.ts` | ✅ | Pure `COLS = 10`, `ROWS = 20`. |
| 5. `components/Board.tsx` + wiring | ✅ | Static CSS-grid placeholder; `page.tsx` renders `<Board/>`. |
| 6. Full verification | ✅ | lint / build / dev-boot all pass (see below). |
| 7. Lockfile finalize | ✅ | `package.json` name → `webapp-demo-lisa-vend`; `npm install` regenerated lock consistently. |

## Installed toolchain (as wired by the current generator)

- **Next.js 16.2.9** (App Router, Turbopack build), **React 19.2.4**
- **Tailwind v4** (CSS-first: `@import "tailwindcss"` + `@tailwindcss/postcss`; no
  `tailwind.config.*` needed — matches Design decision 2, option A)
- **ESLint 9** flat config (`eslint.config.mjs`, `next/core-web-vitals` + `next/typescript`)
- **TypeScript 5**, strict, `@/*` path alias → repo root

## Deviations from plan / design

1. **Lint script is `eslint`, not `next lint`.** Next 16 removed `next lint`; the generator
   wires `"lint": "eslint"` against the flat config. Functionally equivalent; CLAUDE.md's
   `npm run lint` works. No action needed.
2. **Dropped the Geist Google-font imports** from `layout.tsx`. The generator's default
   pulls `next/font/google` (Geist/Geist_Mono), which fetches from Google Fonts at build
   time — a network dependency that can break a clean/offline build. Replaced with a
   system-font stack in `globals.css`. Reduces clean-checkout risk; the theme epic can add
   a self-hosted display font later.
3. **`next-env.d.ts` is gitignored** (generator default in Next 16), not committed as
   Structure suggested. Next regenerates it on every `dev`/`build`, so a clean checkout is
   still reproducible. Followed the generator default rather than forcing a commit.
4. **`public/` left empty** after pruning demo SVGs. Empty dir is not tracked by git; Next
   does not require `public/`. Harmless.

## Verification results

- `npm run lint` → **exit 0**, zero warnings/errors (also satisfies sibling T-001-01-02's
  target).
- `npm run build` → **exit 0**, static prerender of `/` and `/_not-found`.
- `npm run dev` + `curl localhost:3000` → **HTTP 200**; response contains the `TETRIS`
  heading and the `aria-label="Tetris board (placeholder)"` grid with all 200 cell divs.

## Files created / modified

- Created: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`,
  `next-env.d.ts` (gitignored), `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`,
  `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/favicon.ico`,
  `components/Board.tsx`, `lib/constants.ts`.
- Pruned: demo SVGs from `public/`.

## Commits

- `chore: scaffold Next.js App Router + TypeScript + Tailwind + placeholder board`
  (single squashed scaffold commit — see review.md for rationale on granularity).
