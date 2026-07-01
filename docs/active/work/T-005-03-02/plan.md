# Plan — T-005-03-02: verify-shareable-url-tracks-main

Ordered, independently-verifiable steps. This is a verification ticket: the "implementation" is
running the repo-side battery, recording results, and writing the deferred live runbook. No product
code is produced.

## Testing strategy

- **What gets automated tests:** nothing. There is no product code to test; the deliverable is a
  verification procedure + evidence. Same rationale accepted for T-005-01-01/02-01/03-01 (config,
  not executable product code). Adding a unit test would assert nothing product-side.
- **What gets verified by command (repo-side battery V1–V6):** config validity/fields, production
  branch, remote, deploy-gate build, absence of a competing CI workflow, clean boundary. These are
  the reproducible proxies for "configured to track main."
- **What is deferred to a human (live observation):** the literal before/after URL load. Scripted
  as a runnable runbook; not executable in-sandbox (no credentials/CLI/network).
- **Verification criteria (ticket-level done):** all of V1–V6 recorded green; the live runbook
  written with explicit pass/fail; AC reported split (repo-side `[x]`, live `[~] deferred`); no
  product/config/CI files changed; artifacts committed.

## Steps

### Step 1 — Blueprint artifacts (research, design, structure)
- **Do:** written and on disk.
- **Verify:** three files exist under `docs/active/work/T-005-03-02/`.
- **Status:** ✅ done.

### Step 2 — Run repo-side battery V1–V4 and record
- **Do:** run config-parse (V1), `git branch --show-current` (V2),
  `git config --get remote.origin.url` (V3), `npm run build` (V4).
- **Verify:** V1 → all three fields correct; V2 → `main`; V3 → correct remote; V4 → exit 0.
- **Status:** ✅ run this session — V1 fields all correct, V2 `main`, V3 correct remote, V4 green
  (`✓ Compiled successfully`, `/` and `/_not-found` static). Recorded in progress.md.
- **Commit:** none yet (results captured in progress.md at Step 5).

### Step 3 — Run boundary/mechanism checks V5–V6 and record
- **Do:** `ls .github 2>/dev/null` (V5 — expect absent); `git status --porcelain` filtered to
  product paths (V6 — expect empty).
- **Verify:** V5 absent (native Git integration is the mechanism, not Actions); V6 empty (no
  product/config file touched by this ticket).
- **Status:** to record in progress.md.
- **Commit:** none (read-only asserts).

### Step 4 — Write the live-verification runbook (deferred discharge path)
- **Do:** write the numbered PRE/BEFORE/PUSH/AFTER procedure (Structure §Component 2) into this
  plan (below) and summarize in review.md. Reference T-005-03-01 progress.md §"Connection runbook"
  as the prerequisite.
- **Verify:** runbook has an explicit PASS/FAIL condition keyed to the SAME URL and "no manual
  publish."
- **Status:** included below.

### Step 5 — progress.md
- **Do:** log V1–V6 results, the runbook handoff, and any deviations.
- **Verify:** every V-check has a recorded result; deferral stated.

### Step 6 — review.md
- **Do:** handoff — what was verified, AC split status, coverage, open concerns, risk.
- **Verify:** AC table shows repo-side `[x]` and live `[~] deferred` with discharge path.

### Step 7 — Commit artifacts
- **Do:** single docs-only commit of the T-005-03-02 artifacts.
- **Verify:** `git status` clean afterward; diff is artifacts-only.
- **Commit:** `docs(T-005-03-02): verify deploy pipeline tracks main (repo-side) + live runbook`.

## The live-verification runbook (full form)

**Prerequisite (human, once):** execute T-005-03-01 progress.md §"Connection runbook" — connect the
GitHub repo to a Vercel project, confirm Production Branch = `main`, confirm framework/build.

```
BEFORE
  1. Open the production URL (Vercel-assigned, e.g. https://webapp-demo-lisa-vend.vercel.app).
     Expect: the current app skeleton loads (HTTP 200, renders).
  2. Record the "before" marker: note the SHA of main that is currently deployed
     (Vercel dashboard shows the live deployment's commit).
PUSH  (no manual publish)
  3. On main, make a trivial safe change (e.g. touch README / a whitespace commit),
     then: git push origin main.  Do NOT run `vercel --prod` or any manual deploy.
AFTER
  4. In the dashboard, observe a NEW deployment auto-created, tagged with the just-pushed SHA,
     building via `npm run build` (the gate). Wait for it to go green.
  5. Reload the SAME URL from step 1 (identical address — not a preview/branch URL).
  6. Confirm the live deployment is now the follow-up commit (new SHA promoted to production).

PASS  iff: same URL served both loads, the follow-up commit is reflected after the push,
           and zero manual publish steps were needed.
FAIL  if: the URL did not update, OR a manual `vercel --prod` was required, OR the update
           appeared only at a new/preview URL rather than the stable one.
```

## Rollback

Docs-only; `git revert` the artifacts commit. No product/runtime impact possible.

## Risk

Minimal. Read-only verification on a green tree; no product/config/CI change. The only residual is
the inherent deferral of the live observation, discharged by the runbook above once a human connects
the project — the same accepted residual as the three predecessor tickets.
