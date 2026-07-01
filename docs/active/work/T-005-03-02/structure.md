# Structure — T-005-03-02: verify-shareable-url-tracks-main

The blueprint. This is a verification ticket: **no product code, no config, no CI files change.**
The only filesystem changes are RDSPI artifacts under `docs/active/work/T-005-03-02/`.

## Files created / modified / deleted

| Path | Action | Purpose |
|------|--------|---------|
| `docs/active/work/T-005-03-02/research.md` | create | Codebase/pipeline map (done). |
| `docs/active/work/T-005-03-02/design.md` | create | Option A decision + rejections (done). |
| `docs/active/work/T-005-03-02/structure.md` | create | This blueprint. |
| `docs/active/work/T-005-03-02/plan.md` | create | Ordered verification steps + strategy. |
| `docs/active/work/T-005-03-02/progress.md` | create | Execution log of the repo-side battery + runbook handoff. |
| `docs/active/work/T-005-03-02/review.md` | create | Handoff: AC status, coverage, concerns. |

**Product/config/CI files touched: none.** Expected `git status --porcelain` (product paths):
empty. Explicitly NOT touched: `vercel.json`, `app/`, `components/`, `lib/`, `next.config.ts`,
`package.json`, `package-lock.json`, `.gitignore`, `.github/` (absent, stays absent). No new
dependency, no secret/token.

## The verification as two named components

### Component 1 — Repo-side verification battery (executed in-sandbox)

The set of checks that must all hold for the URL to be *configured to* track main. Each is a
command with a recorded result. This is the executable, reproducible core of the ticket.

| # | Check | Command | Pass condition |
|---|-------|---------|----------------|
| V1 | Config valid + fields | `node -e "const c=require('./vercel.json');…"` | `framework==="nextjs"`, `buildCommand==="npm run build"`, `git.deploymentEnabled.main===true` |
| V2 | Production branch | `git branch --show-current` | `main` |
| V3 | Remote correct | `git config --get remote.origin.url` | `…/johnhkchen/webapp-demo-lisa-vend.git` |
| V4 | Deploy gate passes | `npm run build` | exit 0, static routes generated |
| V5 | No `.github/` deploy workflow | `ls .github 2>/dev/null` | absent (native integration is the mechanism) |
| V6 | Boundary clean | `git status --porcelain -- vercel.json app components lib` | empty |

V1–V4 confirmed green this session; V5–V6 recorded in progress.md.

### Component 2 — Live-verification runbook (deferred to a credentialed human)

A numbered before/after procedure that discharges the literal AC once the project is connected
(prerequisite: T-005-03-01 progress.md §"Connection runbook" executed). Shape:

```
PRE  0. Confirm project connected + Production Branch = main (T-005-03-01 runbook steps 1–3).
BEFORE
     1. Open the production URL (e.g. https://webapp-demo-lisa-vend.vercel.app).
     2. Record a "before" marker: the currently-served build (page loads the skeleton;
        note current main SHA = the deployed commit).
PUSH
     3. Make a trivial, safe commit on main (e.g. whitespace/README touch) and `git push origin main`.
        Do NOT run `vercel --prod` — the whole point is no manual publish.
AFTER
     4. In the Vercel dashboard, watch a new deployment appear tagged with the pushed SHA,
        building via `npm run build`.
     5. On green, reload the SAME URL (no URL change).
     6. Confirm the "after" state reflects the follow-up push (new SHA is the live deployment).
PASS iff: same URL, new commit reflected, zero manual publish steps. FAIL otherwise (e.g. URL
static, or a manual deploy was required, or a new URL was minted).
```

This lives in plan.md (full form) and is summarized in review.md as the deferred discharge path.

## Interfaces / boundaries

- **Public interface of this ticket:** the artifacts. No code symbols, no runtime surface.
- **Dependency:** consumes T-005-03-01's committed `vercel.json` state and its connection runbook;
  produces the verification of it. No shared mutable files with any concurrent ticket (docs-only,
  ticket-scoped subdir) → no lock contention.
- **Ordering:** V1–V6 are order-independent (all read-only asserts); run then record. The runbook
  is strictly after a human executes the connection runbook — documented, not executed here.

## What a reviewer will check

1. No product/config/CI diff (verification ticket touched nothing but its own artifacts).
2. Repo-side battery V1–V6 all recorded green.
3. AC reported honestly: repo-side `[x]`, live URL observation `[~] deferred` with a concrete,
   runnable discharge path — consistent with the three accepted predecessors.
