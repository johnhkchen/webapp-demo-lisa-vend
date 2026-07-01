# Review — T-005-02-01: enforce-production-build-as-deploy-gate

Handoff document. What changed, how it was verified, coverage, and what needs human/CI attention.
Enough to review without reading every diff.

## What changed

One product file modified; no files created or deleted (product-side).

| File | Change | Notes |
|------|--------|-------|
| `next.config.ts` | **modified** | Pins `typescript.ignoreBuildErrors: false` with a deploy-gate comment, so a type/compile error always fails `npm run build` (the Vercel `buildCommand`) instead of silently shipping a broken page. |
| `docs/active/work/T-005-02-01/*.md` | **new** | RDSPI artifacts (research, design, structure, plan, progress, review). |

Final `next.config.ts` (product portion):
```ts
const nextConfig: NextConfig = {
  // Deploy gate (T-005-02-01, E-005 / P3): ...pin the type-check escape hatch OFF...
  // (Next.js 16 removed the `eslint` config key: `next build` no longer runs ESLint —
  // lint is enforced separately via `npm run lint`. So the build gate is compile + types.)
  typescript: {
    ignoreBuildErrors: false,
  },
};
```

Nothing under `app/` (real), `components/`, `lib/`, `vercel.json`, `package.json`,
`package-lock.json`, or `.gitignore` was touched. No dependencies added. No CI workflow created.
No ticket/story/epic frontmatter edited (Lisa owns phase/status).

**Commit:** `778fac7 chore(T-005-02-01): pin build-failure gate — no silent ignore of type errors`.

## The design in one paragraph

The deploy gate has two layers: (1) `next build` must exit non-zero on a real error, and (2) Vercel
must withhold promotion on a non-zero build. Layer (2) is Vercel's default platform behavior and
needs no code. Layer (1) already worked by default but was *implicit* — a future edit could flip an
`ignore*` escape hatch and ship a broken page with a green build. This ticket makes layer (1)
**explicit and drift-proof** by pinning the one build-time hatch that exists in Next 16
(`typescript.ignoreBuildErrors`) to `false`, so weakening the gate is now a visible, reviewable
diff. Same "codify the default, in-repo, versioned" approach T-005-01-01 applied to `vercel.json`.

## Acceptance criteria — status

- [x] **Vercel build runs `npm run build`** — `vercel.json` `buildCommand: "npm run build"` (from
  dependency T-005-01-01), unchanged and relied upon.
- [x] **A deliberately-failing build yields a failed deployment** — proven locally: injecting a
  type error made `npm run build` exit **1** (`Failed to type check … Type 'string' is not
  assignable to type 'number'`). A non-zero `buildCommand` exit is what fails a Vercel deployment.
- [~] **…that is NOT promoted to the public URL (prior good deploy stays live)** — this is Vercel
  **default promotion behavior**: an errored deployment is not aliased to the production domain and
  the last successful deployment remains live. **Not observed on the live platform** here (no
  Vercel CLI/account in-sandbox) — deferred to CI/human, exactly as T-005-01-01 deferred the live
  `vercel build` resolve. The local proof establishes the *trigger*; the platform provides the
  *withholding*.
- [x] **Verified by an intentional build-fail run showing the gate held** — the green→red→green
  demonstration below.

## Verification performed

| # | Check | Command | Result |
|---|-------|---------|--------|
| 1 | Gate open (baseline) | `npm run build` | exit 0 |
| 2 | Gate open (pinned config) | `npm run build` | exit 0 |
| 3 | **Gate trips** | `npm run build` w/ throwaway `app/__gate_probe__.ts` type error | **exit 1**, TS error names the probe |
| 4 | Restore green | `rm` probe → `npm run build` | exit 0 |
| 5 | Boundary | `git status --porcelain` (product paths) | only committed `next.config.ts`; probe never staged |

The throwaway probe file was created and deleted within the demonstration; no tracked
game/component/lib file was ever broken or dirtied.

## Test coverage

No automated tests added, and none are appropriate — the deliverable is build/deploy configuration,
not executable product code (same rationale as T-005-01-01). The meaningful "test" is behavioral
and was run: the build passes on good code and fails on a type error. `lib/` purity/lint boundaries
are unaffected (no `lib/` change).

## Key finding for reviewers (deviation from plan)

The plan intended to pin **both** `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`.
**Next.js 16 removed the `eslint` config key** — including it *failed the build* (`Unrecognized
key(s): 'eslint'`). In Next 16, `next build` no longer runs ESLint; linting is fully decoupled into
the separate `npm run lint` gate (`eslint --max-warnings 0`). So the build gate is **compile +
TypeScript only**, and pinning `eslint` was both invalid and unnecessary. Resolved by keeping only
the `typescript` key. This is the correct model of the gate in Next 16, not a reduction in
coverage.

## Open concerns & follow-ups

1. **Live "not promoted" observation deferred (primary gap).** The literal AC end-state — a Vercel
   deployment that errors and is not aliased to production while the prior deploy stays live —
   requires the Vercel platform + human-held credentials and was not executed here. Expected to hold
   (Vercel default behavior on a non-zero `buildCommand`, which is now guaranteed to fire on a type
   error). Confirm once during the S-005-03 Git-auto-deploy wiring.
2. **Lint is not a build gate (by design in Next 16).** A lint-only violation (no type error) will
   **not** fail `npm run build` and thus will **not** block a Vercel deploy. If lint should also
   gate deploys, that needs the sibling `npm run lint` wired into CI/deploy — that is S-005-03
   (Git-auto-deploy) scope, not this ticket. Flagged so it is a conscious decision, not a surprise.
3. **Downstream, out of scope.** No `vercel --prod`, no Git integration, no CI workflow — those are
   S-005-03 + external Vercel credentials. No action on this ticket.

## Risk assessment

Minimal. One additive, behaviorally-inert config line on the current green tree (it mirrors the
Next.js default), fully reversible via `git revert 778fac7`. Cannot affect the game/render tracks —
no shared files. The gate's *trigger* is proven locally (red run); the only residual is the
deferred live promotion-withholding observation (concern #1), which rests on documented Vercel
default behavior.
