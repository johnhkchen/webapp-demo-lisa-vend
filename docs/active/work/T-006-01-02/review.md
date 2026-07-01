# Review — T-006-01-02 scaffold-vite-config-and-flip-package-scripts

Handoff. What changed, whether the AC is met, and what a human/next ticket must know. Commit:
**`8b50ead`**.

## What changed

Three files, one implementation commit:

- **`vite.config.ts`** (new) — canonical vinext config:
  ```ts
  import { defineConfig } from "vite";
  import vinext from "vinext";
  export default defineConfig({ plugins: [vinext()] });
  ```
  `vinext()` auto-registers `@vitejs/plugin-rsc` (App Router RSC boundary) and
  `@vitejs/plugin-react` (Fast Refresh + JSX) and resolves the `@/*` tsconfig alias internally, so
  those are not imported explicitly. A docblock records this so the AC's "+ `@vitejs/plugin-rsc`"
  is traceable.
- **`package.json`** (modified) — (1) added `"type": "module"`; (2) flipped `dev`/`build`/`start`
  to `vinext dev|build|start`; (3) **bumped `vite ^7 → ^8`** (the deviation — see below). `lint`,
  `test`, and all other deps unchanged.
- **`package-lock.json`** (regenerated) — vite 7.3.6→8.1.2; added `rolldown`,
  `@oxc-project/types`; removed standalone `esbuild`.

Not touched (correct scope): `next.config.ts`, `vercel.json`, `tsconfig.json`, `vitest.config.ts`,
`postcss.config.mjs`, `eslint.config.mjs`, and everything under `app/`, `components/`, `lib/`.

## Acceptance criterion — met

> vite.config.ts exists wiring vinext() + @vitejs/plugin-rsc; package.json is ESM ("type":"module")
> with dev/build/start invoking vinext; `npm run dev` boots the app on the vinext dev server and the
> game renders at localhost.

- ✅ **`vite.config.ts` wiring vinext() + plugin-rsc** — present; plugin-rsc is wired via `vinext()`
  (`rsc` default `true`), the shape vinext itself generates.
- ✅ **ESM + scripts** — `"type":"module"` added; `dev`/`build`/`start` all invoke `vinext`.
- ✅ **`npm run dev` boots and renders** — `vinext dev (Vite 8.1.2)` on `http://localhost:3000/`;
  `curl /` → **200**, HTML contains the `TETRIS` heading (RSC server render), the
  `virtual:vite-rsc/entry-browser` client-island script (hydration), and `aria-label="Tetris
  board"` (the board itself). The RSC→client boundary works end to end.

## 🚩 The one issue that needs human attention

**vite was bumped `^7 → ^8`, revising T-006-01-01's already-"done" `vite@^7` AC.** This was not a
preference — vinext 0.2.0 imports `parseSync` from `vite`, an export that exists **only in vite 8**
(Rolldown/Oxc). Under vite 7, `vinext dev` **crashes at boot** with
`SyntaxError: ... does not provide an export named 'parseSync'`. vinext's README confirms "vinext
targets Vite 8"; its declared `^7||^8` peer range understates the real floor. So T-006-01-01's
vite-7 pin was incompatible with the epic's core goal (run on vinext) and had to be revised here.

Why this is safe: `@vitejs/plugin-react@5.2.0` already supports vite 8 (peers `…||^8`), and
`vitest@4.1.9` peers `^6||^7||^8`. The install resolved with no ERESOLVE / no peer errors.

What a reviewer should confirm: that revising a sibling ticket's dependency AC from a downstream
ticket is acceptable in this workflow, or whether T-006-01-01 should be reopened/annotated to
reflect that its `vite@^7` clause was superseded. Full rationale in `progress.md` (Deviation) and
`design.md`.

## Test coverage

No application logic changed → no unit tests added. Coverage here is **runtime/integration**, all
passing:

- **Boot check** — `npm run dev` starts the vinext dev server on :3000. ✅
- **Render check** — served HTML proves the server component + client island + board render. ✅
- **Resolution check** — `npm install vite@^8` peer-clean; lockfile regenerated. ✅
- **Regression fence** — only the three intended files changed. ✅

**Deliberately not run** (belongs to S-006-02, would mislead if reported here): `npm run build`,
`npm run lint`, `npm test` under vinext. Note the config-coexistence watch item below before that
gate runs.

## Open concerns / TODOs for downstream

1. **Vitest ↔ `vite.config.ts` coexistence — verify in S-006-02.** Now that a root `vite.config.ts`
   with `vinext()` exists, confirm `vitest run` still uses `vitest.config.ts` and does **not** pull
   the vinext plugin into the test run. Expected fine (Vitest prefers its own config), but unproven
   until the test gate runs. If tests regress there, this file is the first suspect.
2. **vite 8 default is Rolldown/Lightning CSS.** The dev boot worked, but S-006-02's `vinext build`
   is the first exercise of the full production pipeline (RSC + SSR + client) on Rolldown. Watch for
   CommonJS-interop or CSS differences the README warns about (`legacy.inconsistentCjsInterop`).
3. **`npm audit` advisories** in vinext's tree — carried over from T-006-01-01, still untriaged.
   Recommend a dedicated ticket before the epic ships.
4. **plugin-react 5.x pin.** T-006-01-01 pinned it to avoid vite-8-only plugin-react 6. Now that
   we're *on* vite 8, that constraint is gone; a future cleanup could let plugin-react float to 6.x.
   Not required now (5.2.0 works on vite 8).
5. **Cloudflare wiring still absent** — `wrangler.jsonc`, `@cloudflare/vite-plugin`, `vinext deploy`
   are S-006-03. The current config is platform-neutral (plain Vite dev/prod server).

## Nothing blocking downstream

The app runs on vinext: `npm run dev` boots and renders the Tetris board. S-006-02 (re-verify
build/lint/vitest) and S-006-03 (retire Next/Vercel, add Cloudflare) are unblocked — with the vite-8
revision above surfaced for a human to bless.
