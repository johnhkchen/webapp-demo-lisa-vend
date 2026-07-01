# Progress — T-005-03-01: connect-git-integration-auto-deploy

Implement-phase log: what shipped, how it was verified, the human connection runbook for the
credential-gated live step, and deviations.

## Completed

| Plan step | Status | Evidence |
|-----------|--------|----------|
| 1 — blueprint artifacts | ✅ | research/design/structure/plan.md written and committed. |
| 2 — baseline green check | ✅ | `npm run build` exit 0 at HEAD before the edit. |
| 3 — edit `vercel.json` | ✅ | Added `git.deploymentEnabled.main: true`; `JSON.parse` OK; `git.deploymentEnabled.main === true`. |
| 4 — post-edit green + boundary | ✅ | `npm run build` exit 0 after edit; `git status` shows only `vercel.json` product-side. |
| 5 — commit | ✅ | `c9fe47c chore(T-005-03-01): declare main as Vercel auto-deploy branch in vercel.json`. |
| 6 — progress.md | ✅ | this file. |
| 7 — review.md | ⏭ | next. |

## What shipped (the product change)

`vercel.json` gained a `git` block:
```json
"git": {
  "deploymentEnabled": {
    "main": true
  }
}
```
This codifies "push to `main` auto-deploys" in-repo — versioned, review-visible, drift-proof —
next to the framework preset + build command (T-005-01-01) and the build gate (T-005-02-01). It
mirrors Vercel's default production-branch behavior, so it is additive and behaviorally inert; its
value is making the intent explicit rather than dashboard-only.

## Verification performed (repo-side)

| # | Check | Command | Result |
|---|-------|---------|--------|
| 1 | Baseline green | `npm run build` | exit 0 |
| 2 | JSON valid + field set | `node -e "require('./vercel.json')…"` | valid; `git.deploymentEnabled.main === true` |
| 3 | Post-edit green | `npm run build` | exit 0 (edit inert to build, as designed) |
| 4 | Boundary | `git status --porcelain` (product paths) | only `vercel.json` changed |

## Connection runbook (human step — requires Vercel account credentials)

The live Git-integration connect cannot run in-sandbox (no `.vercel/` link, no Vercel CLI, no
network to the platform). It is a one-time human action:

1. **Connect the repo.** In the Vercel dashboard, *Import / connect* the GitHub repo
   `johnhkchen/webapp-demo-lisa-vend` to a Vercel project — or, from a locally-linked checkout,
   run `vercel git connect`. This installs the GitHub app webhook that fires on push.
2. **Confirm Production Branch = `main`.** In Project → Settings → Git, verify the production
   branch is `main` (matches the repo default). `vercel.json`'s `git.deploymentEnabled.main: true`
   already declares main as an enabled deploy branch.
3. **Confirm build settings.** Framework = **Next.js**, Build Command resolves to
   `npm run build` (both from `vercel.json`). No override needed.
4. **Trigger + observe.** Push any commit to `main`. A new deployment should appear in the
   dashboard **tagged with the pushed commit SHA**, building via `npm run build`, with **no**
   hand-run `vercel --prod`. That observation is the literal AC end-state.

## Deviations from plan

None. The plan anticipated the credential-gated live step as deferred; it is documented here as the
runbook rather than executed, exactly as scoped. No `.github/` workflow and no secrets were added
(Design Option B rejected).

## Handoff

- **Repo-side codification: complete and committed.**
- **Live connect + dashboard observation: deferred** to a human with Vercel credentials (runbook
  above). Sibling ticket **T-005-03-02** (`verify-shareable-url-tracks-main`, `depends_on:
  [T-005-03-01]`) is the natural place the connected URL gets verified end-to-end.
