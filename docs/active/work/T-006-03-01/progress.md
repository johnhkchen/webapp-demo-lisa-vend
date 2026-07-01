# Progress — T-006-03-01: retire-vercel-and-next-compiler-wiring

## Status: Implement complete — all gates green. No deviations from Plan.

## Step log

### Step 1 — remove `vercel.json` ✅
- `git rm vercel.json`.
- V1: `test ! -e vercel.json` → OK. `npm run build` → exit 0. `dist/` cleaned.
- Commit: `chore(T-006-03-01): remove dead vercel.json (deploy is vinext→Cloudflare)`.

### Step 2 — remove `next.config.ts` + reconcile tsconfig + regenerate `next-env.d.ts` ✅
- `git rm next.config.ts`.
- Edited `tsconfig.json`: removed `".next/dev/types/**/*.ts"` from `include` (one line).
- `rm -f next-env.d.ts` (stale legacy-path copy).
- **Fresh build** (`rm -rf dist .next && npm run build`) → **exit 0** (the AC).
  - V2: `next.config.ts` gone → OK.
  - tsconfig: `grep '.next/dev/types'` → no match → OK.
  - V4: regenerated `next-env.d.ts` now `import "./.next/types/routes.d.ts"` (no `/dev/`) → OK.
  - `git status next-env.d.ts` → empty (still git-ignored, as intended) → OK.
- `dist/` cleaned.
- Commit: `chore(T-006-03-01): drop next.config.ts + legacy .next/dev types include`.

### Step 3 — full-gate verification ✅
| Gate | Command | Result |
|---|---|---|
| Build (V3) | `npm run build` | ✅ exit 0 |
| Lint (V5) | `npm run lint` | ✅ exit 0, 0 problems |
| Test (V6) | `npm test` | ✅ **163 passed / 163**, 18/18 files, 1.68s |
| Product diff (V7) | `git status --porcelain -- lib components app` | ✅ empty |
| Stray files (V8) | `git status` | ✅ only artifacts + tracked deletions; `dist/` cleaned, `next-env.d.ts` ignored |

## Deviations
None. Executed exactly as planned.

## Commits on this ticket
1. `chore(T-006-03-01): remove dead vercel.json (deploy is vinext→Cloudflare)`
2. `chore(T-006-03-01): drop next.config.ts + legacy .next/dev types include`

## Carry-forward (documented in review.md, not action items for this ticket)
- vinext build does not type-check → type-checking is no longer a build gate (pre-existing since
  T-006-01-02; a follow-up decision, out of scope).
- `.gitignore` does not list `dist/` (vinext build output) — pre-existing migration gap, unrelated
  to Vercel/Next-compiler config.
- Narrative docs (`CLAUDE.md` L6, `SEED.md`, `vision.md`) still mention Vercel → T-006-03-02 / docs
  pass.
