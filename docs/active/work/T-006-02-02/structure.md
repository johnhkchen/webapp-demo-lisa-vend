# Structure — T-006-02-02: verify-build-lint-vitest-green-under-vinext

## Files

### Modified (1)
- **`eslint.config.mjs`** — add `"dist/**"` to the `globalIgnores([...])` array; extend the
  inline comment so the *why* (vinext build output, analog of `.next/`) is legible.

### Created (0 product / 6 docs)
- `docs/active/work/T-006-02-02/{research,design,structure,plan,progress,review}.md` — this
  ticket's RDSPI artifacts. No product/test files created.

### Deleted (0)
- None.

### Explicitly NOT touched
- `lib/**`, `components/**`, `app/**` — game logic + rendering (no-diff invariant).
- Any `*.test.ts` / `*.test.tsx` — 18 files, 163 tests (regression guard, unchanged).
- `vite.config.ts`, `vitest.config.ts`, `next.config.ts`, `package.json` — build/test wiring
  is already correct; the only defect is the ESLint ignore list.
- `.gitignore` — deferred to the E-006 Cloudflare deploy ticket (design Decision 3).

## The edit — precise shape

In `eslint.config.mjs`, the `globalIgnores` call currently reads:

```js
globalIgnores([
  // Default ignores of eslint-config-next:
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
]),
```

Target shape (add one entry + a clarifying comment; preserve existing entries and order):

```js
globalIgnores([
  // Default ignores of eslint-config-next:
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
  // vinext (Vite) build output — the App Router migration's analog of `.next/`.
  // `vinext build` emits bundled/minified code to `dist/`; it is generated, never
  // authored, so it must not be linted (T-006-02-02).
  "dist/**",
]),
```

Rationale for placement/wording:
- Kept **after** the eslint-config-next defaults with its own comment, so the human reader can
  see which ignores are inherited vs. added for this project's runtime.
- Glob `dist/**` matches the whole subtree (Vite writes `dist/client`, `dist/server`,
  `dist/server/ssr`, …). Not `dist` alone, to be unambiguous about recursion.

## Public interface / behavior impact

- **None at runtime.** ESLint config is tooling; it changes only which files the linter walks.
- **Lint behavior**: `dist/**` no longer contributes findings. Source coverage is unchanged —
  `app/`, `components/`, `lib/`, config files, and tests are all still linted exactly as before.
  Verified: `eslint --ignore-pattern 'dist/**'` already reports source clean, so ignoring
  `dist/` is the *only* delta between failing and passing.

## Ordering of changes

Single atomic edit; no internal ordering constraints. Sequence at the ticket level:
1. Apply the `eslint.config.mjs` edit.
2. Run the three gates (build, lint, test) with `dist/` present on disk.
3. Prove no game/logic diff (`git diff`/`git status` scoped to source).
4. Commit.

## Invariants preserved

- **Pure-logic track boundary** (`lib/**` no-React/Next rule) — untouched; still enforced.
- **`--max-warnings 0` strictness** — unchanged; we do not relax any rule, only stop linting
  generated output.
- **163/163 tests** — must remain green after the edit (config change cannot affect runtime,
  but we verify rather than assume).
