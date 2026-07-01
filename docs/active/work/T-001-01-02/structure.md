# Structure — T-001-01-02: verify-lint-runs-clean

The blueprint for Option B (Design): make `npm run lint` fail on warnings, keeping the change
surface to a single line so it does not collide with sibling tickets on the shared branch.

## Files

### Modified — `package.json` (1 line)
- `scripts.lint`: `"eslint"` → `"eslint --max-warnings 0"`.
- Nothing else in this file changes. No dependency edits (ESLint + `eslint-config-next`
  already present from the scaffold). No new scripts.

### Unchanged — everything else
- `eslint.config.mjs` — **not touched.** Rule severities stay as `eslint-config-next` authors
  them; enforcement lives in the script, not the config (Design rationale). Preserves the
  warn-vs-error signal for editors and future preset upgrades.
- `tsconfig.json`, `next.config.ts`, `postcss.config.mjs` — irrelevant to lint enforcement.
- `app/**`, `components/**`, `lib/**` — no source changes; the tree is already clean, so
  there is nothing to fix to reach zero warnings. This ticket is enforcement, not cleanup.

### Created — work artifacts only
- `docs/active/work/T-001-01-02/{research,design,structure,plan,progress,review}.md`.
  These are process artifacts, not shipped code.

## The change, precisely

```diff
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
-    "lint": "eslint"
+    "lint": "eslint --max-warnings 0"
   },
```

## Public interface / contract impact

- **`npm run lint` contract changes**, intentionally: exit code now reflects
  *warnings + errors*, not errors alone. This is the whole point — the script's contract is
  brought into line with the acceptance criterion ("zero warnings/errors").
- No module boundaries, no imports, no runtime code paths affected. `next build` and
  `next dev` are independent of the `lint` script and unchanged.
- Editors/IDEs reading `eslint.config.mjs` directly still surface warn-level rules as warnings
  (config severities unchanged) — only the CLI gate hardens.

## Ordering of changes

Single atomic edit; ordering is trivial but the verification bracket matters:

1. Confirm the pre-change clean baseline (`npm run lint` → exit 0) — evidence the tree is
   green *before* touching the script.
2. Apply the one-line `package.json` edit.
3. Confirm post-change clean baseline (`npm run lint` → exit 0) — the enforced gate is green.
4. Confirm the gate now bites: a temporary warning-only file makes `npm run lint` exit
   non-zero; remove the temp file; confirm green again.

## Boundaries & concurrency notes

- Touching only `scripts.lint` in `package.json` keeps the edit disjoint from sibling tickets
  (`T-001-01-01` scaffold is done; `T-001-02-01` is a separate track). If a lock conflict
  arises, this is a one-line hunk that re-applies cleanly.
- No generated files, no lockfile change (no dependency added), so `package-lock.json` stays
  untouched.

## Out of scope (explicitly)

- Rule-severity changes in `eslint.config.mjs` (rejected Option C).
- CI pipeline / GitHub Actions wiring (rejected Option D; unowned by this ticket).
- Adding a test runner or `test` script — no logic added; flagged in T-001-01-01 review as a
  later-epic concern.
