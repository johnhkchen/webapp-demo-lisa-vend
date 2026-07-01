# Research — T-006-03-01: retire-vercel-and-next-compiler-wiring

## Ticket in one line

Remove the now-dead Vercel / Next-compiler configuration so the repo names **exactly one**
deploy path (vinext → Cloudflare Workers), matching the retargeted stack. Acceptance: `vercel.json`
deleted; Next-compiler-specific wiring (`next.config.ts`, `next-env.d.ts`) removed or reconciled to
vinext; a fresh `npm run build` still succeeds afterward.

## Where this sits in the epic

- **E-006** (`migrate-build-runtime-and-deploy-to-vinext-cloudflare`) swaps the toolchain off the
  Next.js compiler + Vercel and onto vinext (Vite-based, Next-API-compatible) targeting Cloudflare
  Workers. Explicit epic exit criterion: *"`vercel.json` and Next-compiler-specific wiring are
  gone."*
- **Story S-006-03** (`retire-vercel-document-cloudflare-deploy`) holds two tickets:
  - **T-006-03-01 (this)** — retire the dead config files. `phase: research`.
  - **T-006-03-02** (`generate-wrangler-and-document-cloudflare-deploy`, `depends_on: [T-006-03-01]`)
    — generate `wrangler.jsonc` and document the authenticated `vinext deploy`. **Not this ticket.**
- Upstream, already **done**: T-006-01-01 (added vinext + vite + plugin-rsc deps), T-006-01-02
  (added `vite.config.ts`, flipped `dev`/`build`/`start` to vinext), T-006-02-01/02 (verified
  build+lint+test green under vinext; fixed lint to ignore `dist/`). So the migration mechanics are
  in place — this ticket is the cleanup that removes what the swap left behind.

## Current state of the relevant files

### `vercel.json` (tracked) — dead deploy config
```json
{ "$schema": "…/vercel.json", "framework": "nextjs",
  "buildCommand": "npm run build",
  "git": { "deploymentEnabled": { "main": true } } }
```
Authored by T-005-01-01 / T-005-03-01 to declare the Vercel Next.js preset + `main` auto-deploy.
The deploy target is now Cloudflare Workers via `vinext deploy` (CLAUDE.md Stack). Nothing in the
repo reads this file anymore; vinext ignores it. Pure dead weight.

### `next.config.ts` (tracked) — Next-compiler-only wiring
```ts
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },   // sole option
};
```
Its own comment ties it to Vercel: *"`npm run build` is the Vercel build command (see
vercel.json)"* and reasons about `next build` behavior (Next 16 removing the `eslint` key). The
**only** functional option is `typescript.ignoreBuildErrors: false` — a *Next-compiler* build gate
that fails `next build` on a type error.

**Critical finding:** under vinext, `npm run build` (`vinext build`) is a **Vite/esbuild** build.
esbuild strips types without type-checking; `grep` over `node_modules/vinext/dist/{cli,build}.js`
finds **no** `tsc` / `typescript` / type-check invocation in the build path. So
`typescript.ignoreBuildErrors` is a **no-op under vinext** — the type gate it describes is already
gone as a consequence of the T-006-01/02 migration, independent of this file. vinext *does* load
`next.config.*` from disk (it has no inline `nextConfig` in `vite.config.ts`), and its `check.js`
parses it for compatibility reporting, but the single option present changes nothing at build time.
Verified experimentally: moving `next.config.ts` aside and rebuilding → **exit 0, no warnings**.

### `next-env.d.ts` (untracked / **git-ignored**) — stale, generated
```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";   // ← OLD Next-compiler path
```
`git check-ignore next-env.d.ts` → ignored (last line of `.gitignore`). So it is **never
committed** — it is a generated file. The on-disk copy still points at `./.next/dev/types/…`, the
path the **old `next dev/build` compiler** emitted. vinext regenerates this file via its typegen
(`node_modules/vinext/dist/typegen.js` → `ensureNextEnvFile`), whose canonical content instead
imports `./.next/types/routes.d.ts` (no `/dev/`). Because `ensureNextEnvFile` writes with the `wx`
(exclusive-create) flag, vinext **will not overwrite** the pre-existing stale file — it only creates
one when absent. Net: the working-tree `next-env.d.ts` is stale relative to vinext, but harmless and
uncommitted. "Reconcile to vinext" here means: let vinext own it (delete the stale copy so vinext
regenerates the canonical one), and align the tsconfig `include` that references the dev-types path.

### `tsconfig.json` (tracked) — mixed old/new type-path references
```jsonc
"plugins": [{ "name": "next" }],           // Next TS language-service plugin (editor-only)
"include": [ "next-env.d.ts", "**/*.ts", "**/*.tsx",
             ".next/types/**/*.ts",         // ← vinext typegen output
             ".next/dev/types/**/*.ts",     // ← OLD Next-compiler dev-types output
             "**/*.mts" ]
```
Both the vinext path (`.next/types/**`) and the legacy Next-compiler dev path
(`.next/dev/types/**`) are included. On disk both exist: `.next/types/routes.d.ts` (vinext) and
`.next/dev/types/routes.d.ts` (legacy leftover). The `plugins:[{name:"next"}]` entry is the Next
TypeScript **language-service** plugin — editor-only, not a build input; vinext apps keep it for
route-type IntelliSense. Reconciling to vinext means dropping the `.next/dev/types/**` include and
letting `next-env.d.ts` point at `.next/types/…`.

## Baseline (measured, on `main` before any change)

| Gate | Command | Result |
|---|---|---|
| Build | `npm run build` | ✅ exit 0 — 5 vinext envs built |
| Build w/o `next.config.ts` | (moved aside) `npm run build` | ✅ exit 0, no warnings |

`dist/` is emitted by `vinext build` and is **not** in `.gitignore` (only eslint ignores it) — a
pre-existing migration gap, **out of scope** here; must simply not be committed.

## References across the repo (grep for `vercel` / `next.config` / `next-env`)

- Config: `vercel.json`, `next.config.ts` (self-references), `tsconfig.json` (`next-env.d.ts` +
  dev-types include), `eslint.config.mjs` (ignores `next-env.d.ts` — keep; still generated).
- Docs still naming Vercel: `CLAUDE.md` line 6 ("deployed to Vercel"), `SEED.md`, `docs/knowledge/
  vision.md`, older E-005 / T-005-* artifacts. These are **doc** references — retargeting narrative
  docs belongs to T-006-03-02 (`…document-cloudflare-deploy`) / a docs pass, **not** this config
  ticket. Note but do not touch.
- `package-lock.json` has a transitive `@vercel/og` (pulled by `next`); not our wiring.

## Constraints & assumptions

- **A1** — Deploy is Cloudflare Workers via `vinext deploy` (CLAUDE.md). Vercel config is dead.
- **A2** — vinext build does not type-check, so removing `next.config.ts` loses **no** enforced gate
  (the gate was already inert post-migration). *Open concern to surface in Review:* type-checking is
  no longer a build gate under vinext at all — re-adding `tsc --noEmit` is a separate decision,
  out of scope.
- **A3** — `next-env.d.ts` is git-ignored/generated; "removing" it has **no** committed-tree effect;
  vinext regenerates it. The meaningful reconciliation is in `tsconfig.json`.
- **A4** — Scope is **config-file retirement only**. No `lib/`, `components/`, `app/`, or test
  changes. `wrangler.jsonc` + deploy docs are T-006-03-02.
- **A5** — Definition of done is behavioral: a **fresh `npm run build` succeeds** after removal.
