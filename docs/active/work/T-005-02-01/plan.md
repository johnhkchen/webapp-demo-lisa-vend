# Plan — T-005-02-01: enforce-production-build-as-deploy-gate

Ordered, independently-verifiable steps. Testing strategy and verification criteria included.

## Testing strategy

The deliverable is build/deploy configuration, not executable product code — so, as with
T-005-01-01, **no unit tests are added** (none are appropriate). Verification is behavioral:

- **Gate-open check:** `npm run build` exits 0 on the clean tree.
- **Gate-trip check:** an injected type error makes `npm run build` exit non-zero.
- **Restore check:** removing the error returns `npm run build` to exit 0 (tree left green).
- **Config type-check:** the edited `next.config.ts` itself passes `next build`'s type step.
- **Boundary check:** `git status --porcelain` shows only `next.config.ts` + this ticket's docs as
  changes; no `app/`/`components/`/`lib/`/`vercel.json`/`package.json` product change.

The literal "Vercel deployment not promoted" observation is deferred to the platform/human (no
Vercel CLI, registry, or account in-sandbox), and the mapping from a non-zero build to
withheld promotion is documented as Vercel default behavior — mirroring how T-005-01-01 deferred
the live `vercel build` resolve.

## Steps

### Step 1 — Establish the baseline (verify gate-open)
- Run `npm run build`; confirm exit 0. *(Already run this session: green, `/` + `/_not-found`
  prerendered static.)*
- **Verify:** exit 0.

### Step 2 — Pin the gate in `next.config.ts`
- Edit `next.config.ts` per structure.md: add `typescript.ignoreBuildErrors: false` and
  `eslint.ignoreDuringBuilds: false` with the deploy-gate comment.
- **Verify:** `npm run build` still exits 0 (change is behaviorally inert on good code, and the new
  config keys themselves type-check).
- **Commit:** `chore(T-005-02-01): pin build-failure gate — no silent ignore of type/lint errors`.

### Step 3 — Demonstrate the gate trips (intentional build-fail run)
- Create throwaway `app/__gate_probe__.ts` with a deliberate type error
  (`const n: number = "nope";`).
- Run `npm run build`; **expect non-zero exit** with a TypeScript error naming the probe.
- **Verify:** exit ≠ 0; error message references the probe file / type mismatch.

### Step 4 — Restore green (leave tree clean)
- Delete `app/__gate_probe__.ts`.
- Run `npm run build`; confirm exit 0 again.
- **Verify:** exit 0; `git status` clean of the probe (never staged/committed).

### Step 5 — Boundary + final state check
- `git status --porcelain` → only `next.config.ts` (modified) and `docs/active/work/T-005-02-01/*`.
- Confirm no `vercel.json`, `package.json`, `app/` (real), `components/`, or `lib/` changes.
- **Verify:** boundary holds.

### Step 6 — Write progress.md and review.md
- Record the red/green transcript, the platform-mapping note, coverage gaps (deferred live
  promotion observation), and open concerns.

## Rollback

Trivial and total: `git revert` the single `next.config.ts` commit restores the prior (empty-config)
state. The change is additive, behaviorally inert on good code, and coupled to no other file.

## Risks & mitigations

- **Risk:** the injected-error demonstration accidentally dirties a tracked file. **Mitigation:**
  use a throwaway probe file created and deleted within Step 3–4; never edit a tracked source file.
- **Risk:** Next 16 / Turbopack ignores one of the pinned keys, making the pin cosmetic.
  **Mitigation:** the keys are the documented `NextConfig` fields; even if a key were inert, the
  *actual* gate (type-check failing the build) is proven directly by Step 3's red run, so the
  demonstration does not depend on the pin's mechanism — the pin is drift-insurance, the red run
  is the proof.
- **Risk:** over-reach into S-005-03 scope. **Mitigation:** no CI workflow, no Git wiring, no extra
  `vercel.json` fields — enforced by the Step 5 boundary check.

## Definition of done

- `next.config.ts` pins both ignore-flags to `false` with a gate comment; committed.
- Local demonstration recorded: build green → red on injected type error → green after restore.
- Platform promotion-withholding documented as the AC's "gate held," with the live observation
  flagged as deferred to Vercel/human.
- Boundary verified: only config + docs changed.
- progress.md and review.md written.
