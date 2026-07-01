# Plan — T-006-03-01: retire-vercel-and-next-compiler-wiring

Ordered, independently-verifiable steps. Two commits. The load-bearing verification is
**V3: a fresh `npm run build` succeeds** — run it after the deletions.

## Testing strategy

This is config retirement, not code. There are **no new unit/integration tests** — the correct
test is the AC's own behavioral check plus the existing gates:
- **Build** (`npm run build`) — the AC's explicit proof that nothing removed was load-bearing.
- **Lint** (`npm run lint`, `--max-warnings 0`) — proves no config the linter depends on was
  removed (e.g. `eslint.config.mjs` still ignores `next-env.d.ts`).
- **Test** (`npm test`, vitest) — proves game/component behavior is untouched (it can't change; no
  source was touched, but we run it to honor the no-behavior-change invariant).
- **Diff audit** (`git status`) — proves `lib/`/`components/`/`app/` are byte-for-byte unchanged and
  no stray `dist/` is staged.

## Step 1 — Remove `vercel.json`

- **Do:** `git rm vercel.json`
- **Verify:** `test ! -e vercel.json` (V1). `npm run build` → exit 0 (dead config; must not affect
  build). `rm -rf dist`.
- **Commit:** `chore(T-006-03-01): remove dead vercel.json (deploy is vinext→Cloudflare)`

## Step 2 — Remove `next.config.ts` + reconcile tsconfig + regenerate `next-env.d.ts`

These three are the same type-plumbing reconciliation; do them together, verify with one build.

- **Do:**
  1. `git rm next.config.ts`
  2. Edit `tsconfig.json`: delete the `".next/dev/types/**/*.ts"` line from `include`.
  3. `rm -f next-env.d.ts` (drop stale legacy-path copy).
- **Verify (the AC):** `rm -rf dist .next && npm run build` → **exit 0** (V3). This is a *fresh*
  build (caches cleared) so nothing removed can hide behind stale artifacts.
  - `test ! -e next.config.ts` (V2).
  - `grep -q '".next/dev/types' tsconfig.json` → **no match** (reconciled).
  - `grep '\.next/types/routes' next-env.d.ts` → matches; **no** `/dev/` (V4) — confirms vinext
    regenerated it to the canonical path.
  - `git status --porcelain next-env.d.ts` → **empty** (still git-ignored, as intended).
- **Clean:** `rm -rf dist`.
- **Commit:** `chore(T-006-03-01): drop next.config.ts + legacy .next/dev types include (vinext owns type gen)`

## Step 3 — Full-gate verification on the clean tree

- **Do:** `npm run build && npm run lint && npm test` (build first so `dist/` exists when lint runs,
  matching the real pipeline order established in T-006-02-02).
- **Verify:**
  - Build exit 0 (V3 again, end-to-end).
  - Lint exit 0, 0 problems (V5).
  - Vitest full suite passes (V6) — expected 163/163 across 18 files (baseline from T-006-02-02).
  - `git status --porcelain -- lib components app` → empty (V7).
  - `git status` → only `docs/active/work/T-006-03-01/**` and the ticket-tracked deletions/edit;
    `dist/` and `next-env.d.ts` **not** listed as staged (V8). `rm -rf dist` if present.
- **No commit** (verification only) beyond the artifact commits.

## Step 4 — Record progress + write Review

- Update `progress.md` with actual results per step and any deviation.
- Write `review.md` (handoff): files deleted/edited, gate evidence table, open concerns
  (type-check-no-longer-a-build-gate; `.gitignore` missing `dist/`; residual Vercel mentions in
  narrative docs → T-006-03-02), AC verdict.

## Rollback plan

`git revert <step2> <step1>` restores all three files; `next-env.d.ts` regenerates from the active
runtime. No irreversible operation anywhere in this plan.

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Removing `next.config.ts` breaks build | very low | pre-verified experimentally (exit 0, no warn); V3 re-checks on a fresh build |
| tsconfig edit breaks editor/type resolution | very low | `.next/types/**` (vinext) still included; `next-env.d.ts` regenerated to match; V3/V5 catch real breakage |
| Stray `dist/` committed | low | explicit `rm -rf dist` after every build; V8 audit before commit |
| Scope creep into docs / wrangler | n/a (guarded) | Design §out-of-scope; those are T-006-03-02 |
