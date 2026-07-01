# Design — T-006-03-02: generate-wrangler-and-document-cloudflare-deploy

## The decision to make

The AC wants (1) a committed `wrangler.jsonc` that matches the vinext generator, (2) docs for the
manual login-gated `vinext deploy`, (3) live deploy + smoke-test marked out of scope. Research
surfaced the load-bearing tension: **the generator is `vinext init --platform=cloudflare`, not
`vinext deploy`** — and a full `init` has a large footprint (rewrites `vite.config.ts`, adds +
installs three deps). So the real design question is *how* to materialize the artifact.

## Decision 1 — How to produce `wrangler.jsonc`

### Option A — Run full `vinext init --platform=cloudflare --data-cache=none --image-optimization=none`
Runs the canonical path end-to-end.
- **Pro:** most "official"; guarantees byte-exact generator output; also wires vite + deps so a
  later real deploy is one command.
- **Con:** rewrites the carefully-authored minimal `vite.config.ts` (T-006-01-02) to inject
  `@cloudflare/vite-plugin` + a cache adapter; appends `@cloudflare/vite-plugin`, `@vinext/
  cloudflare`, `wrangler` to `package.json` and **installs** them (package-lock churn, network).
  That is "wire up deploy for real" — precisely the authenticated follow-up the AC pushes out of
  scope. It also risks regressing the green build/lint/test surface for a docs-and-artifact ticket.

> **Implementation-phase correction (see `progress.md`).** Option B below was chosen on the
> assumption that committing `wrangler.jsonc` alone keeps `npm run build` green. It does **not**:
> `vinext build` has a `hasWranglerConfig(root)` gate (`vinext/dist/index.js`) that *requires* the
> `cloudflare()` plugin the moment a wrangler file exists, so the artifact-only state fails the
> build. The build-green invariant is load-bearing across E-006, so the design pivoted to **Option
> A** during Implement — run `vinext init` to wire the plugin + deps. The chosen options
> (`none/none`) and the byte-identical `wrangler.jsonc` from Option B are retained; only the
> "don't run full init" part was reversed. Net footprint added by the pivot: `vite.config.ts` gains
> the `cloudflare()` plugin, and three devDependencies are installed.

### Option B — Commit the generator's exact output for this repo, without running full `init` (SUPERSEDED → see correction above)
Materialize `wrangler.jsonc` with the identical bytes `generateWranglerConfig(detectProject(cwd),
{dataCache:"none", imageOptimization:"none"}, "2026-07-01")` produces — obtained by *executing the
vinext generator against this repo* (done in Research), not by hand-authoring.
- **Pro:** minimal, reversible footprint — one new file plus docs. Byte-identical to the tool
  (verifiable: re-run the generator and `diff`). Leaves `vite.config.ts`, `package.json`, and the
  green build/lint/test surface untouched. Matches the ticket's actual scope ("produce the
  artifact + document the manual deploy"). The deps + vite wiring that a real deploy needs are
  *documented* as the login-gated follow-up, where they belong.
- **Con:** the committed file's `main`/`assets` presume vinext's Cloudflare build, which isn't
  wired in `vite.config.ts` yet — so `wrangler.jsonc` alone is not deployable until the documented
  `init` step runs. Acceptable and honest: the AC explicitly scopes the live deploy out, and the
  doc states the follow-up plainly.

### Option C — `vinext deploy --dry-run` to "generate/validate"
- **Rejected:** `deploy --dry-run` does not generate anything and *throws* here ("Missing
  Cloudflare deployment setup … Run `vinext init --platform=cloudflare` first") because the deps
  and vite plugin are absent (`deploy.js:222-225`). It cannot satisfy "emits a wrangler.jsonc".

**Chosen: A (pivoted from B during Implement).** B's minimal-footprint appeal was real but its
premise was false — the artifact-only state does not build. A is the smallest change that both
commits the tool-faithful `wrangler.jsonc` *and* keeps `npm run build` green, and it has the bonus
that `@vinext/cloudflare deploy --dry-run` now passes — so "shippability is real" is demonstrable,
not just asserted. Faithfulness to the tool is still preserved: `init` generated the wiring and
left `wrangler.jsonc` byte-identical to the generator.

## Decision 2 — Cache/image options: `none/none` vs default `kv/cloudflare-images`

**Choose `none/none`.** Research measured **zero** `next/image`, route handlers, `use server`, or
data-cache usage — this is a pure client-side game. The default (`kv` + images) would emit an
`images` binding this app never calls and a `kv_namespaces` entry with a placeholder
`"<your-kv-namespace-id>"` that **blocks deploy** until a KV namespace is created (see
`setupCloudflarePlatform` `nextSteps`). `none/none` yields a **self-contained, deploy-ready** file
with nothing to provision — the honest description of this app's Cloudflare needs. If the game ever
grows a backend/leaderboard, re-running `vinext init` regenerates the richer config; documented.

## Decision 3 — Where the deploy docs live

**Choose a dedicated `docs/deploy.md`**, linked from `CLAUDE.md`'s Commands section.
- Rejected `README`/root `DEPLOY.md`: the repo is docs-centric (`docs/knowledge/`, `docs/active/`);
  an operational deploy guide fits `docs/`. Rejected folding it all into `CLAUDE.md`: CLAUDE.md is
  agent instructions, not an ops runbook — keep it a pointer, keep the runbook in one file.
- `docs/deploy.md` covers: prerequisites (Cloudflare account, `wrangler` auth), the one-time
  `vinext init --platform=cloudflare …` wiring (deps + vite plugin), the `npx @vinext/cloudflare
  deploy` command (noting the deprecated `vinext deploy` alias), what `wrangler.jsonc` declares,
  and an explicit **Out of scope for this ticket** box (live deploy + `*.workers.dev` smoke-test).

## Decision 4 — Adjacent hygiene: `.gitignore` and the Vercel narrative line

- **`.gitignore`:** add `/dist/` and `.vinext/`. `wrangler.jsonc.assets.directory` is `dist/client`
  — committing a config that points at `dist/` while `dist/` is git-trackable invites accidentally
  committing build output on the very deploy flow this ticket documents. `vinext init` itself adds
  these ignores (init.js step 6); doing the one-liner here keeps the deploy surface coherent. **In
  scope** (directly serves "make shipping real"); T-006-03-01 deferred it to "a separate change" —
  this is that change, and it is deploy-adjacent.
- **`CLAUDE.md` deploy line:** L5-6 still says "deployed to Vercel". T-006-03-01's review handed the
  Vercel-narrative retarget to this ticket. Fix the **deploy sentence** to name Cloudflare Workers
  via vinext and point at `docs/deploy.md`. Leave `SEED.md` / `vision.md` (historical vision docs,
  not deploy wiring) untouched — out of this ticket's deploy-artifact scope; noted in Review.

## What "done" looks like

- `wrangler.jsonc` committed, byte-identical to the vinext `none/none` generator output for this
  repo (re-run + `diff` = empty).
- `docs/deploy.md` documents the authenticated `vinext deploy` follow-up and marks the live
  deploy + smoke-test out of scope.
- `.gitignore` ignores `/dist/` + `.vinext/`; `CLAUDE.md` deploy line names Cloudflare + links the
  runbook.
- **Invariant:** `npm run build`, `npm run lint` (`--max-warnings 0`), `npm test` (163/163) stay
  green; `lib/`/`components/`/`app/`/tests and `vite.config.ts`/`package.json` deps unchanged.
