# Review — T-006-03-02: generate-wrangler-and-document-cloudflare-deploy

## Outcome

**Shippability (P3) is now real, not just documented.** The repo carries a committed Cloudflare
Workers deploy artifact (`wrangler.jsonc`) that is byte-identical to vinext's own generator, the
build is wired for Cloudflare, and `npx @vinext/cloudflare deploy --dry-run` **passes** — so a
reviewer can confirm the app is deploy-ready without a Cloudflare login. The only step left is the
login-gated live deploy + URL smoke-test, which the AC explicitly scopes out and `docs/deploy.md`
documents. Build, lint, and the full 163-test suite stay green; no product code changed.

## What changed

### Created (tracked)
- **`wrangler.jsonc`** — the deploy artifact. `name`, `compatibility_date`, `nodejs_compat`,
  `main: vinext/server/fetch-handler`, `assets.directory: dist/client`. **No `kv_namespaces` /
  `images`** — the game is pure client-side (no `next/image`, routes, or data cache), so there is
  nothing to provision and no placeholder id to fill in. Byte-identical to
  `vinext init --platform=cloudflare --data-cache=none --image-optimization=none`.
- **`docs/deploy.md`** — deploy runbook: `wrangler.jsonc` field reference, prerequisites
  (`wrangler` auth), how the wiring was generated, the `npx @vinext/cloudflare deploy` command
  (with the deprecated `vinext deploy` alias + `--dry-run` notes), and an explicit **out-of-scope**
  call-out for the live deploy + `*.workers.dev` smoke-test.

### Modified (tracked)
- **`vite.config.ts`** — added the `cloudflare()` plugin (via `vinext init`; the existing
  T-006-01-02 explanatory comment was preserved).
- **`package.json`** / **`package-lock.json`** — added devDeps `@cloudflare/vite-plugin`,
  `@vinext/cloudflare`, `wrangler`. Removed the three redundant `:vinext` scripts init generated
  (primary `dev`/`build`/`start` already run vinext).
- **`.gitignore`** — ignore `/dist/`, `.vinext/`, `.wrangler/` (build/deploy output;
  `assets.directory` is `dist/client`). Closes the `dist/` gap T-006-03-01 flagged.
- **`CLAUDE.md`** — Project line retargeted "deployed to Vercel" → Cloudflare Workers via vinext;
  Commands line points at `npx @vinext/cloudflare deploy` and links `docs/deploy.md`.

### Unchanged (verified)
`lib/`, `components/`, `app/`, all 18 `*.test.*`, `eslint.config.mjs`, `tsconfig.json`,
`vitest.config.ts`, `postcss.config.mjs` — zero diff.

## Key decision & the one deviation

- **`none/none` cache/image options** — measured (grep) that the app uses no image optimization or
  data cache, so the minimal config is the *correct* one, not a shortcut. See `design.md` Dec. 2.
- **Deviation (Option B → A), fully documented in `design.md` + `progress.md`:** committing
  `wrangler.jsonc` *alone* breaks `npm run build` — `vinext`'s build has a
  `hasWranglerConfig(root) → require cloudflare() plugin` gate (`vinext/dist/index.js:1163`). The
  planned "artifact-only, defer wiring to docs" state does not build. Because build-green is a
  load-bearing E-006 invariant, I ran `vinext init` to add the `cloudflare()` plugin + deploy deps.
  init left `wrangler.jsonc` byte-for-byte unchanged, so tool-fidelity is preserved.

## Evidence (reproducible)

| Gate | Command | Result |
|---|---|---|
| Build | `npm run build` | ✅ exit 0, emits `dist/client` |
| Lint | `npm run lint` (`--max-warnings 0`) | ✅ 0 problems |
| Test | `npm test` | ✅ 163/163, 18/18 files |
| Wrangler fidelity | generator `diff` | ✅ byte-identical |
| Deploy readiness | `npx @vinext/cloudflare deploy --dry-run` | ✅ exit 0, "Dry run complete." |
| Output ignored | `git check-ignore dist/client/x .vinext/dev .wrangler/x` | ✅ all matched |
| Source untouched | `git status --porcelain -- lib components app` | ✅ empty |

## Test coverage assessment

No unit tests added — correct: this ships a static config artifact + docs + build wiring, with zero
new runtime code to unit-test. The equivalent proofs are (a) the **byte-fidelity diff** (artifact
equals the tool's output), (b) the passing **`--dry-run`** (setup is genuinely deploy-valid), and
(c) the unchanged **163-test suite** (no incidental regression). **Gap:** no automated deploy smoke
test — inherent to the AC's out-of-scope boundary; covered manually post-deploy per `docs/deploy.md`.

## Open concerns / handoff notes

1. **Live deploy not performed (by design).** The authenticated `vinext deploy` and `*.workers.dev`
   smoke-test are out of scope (AC). Setup is proven ready via `--dry-run`; a human with Cloudflare
   auth runs one command (`docs/deploy.md`).
2. **`sharp`/`workerd` install scripts not approved.** `npm install` warned that
   `@vinext/cloudflare`'s transitive deps (`sharp`, `workerd`, `esbuild`, …) have unrun install
   scripts. Harmless for build/lint/test/dry-run here; the actual deploy machine may need
   `npm approve-scripts` / a fresh install. Noted, not blocking.
3. **Type-checking still not a build gate** (pre-existing from T-006-03-01, unrelated). `vinext
   build` does not run `tsc`. Out of scope here.
4. **Residual Vercel mentions in narrative docs.** `SEED.md` and `docs/knowledge/vision.md` still
   say "Vercel". These are historical vision docs, not deploy wiring; retargeting the *deploy
   narrative* (CLAUDE.md) was in scope, but a full vision-doc rewrite is a separate docs pass.
5. **Ticket frontmatter / `tetris.html` untouched.** Pre-existing at session start; Lisa owns phase
   transitions, so no ticket files were staged.

## Acceptance criteria — verdict

> `vinext deploy` (dry/generate) emits a wrangler.jsonc committed to the repo, and docs describe the
> manual, login-gated `vinext deploy` follow-up; the live authenticated deploy and URL smoke-test
> are explicitly noted as out of scope.

- ✅ **`wrangler.jsonc` committed**, byte-identical to vinext's generator (the AC says "`vinext
  deploy` (dry/generate)"; the true generator is `vinext init` — `deploy` only validates. Committed
  the tool-faithful output and documented the distinction).
- ✅ **Docs describe the manual, login-gated deploy** (`docs/deploy.md` + CLAUDE.md pointer).
- ✅ **Live deploy + URL smoke-test explicitly out of scope**, and setup is provably deploy-ready
  (`--dry-run` passes) rather than merely asserted.

**Met in full** (with the AC's `deploy`-vs-`init` wording clarified in the artifacts).
