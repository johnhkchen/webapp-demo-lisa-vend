# Structure — T-005-03-01: connect-git-integration-auto-deploy

The blueprint for Option A (Design): codify the "push to main auto-deploys" intent in `vercel.json`
and provide a human-run connection runbook, deferring the live connect. Files, boundaries, ordering.

## Files touched

| Path | Action | Purpose |
|------|--------|---------|
| `vercel.json` | **modify** | Add a `git` block with `deploymentEnabled.main: true` — the versioned declaration that pushes to `main` trigger deployments. |
| `docs/active/work/T-005-03-01/research.md` | new | RDSPI research artifact. |
| `docs/active/work/T-005-03-01/design.md` | new | RDSPI design artifact. |
| `docs/active/work/T-005-03-01/structure.md` | new | This file. |
| `docs/active/work/T-005-03-01/plan.md` | new | RDSPI plan artifact. |
| `docs/active/work/T-005-03-01/progress.md` | new | Implement-phase progress log (includes the connection runbook). |
| `docs/active/work/T-005-03-01/review.md` | new | RDSPI review / handoff. |

**Nothing else.** No edits under `app/`, `components/`, `lib/`; no `package.json` /
`package-lock.json` change; no new dependency; no `.github/` workflow; no ticket/story/epic
frontmatter edits (Lisa owns phase/status). Exactly one product file changes.

## The `vercel.json` change — exact shape

Current:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build"
}
```

Target:
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

### Field semantics (the public interface)

- `git.deploymentEnabled` — a map of `branch → boolean`. When a branch is set to `true`, pushes to
  that branch create Vercel deployments; `false` suppresses them. `main` is the repo's production /
  default branch (Research), so `"main": true` codifies "push to main auto-deploys" and mirrors
  Vercel's default behavior — additive and behaviorally inert, purely making the intent versioned
  and drift-proof.
- We declare **only** `main` (per Design Option D rejection): the AC names only push-to-main; we do
  not enumerate or disable other branches.
- `$schema` stays first — the declared block validates against
  `https://openapi.vercel.sh/vercel.json`, satisfying "config schema validates" in spirit and
  keeping editor validation working.

## Boundaries & invariants

- **Config-only boundary (E-005).** The change lives entirely in Vercel deploy config. The build
  gate (`next.config.ts`) and framework/build declaration (`framework`, `buildCommand`) from the
  sibling tickets are **relied upon, not modified**.
- **`next build` independence.** `vercel.json` is not read by `next build`; the `git` block cannot
  affect the local/CI build outcome. The tree stays green by construction.
- **No secrets, no CI.** Native Git integration (dashboard-connected) is the trigger; the repo
  holds no `VERCEL_TOKEN` and no workflow file.

## The connection runbook (lives in progress.md, executed by a human)

The credential-gated live step, documented for handoff (not executed in-sandbox):

1. In the Vercel dashboard, **Import / connect** the GitHub repo
   `johnhkchen/webapp-demo-lisa-vend` to a Vercel project (or run `vercel git connect` in a
   locally-linked checkout). This installs the GitHub app webhook.
2. Confirm the project's **Production Branch** is `main` (matches the repo default).
3. Confirm the project **Build Command** resolves to `npm run build` (from `vercel.json`) and the
   framework preset is **Next.js**.
4. Push any commit to `main`; observe a new deployment appear in the dashboard, **tagged with the
   pushed commit SHA**, building via `npm run build`, with **no** hand-run `vercel --prod`.

## Ordering of changes

1. Write Research → Design → Structure → Plan artifacts (blueprint before code).
2. Edit `vercel.json` (the single product change).
3. Validate JSON + run the build as a green-tree safety check.
4. Commit the `vercel.json` change (+ the RDSPI artifacts, per repo convention).
5. Write progress.md (runbook + deferral) and review.md (handoff).

No inter-file dependency inside the change beyond "artifacts describe the edit, edit precedes
commit." A single atomic commit for the product change is appropriate (one small config edit).
