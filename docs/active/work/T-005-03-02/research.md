# Research — T-005-03-02: verify-shareable-url-tracks-main

Descriptive map of what exists and how it connects. This is a **verification** ticket, not a
feature: the deliverable is a repeatable procedure + repo-side evidence that the deploy pipeline is
correctly wired, plus the credential-gated live observation deferred by the prior three tickets.

## The ticket in one line

Confirm the stable public Vercel URL serves the current app **and** auto-refreshes on the next push
to `main` — the epic-level observable that "the running app is reachable at a public URL that
tracks main" (E-005, "Done looks like").

## Where this sits in the epic

E-005 (`wire-vercel-early-deploy`) advances P3 (Shippability). Its story S-005-03
(`git-auto-deploy-live-url`) has two tickets:

| Ticket | Title | Phase | Role |
|--------|-------|-------|------|
| T-005-03-01 | connect-git-integration-auto-deploy | **done** | Codified `main` as the auto-deploy branch in `vercel.json`; deferred the live connect + dashboard observation. |
| **T-005-03-02** | **verify-shareable-url-tracks-main** | research (this) | End-to-end: URL loads current app AND reflects a follow-up push at the SAME URL, no manual publish. |

T-005-03-02 `depends_on: [T-005-03-01]`. It is the designated home for the platform-observed proof
that all three prior tickets explicitly deferred (see below).

## What the three predecessor tickets already established

All three are `phase: done`. Each shipped a repo-side codification and deferred the credential-gated
live step to a human runbook — the accepted pattern for this epic in a sandbox:

- **T-005-01-01** (add-vercel-project-config) → `vercel.json` with `framework: nextjs`,
  `buildCommand: npm run build`. Deferred: live `npx vercel build` resolve.
- **T-005-02-01** (enforce-production-build-as-deploy-gate) → build-as-gate. Deferred: live
  "failing build not promoted" observation.
- **T-005-03-01** (connect-git-integration-auto-deploy) → `git.deploymentEnabled.main: true`.
  Deferred: live push → SHA-tagged deployment in dashboard. Its review.md §"Open concerns" #3
  states explicitly: *"End-to-end verification is T-005-03-02… where the connected live URL is
  confirmed to load and auto-refresh on a follow-up push."*

## The artifact under verification: `vercel.json`

Current contents at HEAD (`1c83cfc`), confirmed valid this session:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "git": { "deploymentEnabled": { "main": true } }
}
```

Node parse confirmed: `framework === "nextjs"`, `buildCommand === "npm run build"`,
`git.deploymentEnabled.main === true`. This is the complete in-repo half of "push to main →
auto-deploy to one stable URL."

## Repo / platform state observed this session

| Fact | Value | Source |
|------|-------|--------|
| Current branch | `main` | `git branch --show-current` |
| Default/production branch | `main` | repo default |
| Remote | `https://github.com/johnhkchen/webapp-demo-lisa-vend.git` | `git remote -v` |
| HEAD | `1c83cfc` | `git rev-parse --short HEAD` |
| `.vercel/` project link | **absent** | `ls .vercel` → not found |
| Vercel CLI | **absent** | `which vercel` → not found |
| Production build | **green** | `npm run build` → `✓ Compiled successfully`, routes `/` and `/_not-found` static |
| Platform network | none | no credentials, no token, no dashboard access in-sandbox |

## The hard constraint (same as all predecessors)

The literal acceptance criterion — "load the URL before and after a push, see the follow-up commit
reflected at the SAME URL with no manual publish" — is a **live platform observation**. It requires:

1. A Vercel project connected to the GitHub repo (GitHub-app webhook), and
2. The production branch confirmed as `main`, and
3. Human-held Vercel account credentials, and
4. Network access to the deployed URL.

None exist in the sandbox: no `.vercel/` link, no Vercel CLI, no credentials, no network. E-005
§"Context & constraints" flagged this from the start: *"the actual vercel --prod / Git-integration
connection may require human-held Vercel account credentials — flag that as an external
prerequisite… not as in-scope engineering."*

## Boundaries (E-005 hard boundary)

E-005 is deploy/CI wiring **only**. It touches `vercel.json` / deploy settings and edits **NO**
`lib/`, **NO** `components/`, **NO** game-loop/app-tick code. This ticket adds no product code at
all — verification tickets assert existing state; they do not modify it. Expected working-tree
change: artifacts under `docs/active/work/T-005-03-02/` only.

## What "verifiable in-sandbox" vs "deferred" looks like

- **In-sandbox (repo-side proxies):** config validity, correct fields, production branch = `main`,
  remote correct, green build (the deploy gate would pass), clean boundary. These prove the pipeline
  is *correctly configured to* track main.
- **Deferred (platform-side truth):** the actual URL loading before/after a real push. Requires the
  human connection runbook (T-005-03-01 progress.md) to have been executed by a credentialed human.

## Assumptions & open questions

- **A1:** `main` is the Vercel production branch once connected (matches repo default). Holds by
  Vercel's default behavior + `vercel.json` declaration.
- **A2:** No `.github/` deploy workflow exists or is wanted — native Git integration is the chosen
  mechanism (Option A, T-005-03-01). Confirmed: no `.github/` present.
- **Q1:** Has a human already connected the project + confirmed production branch? Unknown
  in-sandbox — this is the external prerequisite the verification runbook checks first.
- **Q2:** What is the actual public URL? Assigned by Vercel at connect time (e.g.
  `webapp-demo-lisa-vend.vercel.app`); not knowable in-repo until connected.

Do not propose solutions here — Design weighs how to discharge this verification given the
constraint.
