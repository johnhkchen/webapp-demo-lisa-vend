# Plan — T-006-02-02: verify-build-lint-vitest-green-under-vinext

## Testing strategy

This is a verification ticket; the "tests" are the three gates themselves, run against a tree
that has the build output present (the realistic pipeline state). No new unit/integration tests
are added — there is no new product code to cover, and adding tests would breach the no-diff
scope. The existing **163-test vitest suite is the regression guard** that proves the config
change did not perturb game/logic.

Verification criteria (all must hold):
- `npm run build` → exit 0.
- `npm run lint` → exit 0, **0 problems**, with `dist/` present on disk.
- `npm test` → exit 0, 163/163 tests, 18/18 files.
- `git diff --stat` → only `eslint.config.mjs`; no `lib/`/`components/`/`app/`/`*.test.*`.

## Steps

### Step 1 — Establish the failing baseline (done in Research)
Already measured: build ✅, test ✅, lint ❌ (1756 problems, all in `dist/`). Confirmed source
is clean via `eslint --ignore-pattern 'dist/**'` → exit 0. This is the "before" evidence.

### Step 2 — Apply the ESLint ignore fix
Edit `eslint.config.mjs`: add `"dist/**"` to `globalIgnores([...])` with a clarifying comment
(see structure.md for exact shape). Single atomic edit.

### Step 3 — Verify lint is green with `dist/` present
Ensure `dist/` exists (run `npm run build` if needed), then `npm run lint`. Expect exit 0, no
output. This is the load-bearing check: lint must pass *while the build output is on disk*, not
only after cleaning it.

### Step 4 — Re-run build and test as regression guard
- `npm run build` → exit 0, 5 environments.
- `npm test` → 163/163. Confirms the config edit changed nothing at runtime.

### Step 5 — Prove no game/logic diff
- `git diff --stat` and `git status --short` scoped to `lib/`, `components/`, `app/`.
- Expect: only `eslint.config.mjs` modified (plus this ticket's docs, which are the work
  artifacts). Zero source/test files changed.

### Step 6 — Clean transient build output
`vinext build` regenerates `dist/` (untracked, not yet gitignored per Decision 3). Remove it
after verification so the working tree stays clean and nothing stray can be committed. The lint
fix means that *if* `dist/` reappears it no longer breaks the gate — cleaning is hygiene, not a
correctness dependency.

### Step 7 — Commit
Single commit: `feat(T-006-02-02): ignore vinext dist/ output in eslint so build+lint+test are
green`. Include only `eslint.config.mjs` + this ticket's work artifacts. Do **not** stage
`dist/` or unrelated files.

## Commit boundary

One atomic commit. The change is a single-line config addition + its comment; there is no
intermediate state worth splitting. Docs artifacts for this ticket accompany the code change.

## Risks & mitigations

- **Risk: over-broad ignore hides real source.** Mitigated — `dist/**` matches only the Vite
  output subtree; source dirs are unaffected, proven by Step 3 comparing to the
  `--ignore-pattern 'dist/**'` baseline (identical result).
- **Risk: lint passes only because `dist/` was deleted, not because it is ignored.** Mitigated —
  Step 3 explicitly runs lint *with `dist/` present*.
- **Risk: config edit somehow affects tests.** Effectively impossible (ESLint config is not
  imported by runtime/tests), but Step 4 re-runs the full suite to confirm.
- **Risk: staging `dist/` or `tetris.html`/other untracked files.** Mitigated — Step 7 stages
  only the two intended paths explicitly.

## Rollback

Revert the one-line `eslint.config.mjs` change; lint returns to its prior (failing-on-`dist/`)
behavior. No data/migration/runtime state to unwind.
