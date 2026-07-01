# Review — T-005-03-01: connect-git-integration-auto-deploy

Handoff document. What changed, how it was verified, coverage, AC status, and what needs
human/platform attention. Enough to review without reading every diff.

## What changed

One product file modified; no product files created or deleted.

| File | Change | Notes |
|------|--------|-------|
| `vercel.json` | **modified** | Adds a `git` block — `deploymentEnabled.main: true` — codifying "push to `main` auto-deploys" in-repo, versioned and drift-proof, next to the framework preset + build command (T-005-01-01) and the build gate (T-005-02-01). |
| `docs/active/work/T-005-03-01/*.md` | **new** | RDSPI artifacts (research, design, structure, plan, progress, review). |

Final `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  }
}
```

Nothing under `app/`, `components/`, `lib/`, `next.config.ts`, `package.json`,
`package-lock.json`, or `.gitignore` was touched. No dependency added. No `.github/` workflow and
no secrets/tokens introduced. No ticket/story/epic frontmatter edited (Lisa owns phase/status).

**Commit:** `c9fe47c chore(T-005-03-01): declare main as Vercel auto-deploy branch in vercel.json`.

## The design in one paragraph

"Push to main → auto-deploy" has two halves: a **trigger** (Vercel's native Git integration — a
GitHub-app webhook created by a one-time, credential-gated dashboard connection) and a
**codification** (the versioned, review-visible declaration of *which* branch auto-deploys). The
repo can own the codification fully and cannot perform the trigger. This ticket declares
`git.deploymentEnabled.main: true` in `vercel.json` — mirroring Vercel's default production branch,
so it is additive and behaviorally inert, but now explicit and drift-proof in-repo — and documents
the human connection runbook for the trigger. Same "codify the default, in-repo, versioned + defer
the credential-gated live step" pattern T-005-01-01 (framework/build) and T-005-02-01 (build gate)
established and were accepted on. A GitHub Actions deploy workflow (Option B) was rejected: it
duplicates native integration, adds a `VERCEL_TOKEN` to manage, and still needs the same
human-held credentials — more surface, same deferral, worse fit to the epic's "connect Git
integration" intent.

## Acceptance criteria — status

**AC:** *A push to main automatically triggers a Vercel deployment (no hand-run deploy command)
tied to the pushed commit SHA, visible in the Vercel dashboard.*

- [x] **In-repo codification of the auto-deploy branch** — `vercel.json` now declares `main` as an
  enabled deploy branch (`git.deploymentEnabled.main: true`), valid JSON against the schema, tree
  green. The versioned half of the AC.
- [~] **Push observed triggering a SHA-tagged deployment in the Vercel dashboard** — this is the
  credential-gated **platform** end-state. It **was not executed here**: the sandbox has no
  connected Vercel project (`.vercel/` absent), no Vercel CLI, and no network to the platform.
  **Deferred** to a human with Vercel credentials via the connection runbook (progress.md §
  "Connection runbook") — exactly as T-005-01-01 deferred the live `vercel build` resolve and
  T-005-02-01 deferred the live "not promoted" observation. Once the repo is connected and the
  production branch confirmed as `main`, a push produces the SHA-tagged deployment with no manual
  `vercel --prod`.

## Verification performed

| # | Check | Command | Result |
|---|-------|---------|--------|
| 1 | Baseline green | `npm run build` | exit 0 |
| 2 | JSON valid + field set | `node -e "require('./vercel.json')…"` | valid; `git.deploymentEnabled.main === true` |
| 3 | Post-edit green | `npm run build` | exit 0 (edit is inert to `next build`, as designed) |
| 4 | Boundary | `git status --porcelain` (product paths) | only `vercel.json` changed |

## Test coverage

No automated tests added, and none are appropriate — the deliverable is Vercel deploy
configuration, not executable product code (same rationale as T-005-01-01 / T-005-02-01).
`vercel.json` is inert to `next build`, so a unit test would assert nothing product-side. The
meaningful checks are structural/behavioral (valid JSON, correct field, green build, clean
boundary) and were run. `lib/` purity and lint boundaries are unaffected (no `lib/` change).

## Open concerns & follow-ups

1. **Live connect + dashboard observation deferred (primary gap).** The literal AC end-state — a
   push observed creating a SHA-tagged deployment in the Vercel dashboard — needs a connected
   Vercel project + human-held credentials + platform network, none available in-sandbox. The
   one-time human runbook is in progress.md. Expected to hold: `main` is the repo default/production
   branch, the framework/build config is declared, and the build gate is pinned — so a connected
   project auto-deploys main on push by Vercel's default behavior.
2. **Native integration is dashboard-held, not fully in-repo.** By design (Option A), the webhook
   connection lives in the Vercel account; the repo holds only the branch-intent declaration. If a
   human later disables main deploys in the dashboard, `vercel.json` still declaring `main: true`
   makes the drift a visible, reviewable inconsistency — which is the point of codifying it.
3. **End-to-end verification is T-005-03-02.** The sibling ticket
   (`verify-shareable-url-tracks-main`, `depends_on: [T-005-03-01]`) is where the connected live URL
   is confirmed to load and auto-refresh on a follow-up push — the natural home for the
   platform-observed proof this ticket defers.

## Risk assessment

Minimal. One additive, behaviorally-inert config block on the green tree (it mirrors Vercel's
default production-branch behavior), fully reversible via `git revert c9fe47c`. Cannot affect the
game/render tracks — no shared files, and `vercel.json` is not read by `next build`. The only
residual is the deferred live connect/observation (concern #1), which rests on Vercel's documented
default Git-integration behavior and is picked up operationally by T-005-03-02.
