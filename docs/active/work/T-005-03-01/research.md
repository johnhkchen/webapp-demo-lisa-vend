# Research — T-005-03-01: connect-git-integration-auto-deploy

Descriptive map of the repo as it bears on wiring Vercel Git integration so every push to
`main` auto-deploys. What exists, where, how it connects, and the constraints. No solutions here.

## The ticket in one line

Connect Vercel Git integration so a push to `main` **automatically** triggers a build+deploy —
no hand-run `vercel --prod` — tied to the pushed commit SHA and visible in the Vercel dashboard.
AC: a push to main auto-triggers a Vercel deployment (no manual deploy command), bound to the
pushed SHA, observable in the dashboard.

## Where this sits in the epic

E-005 (`wire-vercel-early-deploy`) front-loads the P3 "Shippability" invariant: stand up the
deploy pipeline early so the demo has a real, self-updating public URL from the moment the
skeleton runs. The epic is split into three tracks:

1. **project-config** — S-005-01 / T-005-01-01 → `vercel.json` declaring the Next.js preset +
   `npm run build`. **Done.**
2. **build-gate** — S-005-02 / T-005-02-01 → pinned `next.config.ts` so a failing build blocks
   the deploy. **Done.**
3. **Git-auto-deploy** — S-005-03, **this story**. T-005-03-01 (this ticket) connects the Git
   integration; sibling T-005-03-02 then verifies the live URL tracks main.

This ticket is the *connect* slice. Its `depends_on: [T-005-02-01]` is satisfied (`phase: done`),
so both upstream config layers — the framework/build declaration and the build gate — are already
in place and ready to be triggered by a Git-driven build.

### HARD BOUNDARY (from E-005)

Deploy/CI wiring only. This ticket touches **Vercel project config / Git-integration settings**
and edits **NO** game logic (`lib/`), **NO** components (`components/`), **NO** app-tick/game-loop
code (`app/`). The epic explicitly flags the actual Git-integration connection as possibly
requiring **human-held Vercel account credentials** — an external prerequisite, not in-repo
engineering.

## Repo state (the ground truth)

The Next.js/TypeScript skeleton is scaffolded and green; both dependency layers exist:

- `vercel.json` (from T-005-01-01) — repo root, tracked:
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "nextjs",
    "buildCommand": "npm run build"
  }
  ```
  Declares framework preset + build command. **No `git` block yet** — nothing in-repo currently
  states which branch auto-deploys.
- `next.config.ts` (from T-005-02-01) — pins `typescript.ignoreBuildErrors: false`, so a real
  compile/type error fails `npm run build` and, on Vercel, fails the deployment.
- `package.json` — `build` → `next build`; `next 16.2.9`, React 19. `private: true`.
- Git: single remote `origin` → `https://github.com/johnhkchen/webapp-demo-lisa-vend.git`
  (GitHub). Current branch **`main`** (also the repo default branch).
- `.gitignore` ignores `.vercel` (the local link dir) — so any local `vercel link` state is
  correctly untracked. `vercel.json` itself is tracked.
- **No `.vercel/` dir exists** — the repo has never been linked to a Vercel project locally.
- **No `.github/workflows/`** — no GitHub Actions / CI workflow exists.

## How Vercel Git auto-deploy actually works

Two distinct mechanisms can satisfy "push to main → auto-deploy":

1. **Native Vercel Git integration (the intended path).** A one-time connection, made in the
   Vercel dashboard (or `vercel git connect`), links the GitHub repo to a Vercel project. Once
   connected, Vercel installs a GitHub app webhook; **every push** to the repo's **production
   branch** (the repo default branch, here `main`) triggers a production build that runs the
   declared `buildCommand` and, on success, promotes to the production URL. Pushes to other
   branches produce preview deployments. No CI file, no secrets in-repo — Vercel owns the trigger.
   The commit SHA is captured automatically and shown against each deployment in the dashboard.
2. **GitHub Actions + Vercel CLI (alternative).** A `.github/workflows/*.yml` runs
   `vercel deploy --prod` on push, authenticated by `VERCEL_TOKEN` + org/project IDs stored as
   GitHub secrets. Fully in-repo, but duplicates what native integration does for free, adds a
   token to manage, and is *not* what the epic describes ("connect Git integration").

## What is versioned-in-repo vs. dashboard/credential-held

- **Repo-side, versionable now:** the *intent* that `main` is the auto-deploy branch. `vercel.json`
  supports a `git` block — `git.deploymentEnabled` maps branch → boolean, controlling whether
  pushes to that branch create deployments. Declaring `{ "main": true }` codifies "push to main
  auto-deploys" as a review-visible, drift-proof line — the same "codify the default in-repo"
  philosophy T-005-01-01 (framework/build) and T-005-02-01 (build gate) applied.
- **Dashboard/credential-held, NOT versionable:** the actual project↔repo link, the GitHub app
  install, and the resulting webhook. These live in the Vercel account and require human-held
  credentials to create. No file in this repo can *perform* the connection.

## Precedent in this repo

The two sibling deploy tickets set the exact pattern this ticket should follow:

- **T-005-01-01** created `vercel.json` (codify framework+build), and in Review **deferred** the
  live `npx vercel build` resolve because the Vercel CLI/account is unavailable in-sandbox.
- **T-005-02-01** pinned the build gate, proved the *trigger* locally (a type error → `build`
  exit 1), and **deferred** the live "not promoted" observation to the platform/human, resting on
  documented Vercel default behavior.

Both: make the in-repo codification real and verifiable; defer the credential-gated live step to a
human, documented explicitly in Review. This ticket inherits that shape exactly.

## Constraints & assumptions

- **Config-only.** At most a small, additive `vercel.json` edit (a `git` block) + work artifacts.
  No edits under `app/`, `components/`, `lib/`; no dependency changes; no ticket-frontmatter edits
  (Lisa owns phase/status).
- **Verification limit (important).** The literal AC end-state — a push observed triggering a
  deployment in the **Vercel dashboard** — requires a connected Vercel project + human-held
  credentials + network to the platform. **None are available in-sandbox** (no `.vercel/`, no
  Vercel CLI, no registry/network access). The live connect + dashboard observation must be
  surfaced in Review as a deferred, human/CI step — with the repo-side codification and its JSON
  validity checked in its place.
- **`vercel.json` does not affect `npm run build`.** The `git` block is consumed by Vercel's
  deploy layer, not by `next build`; adding it cannot break the local build (a green-tree check
  still applies for safety).
- **Idempotent with Vercel defaults.** `main` is already the production/default branch; declaring
  `git.deploymentEnabled.main: true` mirrors default behavior and changes no deploy semantics — it
  makes the intent explicit, versioned, and review-visible.
