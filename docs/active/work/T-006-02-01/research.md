# Research — T-006-02-01: run-vinext-check-resolve-app-router-findings

## Ticket intent

Confirm that vinext's App Router compatibility actually covers this app's usage.
Run `vinext check`, and resolve any surfaced App Router findings **without touching
`lib/` logic or gameplay**. Fixes are permitted only if they are config/framework-glue.
Real code changes are out of scope — they get logged as a split-out signal instead.

This is a **verification-gated** ticket: the work is dominated by running a tool and
interpreting its output, not by writing product code. The size of the Implement phase
is entirely determined by what `vinext check` surfaces.

## Where this sits in the epic

- Depends on `T-006-01-02` (add `vite.config.ts`, flip `dev`/`build`/`start` to vinext).
  That ticket already landed the runtime swap; this ticket validates App Router compat
  on top of it.
- Advances P3 / E-006 (the vinext + Cloudflare Workers migration).
- Sibling `T-006-01-01` added the vinext + vite@7 + plugin-rsc build deps.

## Current stack (from `package.json`)

- `next@16.2.9`, `react@^19.2.7`, `react-dom@^19.2.7`, `react-server-dom-webpack@^19.2.7`
- `vinext@^0.2.0` (installed: **v0.2.0**)
- `vite@^8.1.2`, `@vitejs/plugin-react`, `@vitejs/plugin-rsc`, `@mdx-js/rollup`
- Scripts already flipped: `dev`/`build`/`start` → `vinext …`; `test` → `vitest run`
- `vite.config.ts` present: single `vinext()` plugin (auto-registers plugin-rsc +
  plugin-react, resolves the `@/* → ./*` tsconfig path alias). Canonical `vinext init` shape.

## App Router surface (what vinext must cover)

The App Router footprint is deliberately tiny — this is a client-side Tetris game.

- `app/layout.tsx` — root layout (Server Component). Imports `Metadata` **type** from
  `next` and `./globals.css`. Exports `metadata`. Renders `<html>/<body>` + `{children}`.
- `app/page.tsx` — home route (Server Component). Renders static header markup + the
  `<GameContainer />` client component via the `@/components` alias.
- `app/globals.css` — Tailwind v4 CSS-first (`@import "tailwindcss"`) + theme tokens.
- `app/favicon.ico` — static asset.

No other routes, no route groups, no dynamic segments, no `loading.tsx`/`error.tsx`,
no route handlers (`route.ts`), no server actions, no middleware.

### Client/server boundary

- `"use client"` files: `components/GameContainer.tsx`, `components/useGame.ts`,
  `components/useAnimationFrameLoop.ts`. These are the interactive game shell.
- Everything under `lib/` is pure, framework-free logic (tetrominoes, board, collision,
  rotation, gravity, scoring, RNG, line-clear, overlay). No React, no `next` imports.
- The only `next` import in the whole `app/`+`components/` tree is the `Metadata` **type**
  in `app/layout.tsx` — type-only, erased at build. No runtime `next` API usage
  (`headers()`, `cookies()`, `next/navigation`, `next/image`, `next/font`, etc.).

## Dynamic-API usage (the classic App Router incompatibility risk)

Grep confirms **no** usage of the dynamic App Router APIs that typically break under
alternative runtimes: no `headers()`, `cookies()`, `draftMode()`, `useSearchParams`,
`redirect`/`notFound`, `next/image`, `next/font`, route handlers, or server actions.
The app is effectively a single static shell that mounts a client-side game loop.
This is the single most important research finding: the app's App Router usage is
near-minimal, so the compatibility risk surface is very small.

## `vinext check` — what the tool is

`vinext v0.2.0` exposes `vinext check`: "Scan Next.js app for compatibility." It performs
**static analysis** of project structure, libraries, and App Router features and prints a
compatibility report with counts of supported / partial / issue items. It is the exact
command named in the acceptance criteria.

Observed limitation (from `vinext build` output): static analysis "cannot detect dynamic
API usage (`headers()`, `cookies()`, etc.) at build time," so routes with such usage are
classified `? Unknown`. For this app that caveat is moot — there is no dynamic API usage.

## Constraints & boundaries

- **Do not touch `lib/`** or component render logic — must stay byte-for-byte identical.
- Fixes, if any, must be **config/framework-glue only**.
- If `check` surfaces something needing real code changes → **log a split-out signal**,
  do not absorb it here.
- Verification must reflect the app's **actual usage** (AC wording), so a static check
  alone is weak evidence — a real `vinext build` + the existing test suite corroborate it.

## Assumptions

- `vinext@0.2.0`'s `check` is authoritative for the "zero unresolved incompatibilities"
  gate named in the AC.
- The build artifact directory produced by `vinext build` (`dist/`) is not intended to be
  committed; it is currently **not** in `.gitignore` (only `/.next/` is). Noted for a
  build/deploy ticket — out of scope here.
