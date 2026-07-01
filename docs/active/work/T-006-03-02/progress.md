# Progress — T-006-03-02: generate-wrangler-and-document-cloudflare-deploy

## Status: complete (all plan steps done + one documented deviation)

## Steps executed

### Step 1 — `wrangler.jsonc` ✅
Wrote `wrangler.jsonc` with the `none/none` generator bytes. Verified **byte-identical** to
`generateWranglerConfig(detectProject(cwd), {dataCache:"none", imageOptimization:"none"},
"2026-07-01")` (`diff` empty), valid JSON, correct `name`/`main`/`assets.directory`, no
`kv_namespaces`/`images`.
Commit: `feat(T-006-03-02): add wrangler.jsonc …`.

### Step 2 — `.gitignore` ✅
Added `/dist/` + `.vinext/` (later `.wrangler/` folded in — see deviation). `git check-ignore`
confirms all paths ignored.
Commit: `chore(T-006-03-02): git-ignore dist/ and .vinext/ …`.

### Step 3 — `docs/deploy.md` ✅ (revised after deviation)
Wrote the deploy runbook. Later revised so the wiring section reads "already done" rather than
"follow-up" (see deviation), and added the passing `--dry-run` as a verification step.
Commits: `docs(T-006-03-02): document authenticated Cloudflare Workers deploy …` +
`docs(T-006-03-02): mark deploy wiring done …`.

### Step 4 — `CLAUDE.md` ✅
Retargeted the Project deploy line ("deployed to Vercel" → Cloudflare Workers via vinext) and the
Commands deploy line (`npx @vinext/cloudflare deploy`, link to `docs/deploy.md`). `grep Vercel
CLAUDE.md` → none.
Commit: `docs(T-006-03-02): retarget CLAUDE.md deploy narrative to Cloudflare`.

## Deviation from plan (documented per plan.md deviation protocol)

**What:** The final verification gate revealed `npm run build` **failed** after Step 1 with
*"Missing @cloudflare/vite-plugin in vite.config.ts."* Root cause (source-confirmed at
`vinext/dist/index.js:1163`): the build has a gate
`command==="build" && !hasCloudflarePlugin && hasWranglerConfig(root) → throw`. So the mere
presence of `wrangler.jsonc` makes `vinext build` *require* the cloudflare plugin. Design Option B
(commit the artifact alone, defer all wiring to the doc) therefore produces a **non-building**
tree — it violated the E-006 build-green invariant. Confirmed by moving `wrangler.jsonc` aside →
build exit 0; restoring it → build fails.

**Resolution:** Pivoted to design Option A. Ran
`npx vinext init --platform=cloudflare --data-cache=none --image-optimization=none`, which:
- added `@cloudflare/vite-plugin`, `@vinext/cloudflare`, `wrangler` to `devDependencies` (installed);
- injected the `cloudflare()` plugin into `vite.config.ts` (kept the existing T-006-01-02 comment);
- **left `wrangler.jsonc` byte-for-byte unchanged** (init detects an existing wrangler file).

**Cleanup after init:**
- Removed the three redundant scripts init added (`dev:vinext`/`build:vinext`/`start:vinext`) — the
  primary `dev`/`build`/`start` already run vinext, so they were pure noise.
- Folded init's `.wrangler/` ignore into the existing "vinext / cloudflare build output" block.

**Artifacts updated to match:** `design.md` Decision 1 now records the pivot (Option B superseded →
Option A chosen); `docs/deploy.md` reframed from "wiring is a follow-up" to "wiring is done, only
the live deploy is out of scope".

## Verification (final, all green)

| Check | Result |
|---|---|
| `npm run build` | ✅ exit 0, emits `dist/client` (= wrangler `assets.directory`) |
| `npm run lint` (`--max-warnings 0`) | ✅ 0 problems |
| `npm test` | ✅ 163/163, 18/18 files |
| `wrangler.jsonc` vs generator | ✅ byte-identical (`diff` empty) |
| `@vinext/cloudflare deploy --dry-run` | ✅ exit 0 — "Dry run complete. No build or deploy performed." |
| Build output ignored | ✅ `git check-ignore dist/client/x .vinext/dev .wrangler/x` all match |
| Source untouched | ✅ no diff in `lib/`, `components/`, `app/`, tests |

## Out of scope (per AC — not done, intentionally)

Live authenticated `vinext deploy` and the `*.workers.dev` URL smoke-test. These need a Cloudflare
login; the setup is proven deploy-ready via the passing `--dry-run`.

## Not touched (pre-existing, not mine)

Modified ticket frontmatter (`docs/active/tickets/T-006-*.md`) and untracked `tetris.html` were
already present at session start — Lisa owns phase transitions, so I left all ticket files alone.
