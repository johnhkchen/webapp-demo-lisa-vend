# Structure — T-006-01-02 scaffold-vite-config-and-flip-package-scripts

The blueprint. Which files change, their exact shape, and the ordering. Grounded in `design.md`
(config = canonical `plugins: [vinext()]`; flip only `dev`/`build`/`start`; add `"type":"module"`;
touch nothing else).

## Files at a glance

| File | Action | Summary |
|---|---|---|
| `vite.config.ts` | **create** | Canonical vinext config: `defineConfig({ plugins: [vinext()] })`. |
| `package.json` | **modify** | Add `"type":"module"`; repoint `dev`/`build`/`start` to vinext. |
| (all others) | **unchanged** | `next.config.ts`, `vercel.json`, `tsconfig.json`, `vitest.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/`, `components/`, `lib/`. |

No files are deleted. No source files change. Two files total: one new, one edited.

## File 1 — `vite.config.ts` (new, repo root)

Exact intended contents:

```ts
import { defineConfig } from "vite";
import vinext from "vinext";

// vinext() auto-registers @vitejs/plugin-rsc (App Router RSC boundary) and
// @vitejs/plugin-react (Fast Refresh + JSX), and resolves tsconfig `paths`
// (@/* → ./*) internally, so no separate plugin wiring is needed here. This is
// the canonical config `vinext init` generates. See design.md Decision 1.
export default defineConfig({
  plugins: [vinext()],
});
```

Notes:
- **Import order/style** mirrors vinext's generated template but keeps the repo's convention of a
  short explanatory docblock (as in `next.config.ts`, `vitest.config.ts`). The comment is the
  reviewer's answer to "where is `@vitejs/plugin-rsc`?" — it is wired by `vinext()`.
- `vinext` is a **default** import (`export ... vinext as default` in `dist/index.d.ts`).
- No `test`/`build`/`resolve` blocks — vinext owns build env config (RSC + SSR + client) and alias
  resolution. Adding our own would fight vinext's multi-environment setup.
- TypeScript: `vite`'s `defineConfig` and vinext's `PluginOption[]` return type check cleanly
  under the repo's `tsconfig.json` (`bundler` resolution, `esnext` module).

## File 2 — `package.json` (modify)

Two edits, nothing else in the file changes.

**Edit A — declare ESM.** Insert `"type": "module"` immediately after `"private": true,`:

```jsonc
  "name": "webapp-demo-lisa-vend",
  "version": "0.1.0",
  "private": true,
  "type": "module",          // ← added
  "scripts": { ... }
```

**Edit B — flip the three scripts** (leave `lint` and `test` byte-for-byte):

```jsonc
  "scripts": {
    "dev": "vinext dev",        // was: next dev
    "build": "vinext build",    // was: next build
    "start": "vinext start",    // was: next start
    "lint": "eslint --max-warnings 0",   // unchanged
    "test": "vitest run"                 // unchanged
  }
```

`dependencies` / `devDependencies` are **not** modified — all packages arrived in T-006-01-01.

## Public interface / behavioral contract after this change

- `npm run dev` → `vinext dev` → Vite dev server with HMR on **port 3000** (vinext default),
  serving the App Router from `app/`, resolving `@/*`, compiling Tailwind v4 via
  `postcss.config.mjs`, and honoring the RSC→client boundary at `GameContainer`.
- `npm run build` → `vinext build` → multi-environment production build (RSC + SSR + client).
  (Not gated/verified in this ticket; belongs to S-006-02.)
- `npm run start` → `vinext start` → local production server over the `vinext build` output.
- `npm run lint` / `npm test` → behavior identical to before (eslint / vitest).

## Ordering of changes

1. **Create `vite.config.ts`** first. On its own it is inert — nothing invokes Vite until the
   scripts flip — so this is a safe, isolated first step.
2. **Edit `package.json`** (`"type":"module"` + three scripts) second. This is the switch that
   makes `npm run dev` mean vinext. Doing it after the config exists guarantees the first
   `vinext dev` has a config to read.
3. **Boot-verify** `npm run dev` renders the game, then commit.

Rationale for the order: the config is the dependency of the script flip. If we flipped scripts
first and something interrupted before the config landed, `npm run dev` would run vinext with only
its zero-config auto-detection — which actually still works, but committing the config first keeps
each commit independently correct and reviewable.

## Boundaries this structure deliberately holds

- **No `wrangler.jsonc`, no `vinext deploy`, no `@cloudflare/vite-plugin` usage.** Cloudflare
  wiring is S-006-03. This config is platform-neutral (vinext runs a plain Vite dev/prod server).
- **No removal of Next artifacts.** `next.config.ts` and `vercel.json` remain; their retirement is
  S-006-03. vinext coexists with them (it *reads* `next.config.ts`).
- **No test-config change.** `vitest.config.ts` stays; it keeps resolving `@/*` for the test run
  independently of `vite.config.ts`.

## What could force a structure revision (and doesn't now)

- If boot reveals vinext needs an explicit `@vitejs/plugin-rsc` (default somehow off), File 1 grows
  to `plugins: [vinext({ rsc: false }), rsc()]` with an added import. Design flagged this as low
  probability; Plan's boot step is where we'd find out.
- If `"type":"module"` breaks a config load (not expected — no CJS `.js` configs), the fallback is
  renaming that file to `.cjs`. No such file exists, so no rename is planned.
