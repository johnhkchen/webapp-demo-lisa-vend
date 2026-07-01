# Progress — T-005-02-01: enforce-production-build-as-deploy-gate

Execution log against plan.md. What was done, deviations, and verification transcripts.

## Status: implementation complete

All plan steps executed. One deviation (see below), resolved. Repo left green and clean.

## Steps executed

### Step 1 — Baseline (gate-open) ✅
`npm run build` → **exit 0**. `/` and `/_not-found` prerendered static. Gate open on good code.

### Step 2 — Pin the gate in `next.config.ts` ✅ (with deviation)
Added the deploy-gate config to `next.config.ts`.

**Deviation from structure.md / plan.md — the `eslint` key.** The plan called for pinning *both*
`typescript.ignoreBuildErrors: false` **and** `eslint.ignoreDuringBuilds: false`. The first attempt
(both keys) **failed the build**:

```
⚠ `eslint` configuration in next.config.ts is no longer supported.
⚠ Unrecognized key(s) in object: 'eslint'
Type error: Object literal may only specify known properties, and 'eslint'
does not exist in type 'NextConfig'.
```

**Root cause:** Next.js 16 **removed the `eslint` config key** — `next build` no longer runs ESLint
at all; linting is fully decoupled into the sibling `npm run lint` gate (`eslint --max-warnings 0`).
So `eslint.ignoreDuringBuilds` is both invalid (fails type-check) and unnecessary (there is no
lint-in-build hatch to pin). The research already flagged that the live build log showed
`Running TypeScript …` but no ESLint step — this confirms it at the config level.

**Resolution:** Dropped the `eslint` block; pinned only the valid `typescript.ignoreBuildErrors:
false`, and expanded the comment to record that Next 16 makes the build gate = compile + types
(lint is separate). Re-ran `npm run build` → **exit 0**. The build gate this ticket enforces is
precisely the TypeScript/compile gate, which is the correct and only build-time hatch in Next 16.

**Commit:** `778fac7 chore(T-005-02-01): pin build-failure gate — no silent ignore of type errors`.

### Step 3 — Intentional build-fail run (gate trips) ✅
Created throwaway `app/__gate_probe__.ts`:
```ts
export const gateProbe: number = "definitely not a number";
```
`npm run build` → **exit 1**:
```
Failed to type check.
./app/__gate_probe__.ts:1:14
Type error: Type 'string' is not assignable to type 'number'.
```
The gate trips: a type error fails the production build. In the Vercel pipeline this non-zero
`buildCommand` exit ⇒ the deployment is marked **Error** and **not aliased** to the production
domain (Vercel default promotion semantics); the prior good deploy stays live. This is the AC's
"the gate held."

### Step 4 — Restore green ✅
Deleted `app/__gate_probe__.ts`. `npm run build` → **exit 0**. Tree returned to green; the probe
was never staged or committed.

### Step 5 — Boundary + final-state check ✅
`git status --porcelain -- next.config.ts vercel.json package.json app components lib` → **empty**
(the sole product change, `next.config.ts`, is already committed; probe removed). No `vercel.json`,
`package.json`, `app/` (real), `components/`, or `lib/` change. `app/__gate_probe__.ts` confirmed
gone. Boundary held: config + docs only.

### Step 6 — Review artifact
See `review.md`.

## Verification summary

| Check | Command | Result |
|-------|---------|--------|
| Gate open (baseline) | `npm run build` | exit 0 |
| Gate open (pinned config) | `npm run build` | exit 0 |
| Gate trips (injected type error) | `npm run build` w/ probe | exit 1, TS error on probe |
| Restore green | `npm run build` after `rm` probe | exit 0 |
| Boundary | `git status --porcelain` (product paths) | only committed `next.config.ts` |

## Deviations from plan (recorded)

1. **`eslint.ignoreDuringBuilds` dropped** — invalid in Next 16 (key removed; lint decoupled from
   build). Only `typescript.ignoreBuildErrors: false` pinned. Rationale above. Design intent
   (make the build gate explicit/drift-proof) is fully met by the surviving key, since types are
   the only build-time hatch in Next 16.

## Not done here (out of scope / deferred)

- Live `vercel --prod` deployment and the actual "not promoted" observation — needs Vercel account
  credentials; belongs to S-005-03 (Git-auto-deploy) as an external prerequisite (per E-005).
- No CI workflow, no `vercel.json` change, no lint-in-build coupling.
