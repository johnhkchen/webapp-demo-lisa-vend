# Design — T-005-03-02: verify-shareable-url-tracks-main

Decision: **how to discharge an end-to-end deploy verification when the live platform observation is
credential-gated and unreachable from the sandbox.** Grounded in Research.

## The tension

The AC is a live observation: "load the production URL, push a follow-up commit to `main`, load the
URL again, see the new commit reflected at the SAME URL with no manual publish." Two facts collide:

1. The AC's truth lives on the Vercel platform (a running URL + a real webhook-triggered rebuild).
2. The sandbox has no `.vercel/` link, no Vercel CLI, no credentials, no network (Research §"hard
   constraint"). The three predecessor tickets hit the identical wall and were **accepted** on a
   repo-side codification + a deferred human runbook.

A verification ticket cannot invent access it doesn't have. The question is what constitutes an
honest, reviewable "done" for the *verification* given the constraint — not whether to fake the
observation.

## Options considered

### Option A — Repo-side verification of pipeline correctness + a concrete live-verification runbook (CHOSEN)

Split the AC exactly as the epic and the three predecessors did: **codify/verify the half the repo
owns, provide a runnable procedure for the half only a credentialed human can execute.**

- **Verify in-sandbox (proxies for "configured to track main"):** `vercel.json` is valid and
  declares `framework: nextjs`, `buildCommand: npm run build`, `git.deploymentEnabled.main: true`;
  production branch = `main`; remote correct; `npm run build` green (the deploy gate passes); clean
  boundary (no product files touched). These prove the pipeline is correctly wired *to* auto-deploy
  main to a stable URL.
- **Defer with a precise runbook:** a numbered before/after procedure a human runs once connected —
  load URL (record commit marker), push a trivial commit to main, watch the dashboard build the new
  SHA, reload the SAME URL, confirm the new marker, with no `vercel --prod`. Explicit pass/fail per
  step.
- **Fit:** identical to the accepted pattern (T-005-01-01/02-01/03-01). Honest about what was and
  wasn't observed. No new deps, no product code, no secrets. Reversible (docs only).
- **Cost:** the literal live observation remains `[~]` deferred — but that is inherent to the
  constraint, not a shortcut, and the runbook makes the remaining step mechanical.

### Option B — Add a GitHub Actions workflow that curls the deployed URL and asserts the SHA (REJECTED)

A CI job hits the production URL after deploy and greps for the commit SHA to prove the URL tracks
main.

- **Rejected because:** (1) needs the URL + a `VERCEL_*`/deploy secret to know *when* the deploy
  finished — same credential gate, now with a token to manage; (2) E-005's hard boundary is native
  Git integration (Option A there) — a `.github/` workflow is the rejected Option B of T-005-03-01,
  reintroduced; (3) adds standing CI surface for a one-time verification; (4) the app doesn't
  currently expose its commit SHA in the served HTML, so the assertion would need product code —
  crossing E-005's "edits NO components" boundary. Wrong shape, more surface, same deferral.

### Option C — Stand up a throwaway Vercel project from the sandbox to observe it live (REJECTED)

Install the CLI, `vercel login`, connect, push, observe.

- **Rejected because:** requires interactive human-held credentials (`vercel login` is an external
  auth the agent cannot and must not perform), network the sandbox lacks, and it would verify a
  *throwaway* project, not the real shareable URL. It also risks creating stray Vercel projects. The
  credential-gated live connect is explicitly an **external prerequisite** per E-005, not in-scope
  agent engineering.

### Option D — Mark AC met purely from config inspection (REJECTED)

Assert "tracks main" from `vercel.json` alone.

- **Rejected because:** dishonest. Config *intent* is not a *loaded URL*. The AC says "verified by
  loading the URL before and after the push." Claiming observation without it would misreport
  outcomes. Option A's `[~]` deferral states plainly what was not observed.

## Decision

**Option A.** Verify every repo-side proxy that must hold for the URL to track main, and hand off
the single credential-gated observation via a precise, runnable before/after runbook. This mirrors
the three accepted predecessors, respects E-005's hard boundary (no product/CI code), and reports
honestly: repo-side `[x]`, live observation `[~] deferred`.

## Why this is the right altitude

The epic front-loaded shippability as a *standing* property. The repo's contribution is a correct,
drift-proof, review-visible configuration; the platform's contribution is the running URL. This
ticket verifies the former exhaustively and scripts the latter. Nothing more is verifiable without
credentials; nothing less would be honest.

## What Design commits to for Structure/Plan

- **No product-code or CI changes.** Artifacts only under `docs/active/work/T-005-03-02/`.
- **Repo-side verification battery** (config validity/fields, branch, remote, green build,
  boundary) — run and recorded with commands + results.
- **Live-verification runbook** — numbered before/after procedure with per-step pass/fail, keyed to
  the same URL, requiring no manual publish; references T-005-03-01's connection runbook as the
  prerequisite.
- **AC status** reported split: repo-side proxies `[x]`, live URL observation `[~] deferred` with
  the runbook as the discharge path.
- **No frontmatter edits** (Lisa owns phase/status).
