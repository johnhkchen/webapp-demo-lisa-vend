# Review — T-005-01-01: add-vercel-project-config

Handoff document. What changed, how it was verified, coverage gaps, and what needs human/CI
attention. Enough to review without reading every diff.

## What changed

One product file created; no files modified or deleted.

| File | Change | Notes |
|------|--------|-------|
| `vercel.json` | **new** | Repo-root Vercel project config: `$schema`, `framework: "nextjs"`, `buildCommand: "npm run build"`. |
| `docs/active/work/T-005-01-01/*.md` | **new** | RDSPI artifacts (research, design, structure, plan, progress, review). |

Final `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build"
}
```

Nothing under `app/`, `components/`, `lib/`, `next.config.ts`, `package.json`,
`package-lock.json`, or `.gitignore` was touched. No dependencies added. No ticket/story/epic
frontmatter edited (Lisa owns phase/status transitions).

## Acceptance criteria — status

- [x] **`vercel.json` exists at repo root** — created.
- [x] **Declares the Next.js framework preset** — `framework: "nextjs"`.
- [x] **`npm run build` as build command** — `buildCommand: "npm run build"`.
- [x] **Config schema validates** — file is well-formed JSON (`JSON.parse` exit 0); fields match
  the documented Vercel `vercel.json` schema (`framework` a valid preset slug, `buildCommand` a
  string, `$schema` the official URL). *Structural validation done; live CLI schema-validate
  deferred — see gap below.*
- [~] **`npx vercel build` resolves the build locally** — **NOT run in this environment.** The
  Vercel CLI is absent from `node_modules` and the sandbox cannot fetch it (no registry access).
  Deferred to CI/human. The substantive proxy — `npm run build`, the exact command the config
  names — passes (exit 0, `/` + `/_not-found` prerendered static).
- [x] **No game/component files touched** — `git status` shows only `vercel.json` as the product
  change (plus this ticket's docs).

## Verification performed

1. **JSON well-formedness** — `node -e "JSON.parse(readFileSync('vercel.json'))"` → exit 0.
2. **Field assertions** — `framework === "nextjs"`, `buildCommand === "npm run build"`, `$schema`
   present → `ok`.
3. **Build gate** — `npm run build` → exit 0 (twice this session: baseline and post-add;
   identical output, confirming the config is inert to `next build`).
4. **Boundary** — `git status --porcelain vercel.json app components lib next.config.ts
   package.json` → only `?? vercel.json`.

## Test coverage

No automated tests added, and none are appropriate: the deliverable is declarative deploy config,
not executable code. `lib/` purity/lint boundaries are unaffected (no `lib/` change). The relevant
"test" is the deploy platform's own build resolve, exercised at deploy time / in CI.

## Open concerns & follow-ups

1. **Live `npx vercel build` unverified (primary gap).** Run once in an environment with the
   Vercel CLL available (`npx vercel build`, or in the Vercel build pipeline) to confirm the CLI
   accepts the config and resolves the Next.js build. Expected to pass — values mirror Vercel's
   documented Next.js auto-detection defaults. **Low risk, but this is the one AC clause not
   executed here.**
2. **Redundancy with auto-detection (by design).** `framework`/`buildCommand` restate what Vercel
   would infer from `package.json`. This is intentional and AC-mandated: the point is explicit,
   versioned, drift-proof settings in-repo (E-005's thesis), not a behavior change.
3. **Downstream, out of scope (tracked by E-005 siblings).** This ticket does *not* wire live
   deploy: no `vercel --prod`, no Git integration, no build-gate-as-deploy-blocker enforcement.
   Those require human-held Vercel account credentials and belong to the build-gate and
   Git-auto-deploy stories of E-005. No action needed on this ticket.

## Risk assessment

Minimal. One additive, git-tracked config file with no code coupling (`next build` does not read
it); fully reversible via `git rm vercel.json`. Cannot affect the game/render tracks — no shared
files. The only residual is the deferred live-CLI check (concern #1), mitigated by structural
validation plus the passing named build gate.
