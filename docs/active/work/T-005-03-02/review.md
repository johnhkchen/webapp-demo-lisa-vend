# Review — T-005-03-02: verify-shareable-url-tracks-main

Handoff document. What was verified, how, AC status, coverage, and what needs human/platform
attention. Enough to review without re-running everything.

## What this ticket is

An **end-to-end verification** ticket — the designated home (per T-005-03-01 review.md §"Open
concerns" #3) for confirming the epic-level observable: *the running app is reachable at a stable
public URL that tracks `main`.* It produces **no product code**. Deliverable = a repo-side
verification battery (run + recorded) plus a runnable live-verification runbook for the single
credential-gated observation.

## What changed

| Path | Change | Notes |
|------|--------|-------|
| `docs/active/work/T-005-03-02/*.md` | **new** | RDSPI artifacts (research, design, structure, plan, progress, review). |

**No product/config/CI files changed.** `vercel.json`, `app/`, `components/`, `lib/`,
`next.config.ts`, `package.json`, `package-lock.json`, `.gitignore` — untouched. No `.github/`
workflow, no dependency, no secret/token. (Note: `components/useAnimationFrameLoop.ts` shows as
modified in the shared branch — that is concurrent game-loop work, **not** this ticket; see
progress.md §"Deviation / note on V6". This ticket's commit stages only its own artifacts.)

## Acceptance criterion — status (split)

**AC:** *The production URL loads the running skeleton; a follow-up commit pushed to main is
reflected at the SAME URL with no manual publish — verified by loading the URL before and after the
push.*

- [x] **Pipeline verified correctly configured to track main (repo-side).** All proxies that must
  hold are green: `vercel.json` valid with `framework: nextjs`, `buildCommand: npm run build`,
  `git.deploymentEnabled.main: true`; production branch = `main`; correct remote; `npm run build`
  green (the deploy gate passes, so a push builds and promotes); no competing `.github/` deploy
  workflow; clean product boundary. This is everything the repo can prove.
- [~] **Live URL observed loading before/after a real push.** The literal platform end-state. **Not
  executed here** — the sandbox has no `.vercel/` link, no Vercel CLI, no credentials, no network
  (same wall the three predecessors hit and were accepted on). **Deferred** to a credentialed human
  via the runbook in plan.md, prerequisite = T-005-03-01's connection runbook. Once the project is
  connected, the runbook's PASS condition *is* this observation.

## Verification performed

| # | Check | Command | Result |
|---|-------|---------|--------|
| V1 | Config valid + fields | `node -e "…require('./vercel.json')…"` | framework `nextjs`, build `npm run build`, `git.deploymentEnabled.main` true |
| V2 | Production branch | `git branch --show-current` | `main` |
| V3 | Remote | `git config --get remote.origin.url` | `…/johnhkchen/webapp-demo-lisa-vend.git` |
| V4 | Deploy gate | `npm run build` | exit 0; `/`, `/_not-found` static |
| V5 | No competing CI deploy | `ls .github` | absent |
| V6 | This ticket's boundary | staged paths | only `docs/active/work/T-005-03-02/` |

## Test coverage

No automated tests added, and none are appropriate — the deliverable is deploy verification, not
executable product code (same rationale accepted for T-005-01-01 / T-005-02-01 / T-005-03-01).
`vercel.json` is inert to `next build`; a unit test would assert nothing product-side. The
meaningful checks are structural/behavioral (V1–V6) and were run and recorded. No `lib/` or
`components/` code was touched, so purity/lint boundaries are unaffected.

## The live-verification runbook (the deferred discharge path, in brief)

Prerequisite: a human executes T-005-03-01 progress.md §"Connection runbook" (connect repo →
Vercel project, confirm Production Branch = `main`). Then:

1. Open the stable production URL → the app skeleton loads; note the currently-deployed SHA.
2. Push a trivial commit to `main` (no `vercel --prod`).
3. Watch the dashboard auto-build the new SHA via `npm run build`; on green, reload the **same**
   URL and confirm the follow-up commit is now live.

PASS iff same URL both loads, follow-up reflected, zero manual publish. Full form in plan.md.

## Open concerns & follow-ups

1. **Live observation deferred (primary, inherent gap).** The URL-load-before/after is
   credential-gated and unreachable in-sandbox. Discharged by the runbook once a human connects the
   project. This is the last remaining step for S-005-03 / E-005's "Done looks like" to be *observed*
   true (it is already *configured* true).
2. **URL is unknown until connect.** The stable address is Vercel-assigned at connect time (e.g.
   `webapp-demo-lisa-vend.vercel.app`); the runbook is written to be URL-agnostic ("the same URL").
3. **Shared-branch concurrency.** `components/useAnimationFrameLoop.ts` is modified by concurrent
   game-loop work; this ticket neither owns nor commits it. No missing dependency edge — E-005
   (deploy) and E-002/E-003 (game loop) touch disjoint files; the only shared file is `vercel.json`,
   which this ticket reads but does not modify.

## Risk assessment

Minimal. Read-only verification on a green tree; docs-only commit scoped to this ticket's artifacts;
fully reversible via `git revert`. Cannot affect the game/render tracks (no shared mutable files).
The sole residual is the inherent deferral of the live observation (concern #1), which rests on
Vercel's documented default Git-integration behavior and is made mechanical by the runbook.
