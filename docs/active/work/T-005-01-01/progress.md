# Progress — T-005-01-01: add-vercel-project-config

Execution log against `plan.md`.

## Steps

- [x] **Step 0 — Baseline.** `npm run build` exit 0 (`/` + `/_not-found` prerendered static).
  Confirmed no pre-existing `vercel.json`. Green start.
- [x] **Step 1 — Write `vercel.json`.** Created at repo root with `$schema`, `framework: "nextjs"`,
  `buildCommand: "npm run build"`. Two-space indent, trailing newline.
- [x] **Step 2 — Validate.** `node -e "JSON.parse(...)"` succeeded and asserted
  `framework === "nextjs"`, `buildCommand === "npm run build"`, `$schema` present → printed `ok`.
  JSON well-formed (structural schema validity).
- [x] **Step 3 — Build gate.** `npm run build` exit 0, `/` + `/_not-found` still static. Adding the
  config changed nothing in the app build, as expected (`next build` does not read `vercel.json`).
- [x] **Step 4 — Boundary check.** `git status --porcelain` over `vercel.json app components lib
  next.config.ts package.json` shows **only** `?? vercel.json`. No game/component/app/config files
  touched.
- [x] **Step 5 — Commit (atomic).** Staged only `vercel.json` + `docs/active/work/T-005-01-01/*.md`.
- [x] **Step 6 — Artifacts.** `progress.md` (this file) + `review.md` written.

## Deviations from plan

- **`npx vercel build` not executed (environmental, not a design change).** The Vercel CLI is not
  in `node_modules` and the sandbox has no registry access to fetch it (`npx vercel` fails:
  "missing packages and no YES option"). Per the plan's testing strategy, the live CLI resolve is
  deferred to CI/human; verified in its place: JSON well-formedness, field correctness vs. the
  documented Vercel schema, and the named build gate (`npm run build`) passing. Flagged in
  `review.md`. No change to the deliverable — the config is authored to Vercel's documented
  Next.js-preset spec and passes by construction.

## Final state

- `vercel.json` — new; declares Next.js preset + `npm run build` build command + `$schema`.
- No change to `app/`, `components/`, `lib/`, config, dependencies, or ticket frontmatter.
- Tree green: `npm run build` exit 0.
