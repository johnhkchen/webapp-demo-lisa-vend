# Design — T-005-03-01: connect-git-integration-auto-deploy

From Research: the AC's live end-state (a push observed triggering a dashboard-visible deployment)
is a credential-gated **platform action** that cannot run in-sandbox. The design question is
therefore: *what is the correct in-repo, versioned deliverable that establishes and codifies Git
auto-deploy, given the live connect is a deferred human step?* Enumerate approaches, evaluate
against the Research reality, decide.

## The two halves of "done"

1. **Trigger mechanism** — what makes a push to `main` start a deployment. This is Vercel's Git
   integration (a dashboard/credential-held connection). No repo file can perform it.
2. **Codification** — the review-visible, versioned declaration of the auto-deploy intent (which
   branch deploys), living in-repo so it is drift-proof and consistent with the sibling tickets.

The repo can own half 2 fully and *document the runbook* for half 1. It cannot execute half 1.

## Options considered

### Option A — Native Vercel Git integration + codify branch intent in `vercel.json`  ✅ CHOSEN

Rely on Vercel's native Git integration for the trigger (connected once by a human in the
dashboard / via `vercel git connect`). In-repo, add a `git` block to `vercel.json` declaring
`deploymentEnabled.main: true`, making "push to main auto-deploys" explicit and versioned. Provide
a concise connection runbook in the work artifacts. Defer the live connect + dashboard observation
to the human/CI step, documented in Review — exactly as T-005-01-01/02-01 deferred their
credential-gated steps.

- **Pros:** Matches the epic's language literally ("connect Git integration"). Zero secrets/tokens
  in-repo. No CI file to maintain. Vercel captures the commit SHA and dashboard visibility for
  free. The in-repo change is additive, behaviorally-inert vs. Vercel defaults, and fully in the
  E-005 config-only boundary. Continues the established "codify the default in-repo" pattern.
- **Cons:** The live connection can't be exercised in-sandbox — the AC's observed end-state is
  deferred to a human with Vercel credentials. Mitigated exactly as the two prior deploy tickets
  mitigated the identical limitation: verifiable repo-side codification + an explicit, documented
  handoff.

### Option B — GitHub Actions workflow running `vercel deploy --prod`

Add `.github/workflows/deploy.yml` that runs the Vercel CLI on push to main, authenticated by
`VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` GitHub secrets.

- **Pros:** The trigger definition is fully in-repo and self-documenting; the SHA binding is
  explicit in the workflow run.
- **Cons:** **Rejected.** It duplicates what native integration does for free, and the epic
  explicitly frames the work as *connecting Git integration*, not building a CI deploy job. It
  introduces a long-lived `VERCEL_TOKEN` to manage/rotate (a security surface the demo doesn't
  want) and still needs the same human-held credentials to mint the token and project IDs — so it
  removes none of the credential dependency while adding maintenance and a second, competing deploy
  path. Also still unverifiable in-sandbox (no secrets, no network). More moving parts, same
  deferral, worse fit to the epic's intent.

### Option C — No repo change; runbook only (document the dashboard steps, touch no files)

Write only a connection runbook; make no `vercel.json` change.

- **Pros:** Absolute minimum footprint; nothing can break.
- **Cons:** **Rejected.** Leaves the auto-deploy branch intent living *only* in the dashboard —
  the precise anti-pattern E-005 exists to fix ("deploy settings live in-repo, versioned,
  review-visible"). The two sibling tickets both chose a small, versioned config codification over
  pure documentation; parity argues for the same here. A one-line `git` block is cheap insurance
  against dashboard drift (e.g. someone disabling main deploys) being invisible to review.

### Option D — Codify with `git.deploymentEnabled` set to disable non-prod branches too

Extend the `git` block to also set feature branches to `false` (production-only deploys).

- **Cons:** **Rejected as scope creep.** The AC asks only that *push to main* auto-deploys; it says
  nothing about suppressing preview deploys. Enumerating/blocking other branches is a policy
  decision beyond this ticket and beyond E-005's "just wire main auto-deploy" intent. Keep the
  declaration to the one branch the AC names.

## Decision

**Option A.** Add a minimal `git` block to `vercel.json` declaring `deploymentEnabled.main: true`
(the versioned "push to main auto-deploys" intent), and provide a short human-run connection
runbook + explicit deferral in the artifacts. This is the approach that (a) matches the epic's
"connect Git integration" language, (b) keeps the deploy config in-repo and drift-proof, (c) adds
no secrets/CI surface, and (d) mirrors the exact codify-in-repo + defer-live-step pattern the two
completed sibling tickets established.

## Why this is grounded in the research, not assumption

- Research confirmed `vercel.json` exists with framework+build but **no `git` block** — so the
  branch-deploy intent is currently un-versioned; adding it is a real, review-visible improvement.
- Research confirmed `main` is both the current branch and the repo default (hence Vercel's
  production branch), so `deploymentEnabled.main: true` targets the correct branch and mirrors
  Vercel's default — behaviorally inert, purely a codification.
- Research confirmed the two prior deploy tickets both deferred their credential-gated live steps
  and were accepted on that basis — establishing that a deferred live connect is the norm here,
  not a gap this ticket must close.
- Research confirmed `vercel.json` is not consumed by `next build`, so the edit cannot break the
  green tree — the only verification needed repo-side is JSON validity + an unchanged build.

## What acceptance rests on after this ticket

- **Repo-side (this ticket, verifiable now):** `vercel.json` declares `main` as an auto-deploy
  branch; JSON is valid against the schema; the tree stays green.
- **Live (deferred to human with Vercel credentials — the runbook):** connect the repo to a Vercel
  project once (dashboard "Import Project" / `vercel git connect`), push a commit to main, and
  observe the SHA-tagged deployment appear and build in the dashboard. This is the literal AC
  end-state and is documented as the handoff step in Review, consistent with sibling precedent.
