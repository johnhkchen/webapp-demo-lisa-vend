# Progress — T-006-02-02: verify-build-lint-vitest-green-under-vinext

## Status: complete

## Steps executed

- [x] **Step 1 — Failing baseline.** Measured: build ✅, test ✅ (163/163), lint ❌ 1756
      problems (10 errors, 1746 warnings). Confirmed 100% of lint problems come from `dist/`
      (`eslint --ignore-pattern 'dist/**'` → exit 0; source is clean).
- [x] **Step 2 — Fix applied.** Added `"dist/**"` to `globalIgnores([...])` in
      `eslint.config.mjs` with a clarifying comment. +4 lines, no other file.
- [x] **Step 3 — Lint green with `dist/` present.** `dist/` on disk, `npm run lint` → exit 0,
      no output. The load-bearing check: passes *while build output exists*, not by cleaning.
- [x] **Step 4 — Regression guard.** `npm run build` → exit 0 (5 environments);
      `npm test` → 163/163 across 18 files, ~1.5s. Config edit changed nothing at runtime.
- [x] **Step 5 — No game/logic diff.** `git status --short lib components app` → empty.
      `git diff --stat` → `eslint.config.mjs` only (+ pre-existing ticket-frontmatter edits
      that predate this session and are not mine).
- [x] **Step 6 — Cleaned transient `dist/`.** Removed after verification so the tree stays
      clean. Note: the fix means a re-appearing `dist/` no longer breaks lint.
- [x] **Step 7 — Commit.** Single commit with `eslint.config.mjs` + this ticket's artifacts.

## Final gate results

| Gate | Command | Result |
|---|---|---|
| Build | `npm run build` | ✅ exit 0 — 5 envs, no errors |
| Lint  | `npm run lint`  | ✅ exit 0 — **0 problems** (with `dist/` present) |
| Test  | `npm test`      | ✅ exit 0 — **163/163** tests, 18/18 files |

## Deviations from plan

None. The plan anticipated the root cause (ESLint ignore list missing `dist/`) from Research,
and implementation matched Structure/Plan exactly. No scope creep; `.gitignore` left to the
deploy ticket as designed (Decision 3).
