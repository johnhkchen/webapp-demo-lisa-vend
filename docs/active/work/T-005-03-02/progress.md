# Progress — T-005-03-02: verify-shareable-url-tracks-main

Execution log of the repo-side verification battery, the deferred live-verification handoff, and
deviations. Verification ticket — no product code produced.

## Completed

| Plan step | Status | Evidence |
|-----------|--------|----------|
| 1 — blueprint artifacts | ✅ | research/design/structure/plan.md written. |
| 2 — battery V1–V4 | ✅ | run this session; results below. |
| 3 — battery V5–V6 | ✅ | run this session; results below. |
| 4 — live runbook | ✅ | full form in plan.md §"live-verification runbook"; summarized in review.md. |
| 5 — progress.md | ✅ | this file. |
| 6 — review.md | ⏭ | next. |
| 7 — commit artifacts | ⏭ | after review.md — docs-only, scoped to this ticket. |

## Repo-side verification battery — results

All checks run against HEAD `1c83cfc` on branch `main`.

| # | Check | Command | Result |
|---|-------|---------|--------|
| V1 | Config valid + fields | `node -e "const c=require('./vercel.json');…"` | ✅ `framework==="nextjs"`, `buildCommand==="npm run build"`, `git.deploymentEnabled.main===true` |
| V2 | Production branch | `git branch --show-current` | ✅ `main` |
| V3 | Remote correct | `git config --get remote.origin.url` | ✅ `https://github.com/johnhkchen/webapp-demo-lisa-vend.git` |
| V4 | Deploy gate passes | `npm run build` | ✅ exit 0 — `✓ Compiled successfully`; routes `/` and `/_not-found` prerendered static |
| V5 | No competing CI deploy workflow | `ls .github 2>/dev/null` | ✅ absent — native Git integration is the chosen mechanism (Option A) |
| V6 | This ticket's product boundary | see note | ✅ this ticket touched **no** product/config file — only `docs/active/work/T-005-03-02/` |

**Interpretation:** V1–V5 confirm the pipeline is correctly *configured to* auto-deploy `main` to a
stable URL through the passing build gate. They are the reproducible repo-side proxies for the AC.
The one thing they cannot show — a URL actually loading before/after a real push — is the deferred
platform observation (below).

## Deviation / note on V6

`git status --porcelain -- … components …` reports `components/useAnimationFrameLoop.ts` as
modified. **This change is NOT from this ticket.** It is pre-existing/concurrent work from the
game-loop track (E-002/E-003), which shares the branch (Lisa runs multiple ticket threads on one
branch). This ticket created **only** files under `docs/active/work/T-005-03-02/` and modified no
code. E-005's hard boundary (no `lib/`, no `components/`, no game-loop code) is respected. To avoid
sweeping concurrent work into this ticket's commit, Step 7 stages **only**
`docs/active/work/T-005-03-02/`.

## Live-verification (deferred — credential-gated)

Cannot run in-sandbox: no `.vercel/` project link, no Vercel CLI (`which vercel` → not found), no
Vercel credentials, no network to the platform. Identical constraint to the three predecessor
tickets, each accepted on a deferred human runbook.

**Discharge path:** the numbered before/after runbook in `plan.md` §"live-verification runbook",
prerequisite = T-005-03-01 `progress.md` §"Connection runbook" (a human connects the repo to a
Vercel project and confirms Production Branch = `main`). Once connected, the runbook's PASS
condition — same URL served before and after a push, follow-up commit reflected, zero manual publish
— is the literal AC end-state.

## Handoff

- **Repo-side verification: complete.** V1–V6 recorded green; pipeline correctly configured to track
  main; deploy gate passes; boundary clean.
- **Live URL observation: deferred** to a credentialed human via the runbook. This ticket is the
  designated end-to-end home (per T-005-03-01 review.md §"Open concerns" #3); the runbook makes the
  remaining step mechanical.
