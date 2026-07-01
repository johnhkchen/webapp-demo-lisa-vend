# Structure — T-006-03-01: retire-vercel-and-next-compiler-wiring

## File-level change set

| File | Action | Tracked? | Net committed effect |
|---|---|---|---|
| `vercel.json` | **delete** (`git rm`) | tracked | file removed from repo |
| `next.config.ts` | **delete** (`git rm`) | tracked | file removed from repo |
| `next-env.d.ts` | **regenerate** (delete stale → `vinext build` recreates) | git-ignored | **none** (stays ignored; on-disk copy refreshed to vinext-canonical) |
| `tsconfig.json` | **edit** (remove one `include` entry) | tracked | `-1` line |
| `dist/` | build output — **must not be committed** | untracked, not ignored | none (cleaned after build) |

No `lib/`, `components/`, `app/`, test, `vite.config.ts`, `vitest.config.ts`, `package.json`,
`eslint.config.mjs`, or `.gitignore` changes.

## Precise edits

### 1. `vercel.json` — remove
```
git rm vercel.json
```
Whole file gone. No replacement.

### 2. `next.config.ts` — remove
```
git rm next.config.ts
```
Whole file gone. vinext runs on its built-in defaults (no inline `nextConfig` needed in
`vite.config.ts`; the current `vinext()` call stays exactly as-is).

### 3. `tsconfig.json` — reconcile `include`
Before:
```jsonc
"include": [
  "next-env.d.ts",
  "**/*.ts",
  "**/*.tsx",
  ".next/types/**/*.ts",
  ".next/dev/types/**/*.ts",   // ← remove (legacy Next-compiler dev-types path)
  "**/*.mts"
]
```
After:
```jsonc
"include": [
  "next-env.d.ts",
  "**/*.ts",
  "**/*.tsx",
  ".next/types/**/*.ts",
  "**/*.mts"
]
```
Single-line deletion. Everything else in `tsconfig.json` (including `plugins:[{name:"next"}]` and
`paths`) is unchanged.

### 4. `next-env.d.ts` — regenerate to vinext-canonical
Not a git operation (file is ignored). Sequence:
```
rm -f next-env.d.ts          # drop the stale copy pointing at ./.next/dev/types/…
npm run build                # vinext typegen ensureNextEnvFile() recreates it (wx flag),
                             # now importing ./.next/types/routes.d.ts
rm -rf dist                  # clean build output so it is not staged
```
Expected regenerated content:
```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/types/routes.d.ts";
// NOTE: This file should not be edited
```
Since it's git-ignored, `git status` will show no entry for it — that's correct.

## Ordering (why this sequence)

Deletions are independent of each other, but the **verification** (a passing `npm run build`) is the
AC's proof, so the order maximizes signal per step:

1. Delete `vercel.json` — pure dead config; can't affect build. Commit.
2. Delete `next.config.ts` + reconcile `tsconfig.json` include — both are Next-compiler type
   plumbing; group so one build proves the type-path change and the config removal together.
   Regenerate `next-env.d.ts` in the same step (it's the third leg of the same type-plumbing
   reconciliation). Commit.
3. Final full-gate verification (build + lint + test) on the clean tree.

Grouping 2's three sub-changes avoids a transient state where tsconfig no longer includes
`.next/dev/types` but `next-env.d.ts` still imports it — they reconcile as a unit.

## Public interfaces / boundaries

None change. This ticket touches only build/deploy **configuration**; no module API, no route, no
component, no game-logic surface is affected. The `lib/` purity boundary (enforced by
`eslint.config.mjs`) is untouched.

## Verification points (detailed in Plan)

| # | Check | Command | Pass condition |
|---|---|---|---|
| V1 | Vercel config gone | `test ! -e vercel.json` | true |
| V2 | Next-compiler config gone | `test ! -e next.config.ts` | true |
| V3 | Fresh build succeeds (**the AC**) | `rm -rf dist .next && npm run build` | exit 0 |
| V4 | `next-env.d.ts` reconciled | `grep '.next/types/routes' next-env.d.ts` | matches (no `/dev/`) |
| V5 | Lint still green | `npm run lint` | exit 0 |
| V6 | Full test suite green | `npm test` | all pass |
| V7 | No product-code diff | `git status --porcelain -- lib components app` | empty |
| V8 | No stray files staged | `git status` before commit | only intended paths; `dist/` not staged |

## Rollback

`git revert` the two commits restores `vercel.json`, `next.config.ts`, and the tsconfig line;
`next-env.d.ts` regenerates from whichever runtime is active. Fully reversible, no data loss.
