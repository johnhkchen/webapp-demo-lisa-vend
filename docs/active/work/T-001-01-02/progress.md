# Progress — T-001-01-02: verify-lint-runs-clean

Execution log for the Plan. One-line script change plus command-level verification.

## Status: complete

| Step | Action | Result |
|---|---|---|
| 1 | Pre-change baseline | `npm run lint` → exit 0; `npx eslint --max-warnings=0` → exit 0. Tree already clean. |
| 2 | Edit `package.json` `scripts.lint` → `eslint --max-warnings 0` | Applied; `git diff` = exactly one line. |
| 3 | Clean baseline under stricter script | `npm run lint` → **exit 0**, no output. Acceptance criterion holds. |
| 4 | Prove gate bites on warnings | See "Enforcement proof" below. |
| 5 | Remove temp file, re-confirm | `npm run lint` → exit 0; `git status` clean of temp file. |
| 6 | Commit | Done — see commit note. |

## Enforcement proof (Step 4)

Temp `components/__linttest__.tsx` with a single **warning-only** issue (unused *local*
variable → `@typescript-eslint/no-unused-vars`, no error-level rule):

- Old behavior — `npx eslint <file>` (bare, = pre-change script): reports the warning but
  **exits 0**. Drift would have shipped green.
- New behavior — `npm run lint` (`eslint --max-warnings 0`): same warning, **exits 1**
  (`ESLint found too many warnings (maximum: 0)`).

This is the enforcement the bare script could not deliver, and the reason the change matters
beyond the trivially-already-green clean checkout.

## Deviations from plan

- **Step 4 first attempt used `export const unusedConst = 42;`** — this did *not* fail,
  because `no-unused-vars` treats exported members as public API and does not flag them. Not a
  gate defect; the test input was wrong. Re-ran with an **unused local** variable, which is a
  genuine warning, and the gate failed as designed. Documented here so the nuance isn't lost:
  the gate catches unused *locals*, not unused *exports* (by ESLint design).

## Final tree state

- Modified: `package.json` (1 line, `scripts.lint`).
- No dependency/lockfile change. No source changes (tree was already clean).
- Added: `docs/active/work/T-001-01-02/*.md` artifacts.
- No temp/residual files (`git status` verified).
