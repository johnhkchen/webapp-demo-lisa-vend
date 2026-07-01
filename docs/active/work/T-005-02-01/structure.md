# Structure — T-005-02-01: enforce-production-build-as-deploy-gate

The blueprint: exact file-level changes, the shape of the config, and the ordering. Not code —
the structure of it.

## Files touched

| File | Change | Why |
|------|--------|-----|
| `next.config.ts` | **modify** | Add explicit `typescript.ignoreBuildErrors: false` and `eslint.ignoreDuringBuilds: false` to pin the build-failure gate as a stated, drift-proof invariant. |
| `docs/active/work/T-005-02-01/*.md` | **new** | RDSPI artifacts (research, design, structure, plan, progress, review). |

No other files. Explicitly **not** touched: `vercel.json` (already correct from T-005-01-01),
`package.json`, `app/`, `components/`, `lib/`, `.gitignore`, `.github/` (none created).

## Shape of the change to `next.config.ts`

Current file:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

Target shape (fields populated, comment ties them to the deploy gate):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy gate (T-005-02-01, E-005 / P3): `npm run build` is the Vercel build command
  // (see vercel.json). Pin the two escape hatches OFF so a type/compile error always fails
  // the production build — and therefore blocks promotion — instead of silently shipping a
  // broken page. These mirror Next.js defaults; stating them makes weakening the gate a
  // visible, reviewable diff rather than a silent inheritance.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
```

### Interface / behavior notes

- **Type-correct.** `NextConfig` includes optional `typescript?: { ignoreBuildErrors?: boolean }`
  and `eslint?: { ignoreDuringBuilds?: boolean }`. Setting them to `false` is well-typed and will
  itself pass the type-check step of `next build` (the gate validating its own config).
- **Behaviorally inert.** `false` is the default for both, so no build *outcome* changes on the
  current green tree; the change is a codified invariant, not a functional shift.
- **Self-contained.** No imports added, no dependencies, no other config keys. The `output`,
  `images`, `experimental`, etc. surfaces are deliberately left untouched.

## The verification harness (temporary, not committed)

To demonstrate the gate trips, a **throwaway** TypeScript file is created, built, then deleted —
so no tracked game/component/lib file is ever broken:

- `app/__gate_probe__.ts` *(temp, deleted before commit)* — contains a deliberate type error
  (e.g. `const n: number = "not a number";`). Placed under `app/` only so it is inside the
  TypeScript `include` glob and thus type-checked by `next build`. Created → build (expect
  non-zero) → deleted → build (expect zero). Never staged or committed.

  Rationale for a temp file over editing an existing one: keeps the intentional error fully
  isolated and guarantees the tracked tree is never left in a broken or dirtied state, honoring
  the "no game/component files touched" boundary literally.

## Ordering of changes

1. Write research / design / structure / plan artifacts (this phase set).
2. Modify `next.config.ts` (the one product change). Commit.
3. Run the verification harness (baseline green → temp error red → delete → green). This is
   verification, not a committed change.
4. Write progress.md and review.md.

## What stays out (boundaries restated)

- No `vercel.json` edit — the `buildCommand` gate is already declared and correct.
- No CI workflow / `.github/` — belongs to S-005-03 (Git-auto-deploy), not this slice.
- No lint-in-build coupling change — lint remains the sibling `npm run lint` gate.
- No frontmatter edits — Lisa owns phase/status.

## Acceptance-criteria traceability

| AC clause | Where satisfied |
|-----------|-----------------|
| Vercel build runs `npm run build` | `vercel.json` `buildCommand` (dependency T-005-01-01), unchanged and relied upon. |
| A deliberately-failing build yields a failed deployment | `next.config.ts` pins the gate so `next build` exits non-zero on error; verified locally via the temp-probe harness. |
| Failed deployment NOT promoted; prior good deploy stays live | Vercel default promotion semantics on a non-zero `buildCommand`; documented as platform behavior (deferred live observation, per T-005-01-01 precedent). |
| Verified by an intentional build-fail run showing the gate held | The temp-probe red/green demonstration, captured in progress.md / review.md. |
