# Design — T-005-02-01: enforce-production-build-as-deploy-gate

Options for making `npm run build` a genuine, un-bypassable deploy gate, evaluated against the
research. One chosen with rationale; rejects recorded.

## The problem, precisely

The deploy gate has two layers (see research): (1) `next build` must exit non-zero on a real
error, and (2) Vercel must withhold promotion on a non-zero build. Layer (2) is Vercel default
behavior and needs no code. Layer (1) works **today by default**, but its integrity is *implicit*:
the two `next.config.ts` escape hatches (`typescript.ignoreBuildErrors`,
`eslint.ignoreDuringBuilds`) could silently gut it. So the design question is narrow:

> How do we make layer (1) explicit and drift-proof, and verify the gate actually trips — without
> touching game/component code and without a live Vercel deploy?

## Options considered

### Option A — Do nothing to config; verify-only

Rely on Next.js defaults (type errors already fail the build). Deliverable is purely a verified
demonstration (baseline green + injected-error red) documented in Review.

- **Pro:** Zero config surface; smallest possible change; the gate already works today.
- **Con:** Leaves the gate *implicit*. A future one-line edit to `next.config.ts` could flip an
  ignore-flag and ship a broken page with a green build — exactly the failure mode this ticket
  exists to prevent. Nothing in-repo would catch it. Fails the epic's "explicit, versioned,
  drift-proof settings in-repo" thesis. The ticket becomes a doc with no durable artifact.

### Option B — Pin the ignore-flags to `false` in `next.config.ts` (chosen)

Explicitly set `typescript.ignoreBuildErrors: false` and `eslint.ignoreDuringBuilds: false` in
`next.config.ts`, with a comment tying them to the deploy gate. Behaviorally a no-op (mirrors
defaults); intentionally makes the gate a **stated invariant** that a future edit must consciously
override rather than silently inherit.

- **Pro:** Makes layer (1) explicit and review-visible; any attempt to weaken the gate now shows
  as a diff flipping `false → true` on a commented gate — reviewable, not silent. Directly mirrors
  the T-005-01-01 precedent (codify the default, in-repo, versioned). In-bounds: `next.config.ts`
  is build/deploy settings, not game/component code. Fully verifiable locally.
- **Con:** Slightly redundant with defaults (by design, same as T-005-01-01's `vercel.json`
  restating auto-detection). Adds a few lines to an otherwise-empty config.

### Option C — Add a CI workflow (`.github/workflows/*.yml`) running the build

Introduce GitHub Actions to run `npm ci && npm run build` on push/PR as a second enforcement point.

- **Pro:** Blocks bad code at PR time, before Vercel.
- **Con:** **Out of scope and redundant.** The AC is specifically about the *Vercel* deployment not
  being promoted on a failed build — that gate is `vercel.json`'s `buildCommand` (already in
  place). Git-integration/CI wiring belongs to S-005-03 (Git-auto-deploy) and needs decisions
  about the CI provider; adding a workflow here pre-empts that story and expands the file surface
  beyond the build-gate slice. Rejected as scope creep.

### Option D — Add `installCommand`/`outputDirectory`/build env to `vercel.json`

Harden the Vercel side by pinning more build settings.

- **Con:** None of these affect *whether a failing build is promoted* — that is already governed by
  the existing `buildCommand` + Vercel default promotion semantics. Extra fields are incidental
  settings the epic's config-only boundary discourages (T-005-01-01 explicitly kept `vercel.json`
  minimal). No AC clause needs them. Rejected as unnecessary surface.

## Decision

**Option B** — pin the two ignore-flags to `false` in `next.config.ts` with an explanatory comment,
then verify the gate end-to-end locally (baseline green → injected type error red → revert green).

### Rationale

- **Targets the real risk.** The only way today's working gate breaks is the silent escape hatches;
  Option B is the minimal change that closes exactly that hole and nothing more.
- **Matches established precedent.** T-005-01-01 codified Vercel's auto-detected defaults in-repo
  for explicitness/drift-proofing. Option B does the identical thing for Next.js's build-failure
  defaults. Consistency of approach across the E-005 tracks.
- **Respects the hard boundary.** `next.config.ts` is build/deploy configuration — squarely
  in-bounds for E-005; no game logic, components, or app-tick code touched.
- **Verifiable now.** The trigger half of the gate (build fails on error) is demonstrable in this
  environment; the promotion half is Vercel default behavior, documented as a deferred-to-platform
  observation exactly as T-005-01-01 deferred the live `vercel build` resolve.

## What the demonstration must show (verification contract)

1. **Baseline:** `npm run build` exits 0 (gate open on good code).
2. **Injected failure:** a temporary type error in an in-bounds, non-game file makes `npm run
   build` exit non-zero (gate trips). To honor the boundary, the deliberate error is introduced in
   a **throwaay temp file that is deleted**, not in any tracked game/component/lib file.
3. **Restore:** removing the injected error returns `npm run build` to exit 0 (gate reopens; repo
   left green).
4. **Platform mapping:** document that a non-zero `buildCommand` ⇒ Vercel marks the deployment
   `Error` and does not alias it to production; the prior good deploy stays live. This is the AC's
   "gate held," realized by Vercel default semantics on top of the now-explicit build failure.

## Out of scope (recorded)

- Live `vercel --prod` / Git integration and the actual "not promoted" observation — S-005-03 +
  human-held Vercel credentials (external prerequisite per E-005).
- CI workflows, lint-in-build coupling, extra `vercel.json` fields.
