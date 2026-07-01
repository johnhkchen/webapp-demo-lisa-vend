# Plan — T-005-01-01: add-vercel-project-config

Ordered, independently-verifiable steps. Testing strategy and acceptance mapping. Each step is
small enough to reason about; the whole thing commits atomically (one config file + artifacts).

## Testing strategy

No unit/integration tests are added — the deliverable is declarative deploy config, not code. It is
verified by: (a) JSON well-formedness, (b) field correctness vs. the documented Vercel schema,
(c) the named build gate (`npm run build`) passing, and (d) a boundary check that no
game/component/app files changed. The live `npx vercel build` resolve (AC) is **not runnable in
this sandbox** — the Vercel CLI is absent and cannot be fetched — so it is documented as a deferred
verification in Review, with the config authored to pass it by construction.

## Steps

### Step 0 — Baseline (done)
- `npm run build` → exit 0; `/` and `/_not-found` prerendered static. Green start confirmed this
  session.
- Confirm no `vercel.json` exists yet. (Confirmed in Research.)

### Step 1 — Write `vercel.json`
Create at repo root:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build"
}
```
Two-space indent, trailing newline.

### Step 2 — Validate well-formedness + fields
- `node -e "const c=JSON.parse(require('fs').readFileSync('vercel.json','utf8')); if(c.framework!=='nextjs')throw new Error('framework'); if(c.buildCommand!=='npm run build')throw new Error('buildCommand'); console.log('ok')"`
  → prints `ok`, exit 0.
- Confirms: parses (schema-structural validity), `framework === "nextjs"`,
  `buildCommand === "npm run build"`.

### Step 3 — Re-confirm the build gate
- `npm run build` → exit 0. Proves the command the config names still passes and that adding the
  file changed nothing in the app build (as expected — `next build` does not read `vercel.json`).

### Step 4 — Boundary check
- `git status --porcelain` → only `vercel.json` (new) and `docs/active/work/T-005-01-01/*` appear
  as changes introduced by this ticket. Nothing under `app/`, `components/`, `lib/`,
  `next.config.ts`, `package.json`. (Pre-existing unrelated untracked docs from other tickets are
  ignored — this ticket stages only its own paths.)

### Step 5 — Commit atomically
- Stage exactly `vercel.json` + `docs/active/work/T-005-01-01/*.md`.
- `git show --stat HEAD` confirms only those files; no ticket frontmatter, no sibling files.
- Message: `chore(T-005-01-01): add vercel.json declaring Next.js preset + npm run build`.

### Step 6 — Artifacts
- Write `progress.md` (execution log, deviations) and `review.md` (handoff).

## Acceptance-criteria mapping

| AC clause | Satisfied by | Verified how |
|-----------|--------------|--------------|
| `vercel.json` exists at repo root | Step 1 | file present; `git status` |
| declares Next.js framework preset | Step 1 (`framework: "nextjs"`) | Step 2 field check |
| `npm run build` as build command | Step 1 (`buildCommand`) | Step 2 field check |
| config schema validates | Step 1 (`$schema`) + valid JSON/fields | Step 2 parse + field check (structural); live CLI validate deferred |
| `npx vercel build` resolves locally | config authored to preset+build-command spec | **deferred** — CLI absent in sandbox; documented in review.md; `npm run build` (the named command) passes as the substantive proxy |
| no game/component files touched | Steps 1 & 4 (config-only) | Step 4 `git status` boundary check |

## Rollback

Single file. `git rm vercel.json` (or revert the commit) fully undoes the change; nothing else
depends on it and no app code references it.

## Risks

- **Sandbox can't run `npx vercel build`.** Mitigation: structural validation + build-gate proxy +
  explicit Review flag for CI/human to run the live resolve. Low risk — values mirror Vercel's
  documented Next.js preset defaults, so a correct CLI resolve is expected.
- **Redundancy with auto-detection.** Intentional and AC-mandated; not a risk to behavior.
