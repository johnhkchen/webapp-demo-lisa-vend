# Research — T-005-02-01: enforce-production-build-as-deploy-gate

Descriptive map of the repo as it bears on making `npm run build` a hard deploy gate. What
exists, where, how it connects, the constraints. No solutions proposed here.

## The ticket in one line

Wire the production build as a **hard deploy gate**: a failing `npm run build` must yield a
failed Vercel deployment that is **not promoted** to the public URL (the prior good deploy stays
live), rather than shipping a broken page. AC: a deliberately-failing build run demonstrates the
gate held — the deployment errors and is not aliased to production.

## Where this sits in the epic

E-005 (`wire-vercel-early-deploy`) front-loads the P3 "Shippability" invariant. The epic splits
into three tracks — **project-config** (S-005-01, done), **build-gate** (this story, S-005-02),
and **Git-auto-deploy** (S-005-03). This ticket is the *build-gate* slice: it does not create the
Vercel config (T-005-01-01 did) and does not wire live Git integration (S-005-03); it ensures the
build command already declared in `vercel.json` is a genuine, un-bypassable gate.

Direct dependency `T-005-01-01` is `phase: done`: `vercel.json` exists at repo root declaring
`framework: "nextjs"` and `buildCommand: "npm run build"`. This ticket builds directly on that.

### HARD BOUNDARY (from E-005)

Config/CI-wiring only. Touches Vercel project config and build/deploy settings; edits **NO** game
logic (`lib/`), **NO** components (`components/`), and **NO** app-tick/game-loop code. The
in-bounds surface is `vercel.json`, `next.config.ts` (build settings), and this ticket's docs.

## Repo state (the ground truth)

- `vercel.json` (from T-005-01-01):
  ```json
  { "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "nextjs", "buildCommand": "npm run build" }
  ```
- `package.json` scripts: `build` → `next build`, `lint` → `eslint --max-warnings 0`,
  `test` → `vitest run`. Next.js `16.2.9`, React `19.2.4`.
- `next.config.ts` — present, **minimal**: a bare `NextConfig` object with no options set. This is
  the file that governs whether the build *fails* on type/lint errors.
- No `.github/` directory — there is **no CI workflow** in-repo. The only build enforcement point
  is the Vercel build itself (driven by `vercel.json`'s `buildCommand`).
- `.gitignore` ignores `.vercel/` (local link/credentials) and `.next/` (build output).

## How the gate actually works (mechanics)

Two layers matter, and they are distinct:

1. **Does `next build` exit non-zero on a real error?** The deploy gate is only as strong as the
   build's own failure behavior. Observed from a live `npm run build` this session: Next.js
   **runs the TypeScript type-checker as part of `next build`** (log line `Running TypeScript …`)
   and compiles the app; a type error or compile error therefore fails the build. Confirmed the
   baseline build is green (exit 0; `/` and `/_not-found` prerendered static).

2. **Does Vercel withhold promotion when the build exits non-zero?** This is Vercel's default
   platform behavior: a deployment whose `buildCommand` exits non-zero is marked **Error** and is
   **not aliased** to the production domain; the previous successful production deployment remains
   live. There is no in-repo code that changes this — it is a property of the platform plus a
   non-zero build exit. The ticket's job is to guarantee layer (1) so layer (2) engages.

## The silent-bypass risk (the crux of this ticket)

Next.js exposes two config escape hatches in `next.config.ts` that **silently disable** the gate:

- `typescript.ignoreBuildErrors: true` — build succeeds despite type errors.
- `eslint.ignoreDuringBuilds: true` — build skips ESLint entirely.

Today `next.config.ts` sets **neither**, so defaults apply (type errors fail the build). But the
gate's integrity is *implicit* — a future edit could flip either flag and gut the gate with a
green build, and nothing in-repo would flag it. The AC ("the gate held") is really a statement
about these defaults staying enforced. This is the same "explicit, versioned, drift-proof
settings in-repo" thesis T-005-01-01 applied to `vercel.json`.

## Note on lint in the build

The live build log shows `Running TypeScript …` but no separate `Running ESLint …` step under
Turbopack. Lint is enforced independently via `npm run lint` (`--max-warnings 0`), not necessarily
as part of `next build`. So the *build* gate is primarily the compile + type-check; lint is a
sibling gate. This distinction matters for what an "intentional failure" demonstration should
trip: a **type/compile error** is the reliable way to fail `next build`.

## Precedent in this repo

The closest precedent is the sibling ticket T-005-01-01 (`docs/active/work/T-005-01-01/`): a
config-only, additive change verified by structural checks + a passing named build, with the live
Vercel-CLI resolve deferred to CI/human as an explicit verification gap. This ticket mirrors that
discipline: the local proxy (`npm run build` passing green, and failing red on an injected error)
is fully runnable here; the live "deployment not promoted" observation requires the Vercel
platform and human-held account credentials.

## Constraints & assumptions

- **Config-only.** In-bounds files: `next.config.ts` (build settings) and this ticket's docs.
  No `app/`, `components/`, `lib/`, `package.json`, or dependency changes.
- **Verification limit.** The literal AC — a Vercel deployment that errors and is not promoted —
  cannot be observed in this sandbox (no Vercel CLI, no registry access, no account). The runnable
  proxy is: baseline `npm run build` green; an injected type error makes `npm run build` exit
  non-zero; revert restores green. This proves the gate's *trigger* (build fails on error) locally;
  the platform's *promotion-withholding* is Vercel default behavior, documented not executed.
- **No frontmatter edits.** Lisa owns `phase`/`status`; artifacts drive transitions.
- **Idempotent with defaults.** Any pinning of the ignore-flags to `false` mirrors current default
  behavior — it makes the gate explicit and drift-proof, not behavior-changing.
