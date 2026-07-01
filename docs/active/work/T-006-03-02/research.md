# Research — T-006-03-02: generate-wrangler-and-document-cloudflare-deploy

## Ticket in one line

Produce the committed Cloudflare Workers deploy artifact (`wrangler.jsonc`) and document the
authenticated, login-gated `vinext deploy` follow-up, so shippability (P3) is *real* — a reviewer
can see how to ship, not merely that we intend to. Acceptance: a `wrangler.jsonc` is committed and
matches what the vinext generator emits; docs describe the manual `vinext deploy`; the live
authenticated deploy + URL smoke-test are explicitly out of scope.

## Where this sits in the epic

- **E-006** (`migrate-build-runtime-and-deploy-to-vinext-cloudflare`) retargets the toolchain off
  Next-compiler + Vercel onto **vinext** (Cloudflare's Vite-based, Next-API-compatible runtime)
  deploying to **Cloudflare Workers**. Exit criteria include a real, documented deploy path.
- **Story S-006-03** (`retire-vercel-document-cloudflare-deploy`), two tickets:
  - **T-006-03-01** — *done*. Retired dead Vercel/Next-compiler config (`vercel.json`,
    `next.config.ts`), reconciled `tsconfig`/`next-env.d.ts` to vinext. Its review explicitly
    hands off to this ticket: "**T-006-03-02 generates `wrangler.jsonc` and documents the
    authenticated `vinext deploy`. This ticket unblocks it — the deploy config surface is now
    clean and single-path.**" It also flags two threads to pick up here: (a) narrative docs still
    naming Vercel (`CLAUDE.md` L6), and (b) `dist/` not git-ignored.
  - **T-006-03-02 (this)** — the deploy artifact + docs. `phase: research`, `depends_on:
    [T-006-03-01]` (satisfied).
- Upstream done: T-006-01-01 (vinext/vite/plugin-rsc deps), T-006-01-02 (`vite.config.ts` +
  flipped `dev`/`build`/`start` to vinext), T-006-02-01/02 (build+lint+test green under vinext).

## How vinext actually generates `wrangler.jsonc` (source-verified)

Read from `node_modules/vinext@0.2.0/dist/`:

- **The generator is `vinext init --platform=cloudflare`, NOT `vinext deploy`.**
  `init.js` → `setupCloudflarePlatform` (`init-cloudflare.js:28`) writes `wrangler.jsonc` via
  `generateWranglerConfig` (`init-cloudflare.js:81`) **only when no wrangler file already exists**
  (`:54`). Running `init` *also* rewrites `vite.config.ts` (adds `@cloudflare/vite-plugin` + cache
  adapter) and appends deps `@cloudflare/vite-plugin`, `@vinext/cloudflare`, `wrangler`
  (`init.js` `getInitDeps`), then installs them.
- **`vinext deploy` is a deprecated shim.** `cli.js:481` prints: *"`vinext deploy` has moved to
  the `@vinext/cloudflare` package. Please switch to `npx @vinext/cloudflare deploy` …"*. Its
  `--dry-run` flag "validates setup without building or deploying" — it does **not** generate
  `wrangler.jsonc`. `deploy.js:222-225` *throws* unless the wrangler file, the three deps, and a
  cloudflare plugin in `vite.config.ts` are already present ("Run `vinext init
  --platform=cloudflare` first").
- **Consequence for the AC's wording.** The AC says "`vinext deploy` (dry/generate) emits a
  `wrangler.jsonc`". That conflates two commands: the *generator* is `init`; `deploy --dry-run`
  only *validates* a project `init` already prepared. The Design phase resolves this.
- **Agent-env guardrail.** `resolveCloudflareInitOptions` / `resolveInitPlatform` *throw* in agent
  environments unless cache + image choices are passed explicitly (`--platform=cloudflare
  --data-cache=… --image-optimization=…`). So even a real `init` here is non-interactive-only.

### Canonical generator output (executed against this repo, `today=2026-07-01`)

`generateWranglerConfig(detectProject(cwd), {dataCache:"none", imageOptimization:"none"}, today)`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "webapp-demo-lisa-vend",
  "compatibility_date": "2026-07-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "vinext/server/fetch-handler",
  "assets": { "directory": "dist/client", "not_found_handling": "none", "binding": "ASSETS" }
}
```

- `name` = `package.json` name (`detectProject.projectName` → `webapp-demo-lisa-vend`).
- `main` = `vinext/server/fetch-handler` (no `worker/index.ts` in repo, so the built-in handler).
- `assets.directory` = `dist/client` — vinext's client build output.
- The **default** options (`kv` + `cloudflare-images`) additionally emit an `images` binding and a
  `kv_namespaces` entry with a placeholder `"<your-kv-namespace-id>"` that would block deploy until
  a KV namespace is created. See Design for why this app takes `none/none`.

## What this app needs from Cloudflare (measured)

`app/` is `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico` — a **pure client-side** Tetris
game (CLAUDE.md: "no backend; state in React + `requestAnimationFrame`"). Grep confirms **zero**:
- `next/image` / `next/og` / `ImageResponse` usage → **no image-optimization binding needed**.
- `route.ts` handlers, `use server`, `unstable_cache`, `revalidate` → **no KV data cache needed**.

So the `none/none` variant is not a shortcut — it is the *correct* config: nothing to bind, no
placeholder KV id, so the committed file is deploy-ready with no post-generation hand-editing.

## Current tree state relevant to deploy

- **No `wrangler.jsonc` / `wrangler.json` / `wrangler.toml`** exists yet (this ticket adds it).
- `vite.config.ts` — minimal `defineConfig({ plugins: [vinext()] })`; **no** cloudflare plugin.
- `package.json` — vinext scripts live; **no** `@vinext/cloudflare` / `wrangler` /
  `@cloudflare/vite-plugin` deps (a real `deploy` would need them; documented as follow-up).
- `.gitignore` — ignores `/.next/`, `/out/`, `/build`, `.vercel`, but **not** `/dist/` or
  `.vinext/`. `dist/client` is exactly the wrangler `assets.directory`. T-006-03-01 review flagged
  the missing `dist/` ignore; committing a config that points at `dist/` makes fixing it in-scope.
- Narrative docs still name Vercel: `CLAUDE.md` L5-6 ("deployed to Vercel"), plus `SEED.md` /
  `docs/knowledge/vision.md` (more historical). The deploy-narrative line is in scope here.

## Constraints & assumptions

- **A1** — Generation truth: `wrangler.jsonc` comes from `vinext init`, not `deploy`; `deploy` is a
  login-gated shim (`npx @vinext/cloudflare deploy`). Docs must state this accurately.
- **A2** — `none/none` is correct for a no-backend game (no image/KV usage measured). Yields a
  self-contained, deploy-ready file with no placeholder ids.
- **A3** — Live authenticated deploy + `*.workers.dev` URL smoke-test are **out of scope** (AC).
  A real deploy also needs the three cloudflare deps + a vite cloudflare plugin — documented, not
  performed, to keep this ticket's footprint to "artifact + docs".
- **A4** — Committed bytes must equal the tool's generator output (verifiable), not hand-invented.
- **A5** — Scope: add `wrangler.jsonc`, a deploy doc, the `.gitignore` `dist/`+`.vinext/` fix, and
  retarget the `CLAUDE.md` deploy line. **No** `lib/`/`components/`/`app/`/test changes; **no** dep
  installs; **no** `vite.config.ts` cloudflare rewrite.
