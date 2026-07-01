# Plan — T-001-01-02: verify-lint-runs-clean

Ordered, independently verifiable steps to implement Option B and prove the enforced gate.
Small enough to land as a single atomic commit.

## Testing strategy

No unit/integration tests: this ticket adds no application logic, only tightens a build script.
Verification is **command-level**, asserting on `npm run lint` **exit codes**:
- Clean tree must exit **0** (the acceptance criterion).
- A warning-only violation must make it exit **non-zero** (proves warnings now gate — the
  enforcement claim).
Each check is reproducible from a clean checkout and leaves no residue.

## Steps

### Step 1 — Record the pre-change baseline
- Run `npm run lint`; capture exit code (expect **0**, no output).
- Run `npx eslint --max-warnings=0`; capture exit code (expect **0**).
- **Verify:** both exit 0 → the tree is already clean, so tightening the script cannot turn
  green to red. Documented in `progress.md`.

### Step 2 — Apply the one-line script change
- Edit `package.json`: `"lint": "eslint"` → `"lint": "eslint --max-warnings 0"`.
- **Verify:** `git diff package.json` shows exactly one changed line in `scripts.lint`; no
  dependency or lockfile change.

### Step 3 — Confirm the clean baseline still passes
- Run `npm run lint`; capture exit code (expect **0**, no output).
- **Verify:** exit 0 → acceptance criterion holds under the stricter script. This is the
  primary acceptance check.

### Step 4 — Prove the gate now bites on warnings
- Create a temp file (e.g. `components/__linttest__.tsx`) whose only issue is a warn-level
  rule — an unused `const` (`@typescript-eslint/no-unused-vars`, a *warning* in the preset),
  with **no** error-level violation.
- Run `npm run lint`; capture exit code (expect **non-zero**, warning reported).
- **Verify:** exit is non-zero *because of a warning alone* — this is the enforcement proof
  that bare `eslint` could not provide.

### Step 5 — Clean up and re-confirm green
- Remove the temp file.
- Run `npm run lint`; capture exit code (expect **0**).
- **Verify:** exit 0 → working tree restored, gate green, no stray files (`git status`
  shows only the `package.json` edit and the work artifacts).

### Step 6 — Commit
- Stage `package.json` and the `docs/active/work/T-001-01-02/` artifacts.
- Commit atomically with a message describing the enforced-gate change.
- **Verify:** `git show --stat` lists `package.json` + the artifacts and nothing unexpected
  (no temp file, no lockfile churn).

## Rollback

Single-line, single-file change with no dependency impact → revert the `package.json` hunk to
restore the prior behavior. No data, migrations, or generated files involved.

## Acceptance mapping

| Acceptance criterion | Proven by |
|---|---|
| `npm run lint` exits 0, zero warnings/errors on clean checkout | Step 3 (exit 0 under `--max-warnings 0`) |
| ESLint config present | `eslint.config.mjs` (flat, next presets) — Research §config |
| Config wired to `lint` script | `scripts.lint` invokes `eslint`; Step 4 proves it inspects source & gates |
| Enforced (no-drift) gate — Context intent | Step 4 (a warning alone fails the gate) |

## Risks

- **Very low.** Worst case a legitimate future warning fails lint; that is the intended
  behavior and is resolvable per-line via `eslint-disable` with justification.
- No interaction with `next build`/`dev`; those scripts are untouched.
