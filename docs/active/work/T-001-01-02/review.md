# Review — T-001-01-02: verify-lint-runs-clean

Handoff document. What changed, how it was verified, and what a reviewer needs to know without
reading every diff.

## Outcome

`npm run lint` now runs `eslint --max-warnings 0`. On a clean checkout it exits **0** with zero
warnings/errors, and the ESLint flat config (`eslint.config.mjs`, `next/core-web-vitals` +
`next/typescript`) is present and wired to the `lint` script. **Acceptance criterion met** —
and, per the ticket's Context, the gate is now genuinely *enforced*: warnings fail it too.

## What changed

### Modified
- `package.json` — `scripts.lint`: `"eslint"` → `"eslint --max-warnings 0"` (one line). No
  dependency changes, no `package-lock.json` churn.

### Not changed (deliberately)
- `eslint.config.mjs` — untouched. Rule severities stay as `eslint-config-next` authors them;
  enforcement lives in the script, so editors keep the warn-vs-error signal and preset
  upgrades don't fight a local override. (Rejected Option C in `design.md`.)
- `app/**`, `components/**`, `lib/**` — no source edits. The tree was already lint-clean, so
  reaching zero warnings required no cleanup; this ticket is enforcement, not fixing.

### Added
- `docs/active/work/T-001-01-02/{research,design,structure,plan,progress,review}.md`.

## Why the change (not just "verify")

The criterion says *zero warnings/errors*, but **bare `eslint` exits non-zero only on
errors** — warnings pass green. On a clean checkout that gap is invisible; the first
downstream `no-unused-vars` warning would have shipped green, which is exactly the drift the
ticket exists to prevent. `--max-warnings 0` closes the gap so the script's exit code matches
the criterion's wording and the Context's "enforced gate" intent.

## Verification

Command-level (no logic added → no unit tests, consistent with T-001-01-01's testing stance).

| Check | Command | Result |
|---|---|---|
| Clean checkout green under new script | `npm run lint` | **exit 0**, no output |
| ESLint config valid & applies | `npx eslint --print-config components/Board.tsx` | resolves (~1610 lines) |
| Gate ignores unused *exports* | `export const x = 42` temp file → `npm run lint` | exit 0 (by ESLint design) |
| **Gate bites on warnings** | unused *local* var temp file → `npm run lint` | **exit 1** (`too many warnings (max: 0)`) |
| Old script would have passed same file | `npx eslint <same file>` | exit 0 — confirms the behavior change |
| Tree restored | remove temp → `npm run lint`; `git status` | exit 0, no residual files |

The warning-only exit-1 vs. bare-eslint exit-0 contrast is the core evidence: enforcement now
exists where it did not.

## Test coverage

- **No automated tests, by design** — this ticket only tightens a build script. The gate
  itself *is* the quality mechanism; its behavior was verified by exercising it (clean pass +
  warning-triggered failure).
- **Gap carried forward (unchanged from T-001-01-01):** no `test` script / test runner yet.
  Stand up Vitest (or Jest) when the first pure `lib/` logic epic lands. Out of scope here.

## Open concerns / notes for the reviewer

1. **Unused *exports* are not flagged** by `@typescript-eslint/no-unused-vars` (they're
   treated as public API). So the gate catches unused *locals*, not dead exports. If dead-code
   detection across module boundaries becomes desired later, that needs a different rule/tool
   (e.g. `knip`, `ts-prune`) — not this ticket. Documented so it isn't mistaken for a defect.
2. **Stricter gate = intentional friction.** A legitimately-wanted future warning must be
   handled explicitly (`eslint-disable` with justification, or a considered severity change).
   That is the desired behavior for an enforced baseline, not a regression.
3. **No CI wiring** attached. `npm run lint` is now a correct gate for any CI to call, but the
   pipeline itself is unowned by this ticket (rejected Option D).
4. **Commit scope:** committed `package.json` + this ticket's work artifacts only. Ticket
   frontmatter (`phase`/`status`) was left untouched for Lisa to manage, and sibling tickets'
   files were not staged.

## Critical issues

None. One-line, reversible change; clean checkout verified green; enforcement verified live.
