# Plan — T-005-03-01: connect-git-integration-auto-deploy

Ordered, independently-verifiable steps to execute Structure. Each step names its verification.
The single product change is a small additive `vercel.json` edit; the rest is artifacts + a
documented human runbook for the credential-gated live connect.

## Testing strategy (up front)

- **No automated tests.** The deliverable is Vercel deploy configuration, not executable product
  code — identical rationale to T-005-01-01 and T-005-02-01. Adding a unit test here would test
  nothing product-side (`vercel.json` is inert to `next build`).
- **Repo-side verification is behavioral/structural:** (a) `vercel.json` parses as valid JSON and
  carries the `git.deploymentEnabled.main: true` block; (b) `npm run build` stays green (proving
  the edit did not disturb the tree); (c) the change stays inside the config-only boundary
  (`git status` shows only `vercel.json` + this ticket's work artifacts).
- **Live verification is deferred** to a human with Vercel credentials (the runbook in Step 5),
  and is the province of the AC's dashboard observation + sibling ticket T-005-03-02. This deferral
  is documented, not silent — matching the two completed deploy tickets.

## Steps

### Step 1 — Blueprint artifacts (done before code)
Write research.md, design.md, structure.md, plan.md.
- **Verify:** four files exist under `docs/active/work/T-005-03-01/`.
- **Commit:** with the product change (Step 4) or as an artifacts batch, per repo convention.

### Step 2 — Baseline green check
Run `npm run build` before editing to confirm the tree is green at HEAD.
- **Verify:** build exits 0.
- Rationale: establishes that any later red is attributable, not pre-existing.

### Step 3 — Edit `vercel.json`
Add the `git` block exactly as Structure specifies:
```json
"git": {
  "deploymentEnabled": {
    "main": true
  }
}
```
appended after `buildCommand` (comma-separated, valid JSON).
- **Verify:** `node -e "JSON.parse(fs.readFileSync('vercel.json'))"` (or equivalent) succeeds and
  the parsed object has `git.deploymentEnabled.main === true`.

### Step 4 — Post-edit green check + boundary check
Re-run `npm run build`; inspect `git status --porcelain`.
- **Verify:** build exits 0 (proves `vercel.json` edit is inert to the build, as designed).
- **Verify:** the only changed product path is `vercel.json`; nothing under `app/`, `components/`,
  `lib/`, `package.json`, `package-lock.json`, `next.config.ts`, or `.gitignore`.

### Step 5 — Commit the product change
Commit `vercel.json` (+ artifacts) with a `chore(T-005-03-01):` message describing the
Git-auto-deploy codification.
- **Verify:** `git log -1` shows the commit; `git show` shows only the intended additive block.

### Step 6 — progress.md (runbook + deferral)
Record what shipped, the exact human connection runbook (dashboard connect → confirm production
branch = main → confirm build command → push → observe SHA-tagged deploy), and the explicit note
that the live connect/observation is deferred (no Vercel credentials/network in-sandbox).
- **Verify:** progress.md present and covers runbook + deferral.

### Step 7 — review.md (handoff)
Summarize files changed, verification performed, AC status (repo-side satisfied, live deferred),
test coverage (none, justified), and open concerns (the single deferred live step + T-005-03-02
follow-up).
- **Verify:** review.md present; then stop (Lisa advances phases from artifacts).

## What could go wrong (and the guard)

- **Invalid JSON after edit** → guard: Step 3 JSON.parse check before commit.
- **Accidentally changing deploy behavior** → guard: we declare only `main: true`, which mirrors
  Vercel's default production branch; no other branch policy is set (Design Option D rejected).
- **Scope leak** → guard: Step 4 boundary check restricts changed product paths to `vercel.json`.
- **Over-claiming the AC** → guard: Review marks the dashboard-observed end-state as deferred, with
  the runbook as the handoff — no green check is asserted for a step that did not run in-sandbox.

## Atomicity

The product change is a single small config edit — one atomic commit. Artifacts may ride along in
that commit (as sibling tickets did) or be committed alongside; either keeps the history clean and
the change reviewable in one diff.
