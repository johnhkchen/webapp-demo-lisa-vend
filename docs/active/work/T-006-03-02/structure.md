# Structure — T-006-03-02: generate-wrangler-and-document-cloudflare-deploy

Blueprint for the deploy artifact + docs. Four files touched: one created config, one created doc,
two small edits. No source/test/dependency changes.

## File-level changes

### CREATE `wrangler.jsonc` (repo root, tracked)
The Cloudflare Workers deploy artifact. **Bytes = the vinext generator's `none/none` output for
this repo** (produced by executing `generateWranglerConfig` in Research). Exact content:

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

- The vinext generator emits standard JSON (no comments) via `JSON.stringify(config, null, 2)`,
  expanded across lines. We commit **exactly those bytes** so a `diff` against a fresh generator run
  is empty (the `.jsonc` extension is what vinext writes; JSON is a valid subset).
- Public contract: `name` (worker name), `main` (built-in vinext fetch handler — no `worker/`
  entry in repo), `assets.directory=dist/client` (vinext client build output), `binding=ASSETS`.
- No `kv_namespaces` / `images` → nothing to provision; deploy-ready once vite is cloudflare-wired.

### CREATE `docs/deploy.md` (tracked)
Operational runbook. Section outline (the blueprint, not prose):

1. **Overview** — target: Cloudflare Workers via vinext; artifact is `wrangler.jsonc`.
2. **What `wrangler.jsonc` declares** — table of each field and its meaning (name/main/assets).
3. **Prerequisites** — Cloudflare account; `wrangler` authenticated (`npx wrangler login` /
   `CLOUDFLARE_API_TOKEN`).
4. **One-time deploy wiring** (login-gated, not done in this ticket) — `npx vinext init
   --platform=cloudflare --data-cache=none --image-optimization=none`: adds `@cloudflare/
   vite-plugin`, `@vinext/cloudflare`, `wrangler` deps and injects the cloudflare plugin into
   `vite.config.ts`. Note it will detect the existing `wrangler.jsonc` and not overwrite it.
5. **Deploy** — `npx @vinext/cloudflare deploy` (canonical). Note the deprecated `vinext deploy`
   alias and `--dry-run` (validates setup only). Note agent-env needs explicit flags.
6. **Out of scope for this ticket** (call-out) — the live authenticated deploy and the resulting
   `*.workers.dev` URL smoke-test are intentionally **not** performed here.

### EDIT `.gitignore` (tracked, +2 lines)
Append a `# cloudflare / vinext build output` block ignoring `/dist/` and `.vinext/`. Placement:
after the existing `# vercel` block or near the build-output ignores (`/build`, `/.next/`).
Rationale: `wrangler.jsonc.assets.directory` = `dist/client`; keep build output untrackable.

### EDIT `CLAUDE.md` (tracked, deploy-narrative line only)
Line 5-6 currently: "…built with Next.js (App Router) and **deployed to Vercel**." Retarget the
deploy clause to Cloudflare Workers via vinext. Optionally add a one-line pointer to
`docs/deploy.md` in the `## Commands` section. Do **not** touch other CLAUDE.md content.

## Explicitly NOT changed (invariants)

- `lib/`, `components/`, `app/`, all `*.test.*` — zero changes (no runtime behavior in this ticket).
- `vite.config.ts` — **not** cloudflare-wired here (that is the documented login-gated follow-up).
- `package.json` / `package-lock.json` — **no** dep additions/installs.
- `eslint.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `postcss.config.mjs` — untouched.
- `SEED.md`, `docs/knowledge/vision.md` — historical vision docs; out of deploy-artifact scope.

## Ordering of changes (why this order)

1. `wrangler.jsonc` first — it is the artifact everything else references.
2. `.gitignore` — before any build, so `dist/`/`.vinext/` never risk being staged.
3. `docs/deploy.md` — references the committed `wrangler.jsonc` fields.
4. `CLAUDE.md` — points at the now-existing `docs/deploy.md`.

## Verification hooks (consumed by Plan)

- **Byte-fidelity:** re-run the generator, `diff` against committed `wrangler.jsonc` → empty.
- **Validity:** `wrangler.jsonc` parses as JSON (comment-stripped is a no-op since it has none);
  `node -e "JSON.parse(...)"` succeeds; `name`/`main`/`assets.directory` assert-equal expected.
- **Green surface:** `npm run build` (exit 0), `npm run lint` (0 problems), `npm test` (163/163).
- **No stray tracked build output:** `git status --porcelain` shows only the four intended paths;
  `git check-ignore dist .vinext` confirms both ignored.
- **No source diff:** `git status --porcelain -- lib components app vite.config.ts package.json`
  is empty.
