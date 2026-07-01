# Research — T-006-01-02 scaffold-vite-config-and-flip-package-scripts

Ticket: author the vinext/Vite config and repoint `dev`/`build`/`start` at vinext so the app
actually runs on the new runtime. Acceptance: `vite.config.ts` exists wiring `vinext()` +
`@vitejs/plugin-rsc`; `package.json` is ESM (`"type":"module"`) with `dev`/`build`/`start`
invoking vinext; `npm run dev` boots the app on the vinext dev server and the game renders at
localhost. Current phase: research.

Descriptive only. What exists, what vinext expects, where the two meet. No solution here.

## Where this ticket sits

Epic E-006 swaps the toolchain from Next's compiler + Vercel to **vinext** (Cloudflare's
Vite-based Next.js runtime) on Cloudflare Workers. Story S-006-01 (`scaffold-vinext-toolchain`)
has two tickets:

- **T-006-01-01 (done, `8f6c88d`)** — installed the deps: `vinext ^0.2.0`,
  `react-server-dom-webpack ^19.2.7` (dependencies); `vite ^7.3.6`, `@vitejs/plugin-rsc ^0.5.27`,
  `@vitejs/plugin-react ^5.2.0`, `@mdx-js/rollup ^3.1.1`, `vite-tsconfig-paths ^6.1.1`
  (devDependencies); bumped `react`/`react-dom` to `^19.2.7`. `npm ci` is clean/peer-clean.
- **T-006-01-02 (this)** — config + script flip. Make the app *run* on vinext.

Downstream (not this ticket): **S-006-02** runs `vinext check` and re-verifies build/lint/vitest;
**S-006-03** retires `vercel.json` + Next-compiler wiring and generates `wrangler.jsonc`. So the
boundary here is: add `vite.config.ts`, flip three scripts, flip package to ESM. Do **not** delete
`next.config.ts`/`vercel.json`, do **not** touch `lint`/`test`, do **not** generate
`wrangler.jsonc`, do **not** run `vinext deploy`.

## Current toolchain state

`package.json` scripts today (all Next-based):
```
dev:   next dev      build: next build      start: next start
lint:  eslint --max-warnings 0              test:  vitest run
```
No `"type"` field → package is CommonJS-shaped. All deps from T-006-01-01 are present. Node is
**v26.4.0** (vinext requires `>=22`, satisfied).

Config files present: `next.config.ts` (TS, sets `typescript.ignoreBuildErrors:false`),
`vitest.config.ts` (ESM, resolves the `@` alias for component tests), `postcss.config.mjs`
(`@tailwindcss/postcss`), `eslint.config.mjs` (flat config, ESM), `tsconfig.json`
(`paths: { "@/*": ["./*"] }`, `moduleResolution: bundler`), `vercel.json` (framework nextjs).
**There is no `vite.config.ts` today** — confirmed; only `vitest.config.ts` exists.

## App shape (what has to render)

App Router under `app/`: `layout.tsx` (server component, imports `./globals.css`, sets
metadata), `page.tsx` (server component, renders `<GameContainer/>` via the `@/components` alias).
`components/GameContainer.tsx` carries the `"use client"` directive; `useGame.ts` and
`useAnimationFrameLoop.ts` are also `"use client"`. So the render path is: **RSC server component
→ client-component island** — exactly the RSC boundary `@vitejs/plugin-rsc` exists to handle.
`app/globals.css` is Tailwind v4 (`@import "tailwindcss";`), compiled via `@tailwindcss/postcss`.

The `@/*` path alias is load-bearing: `page.tsx` does `import GameContainer from "@/components/GameContainer"`.
Whatever config we write must resolve it, or dev boot fails at import.

## How vinext expects to be configured (from the installed package)

vinext 0.2.0 is a Vite plugin. Key facts read from `node_modules/vinext/dist`:

- **`vinext()` default export** returns `PluginOption[]`. Its options (`index.d.ts`) include
  `rsc?: boolean` (**default `true`** — "Auto-register `@vitejs/plugin-rsc` when an `app/`
  directory is detected") and `react?: Options | boolean` (**default `true`** — auto-registers
  `@vitejs/plugin-react`). So a bare `vinext()` already wires **both** plugin-rsc and plugin-react.
- **tsconfig path aliases are handled internally**: `dist/config/tsconfig-paths.js`
  (`loadTsconfigResolutionForRoot`) reads `tsconfig.json`'s `paths`/`baseUrl` and feeds Vite's
  resolver. So `@/*` resolves without us adding `vite-tsconfig-paths` to the config by hand.
- **The config template vinext itself generates** (`dist/init.js` `generateViteConfig`) is exactly:
  ```ts
  import vinext from "vinext";
  import { defineConfig } from "vite";
  export default defineConfig({ plugins: [vinext()] });
  ```
  This is the canonical shape. It relies on vinext() to pull in plugin-rsc + plugin-react.
- **`next.config.*` is auto-loaded**: README + `dist/config/next-config.js`. Our `next.config.ts`
  (only `typescript.ignoreBuildErrors:false`) is read as-is; nothing there conflicts with vinext.
- **postcss**: vinext has `dist/plugins/postcss.js` and Vite natively reads `postcss.config.mjs`,
  so Tailwind v4 compilation is expected to work unchanged.

## CLI behavior (relevant to the script flip)

From `dist/cli.js`:
- `vinext dev` defaults to **port 3000** (`process.env.PORT ?? "3000"`) — matches CLAUDE.md's
  `localhost:3000`. (Note: `vinext init`'s *co-install* flow adds `dev:vinext` on port **3001** to
  avoid colliding with a still-live `next dev`; we are *replacing* dev, so plain `vinext dev` on
  3000 is correct.)
- `vinext build` = production build (multi-env: RSC + SSR + client). `vinext start` = local prod
  server. `--turbopack` is accepted as a no-op.
- README manual-migration recipe is precisely: replace `next` with `vinext` in `dev`/`build`/`start`.

## ESM flip surface (`"type":"module"`)

vinext's own package is `"type":"module"`, and `vinext init` step 4 adds `"type":"module"` to the
target `package.json`. Risk scan of what that flag changes here:
- `postcss.config.mjs`, `eslint.config.mjs` — already `.mjs` (explicit ESM). Unaffected.
- `next.config.ts`, `vitest.config.ts` — TS/ESM, loaded by bundlers. Unaffected.
- `vercel.json`, `tsconfig.json` — data files. Unaffected.
- **No `.js` CommonJS config files exist** → nothing needs renaming to `.cjs`. The flip is low-risk.

## Constraints & assumptions

- **`vinext()` alone satisfies "wiring vinext() + @vitejs/plugin-rsc"** because rsc defaults on.
  Design must decide whether to lean on that default or list plugin-rsc explicitly (the latter
  needs `rsc:false` to avoid double registration — a tradeoff Design will weigh).
- **Vitest coexistence**: adding `vite.config.ts` while `vitest.config.ts` exists — Vitest prefers
  its own config file, so the vinext plugin should not leak into the test run. Actual test
  re-verification is **S-006-02**, not gated here; flag as a watch item.
- Verification bar for *this* ticket is `npm run dev` booting + game rendering. `npm run build`,
  lint, and tests under vinext are **S-006-02**'s gate, not proven here.
- Keep `lint`/`test` scripts untouched; keep `next.config.ts`/`vercel.json` in place.
- Stray untracked `tetris.html` at repo root is unrelated; leave it.
