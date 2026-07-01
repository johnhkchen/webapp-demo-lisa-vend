# Design — T-006-02-02: verify-build-lint-vitest-green-under-vinext

## Problem restated

Build ✅ and test ✅ already pass under vinext. **Lint ❌** fails with 1756 problems, 100% of
them in `dist/` (the `vinext build` output), because ESLint's `globalIgnores` list ignores the
old runtime's build dirs (`.next/**`, `out/**`, `build/**`) but not vinext's `dist/**`. Source
is lint-clean (`--ignore-pattern 'dist/**'` → exit 0). The ticket is: make all three green
together, config-glue only, no game/logic diff.

## Decision 1 — Fix by adding `dist/**` to ESLint `globalIgnores`

Add `"dist/**"` to the existing `globalIgnores([...])` array in `eslint.config.mjs`, right
alongside `.next/**`, `out/**`, `build/**`.

### Options considered

**A. Add `dist/**` to `globalIgnores` (CHOSEN).**
- Uses the *exact mechanism already in the file* for build output. `dist/` is the vinext-era
  analog of `.next/`; ignoring it completes a list that the migration left half-updated.
- Config-only, one line. Zero source/test/gameplay impact. Deterministic.
- Correctly scoped: build output is generated, minified, not authored — never a lint target.
- The comment already in the file ("Default ignores of eslint-config-next") can be extended to
  note `dist/**` is vinext's output, keeping the *why* legible for the next reader.

**B. Add a path/glob argument to the lint script** (e.g. `eslint app components lib`).
- Rejected: narrows what lint sees to a hardcoded allow-list. Any new top-level source dir
  (a future `hooks/`, `styles/`) would silently escape linting — a gate that quietly stops
  covering new code is worse than one that over-covers. Ignore-list (deny) is the right
  polarity: lint everything *except* known-generated output.
- Also diverges from the established pattern (the repo lints the whole tree minus ignores).

**C. Add `/dist/` to `.gitignore` and rely on that.**
- Rejected as *the* fix: ESLint ignores are independent of git ignores. ESLint walks `dist/`
  regardless of whether git tracks it, so `.gitignore` alone does **not** make lint pass. (See
  Decision 3 for `.gitignore` as a *separate* housekeeping question.)

**D. Delete `dist/` after building / don't build before linting.**
- Rejected: this is what T-006-02-01 did, and it is exactly why the lint break went unnoticed.
  A real deploy pipeline runs `build` then `lint` against the same tree; a gate that only
  passes when you manually clean between steps is not a gate. The fix must make lint robust to
  `dist/` existing.

### Why this stays inside the AC's "config/framework-glue only, no game/logic diff"
`eslint.config.mjs` is lint configuration, not product code. The change adds a generated-output
directory to an ignore list — it changes *what is linted*, never *what the code does*. `lib/`,
`components/`, `app/`, and every `*.test.*` are untouched; the 163-test suite is the regression
proof.

## Decision 2 — Do NOT add `.vinext/**`

Investigated: `.vinext/` contains only an empty `dev/` subdir and, being a dot-directory, is
**default-ignored by ESLint flat config** (dotfiles/dot-dirs are not walked unless explicitly
un-ignored). Confirmed ESLint never reports it. Adding `.vinext/**` would be dead config —
ignoring something already ignored. Omit it to keep the diff minimal and honest. (Note: `.next`
*is* explicitly listed despite being a dot-dir; that is inherited verbatim from
`eslint-config-next`'s defaults, not a signal that we must enumerate every dot-dir ourselves.)

## Decision 3 — Leave `.gitignore` to the deploy ticket (do not touch here)

`dist/` is untracked and absent from `.gitignore`. T-006-02-01 explicitly deferred adding
`/dist/` to `.gitignore` to the Cloudflare Workers deploy ticket (E-006), reasoning it is
deploy-pipeline glue. That reasoning holds: `.gitignore` governs what git commits, which is a
deploy/VCS concern, **orthogonal to this ticket's lint AC** (proven in Decision 1C — the ESLint
ignore is load-bearing regardless of git). Touching `.gitignore` here would (a) duplicate/pre-empt
another ticket's scope and (b) risk a merge conflict on the shared branch. Flag it as a
follow-up in `review.md`; do not change it.

## Decision 4 — Prove "no game/logic diff" explicitly, don't just assert it

The AC says "no game/logic diff." Rather than assert it, the plan will (a) confirm `git diff`
touches only `eslint.config.mjs`, (b) confirm `git status` shows no modified file under
`lib/`, `components/`, `app/`, and (c) re-run the full 163-test suite after the change as an
active regression guard. Evidence over assertion — matches the rigor of T-006-02-01's review.

## Success criteria (what "green" means)

1. `npm run build` → exit 0, 5 environments built, no compat/type errors.
2. `npm run lint` → exit 0, **zero** problems (with `dist/` present on disk).
3. `npm test` → exit 0, 163/163 tests across 18 files.
4. `git diff` = `eslint.config.mjs` only; no `lib/`/`components/`/`app/`/`*.test.*` change.

## Rejected scope creep
- No ESLint rule additions/relaxations (only an ignore entry).
- No touching `vite.config.ts`, `vitest.config.ts`, `next.config.ts`, `package.json`.
- No new tests (no product code changes to cover; adding tests would breach no-diff scope).
