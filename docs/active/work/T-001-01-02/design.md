# Design — T-001-01-02: verify-lint-runs-clean

Decision: how to satisfy "exit 0 with zero warnings/errors, ESLint present and wired" in a way
that is genuinely **enforced** and drift-resistant, grounded in the Research findings.

## The decision to make

Research established two facts: (a) on a clean checkout the tree is already lint-clean (exit 0
with `--max-warnings=0` too); (b) the `lint` script is bare `eslint`, which fails on **errors
only**, letting **warnings** pass with exit 0. The Context wants an *enforced* gate against
*drift* — and drift arrives as warnings. So the design question is how (and whether) to make
warnings count.

## Options considered

### Option A — Do nothing; just verify and document
The criterion ("zero warnings/errors on a clean checkout") is literally true today, so declare
victory and record the verification.
- **Pro:** zero change surface, zero lock contention, nothing to break.
- **Con:** leaves the gate un-enforced. The first `no-unused-vars` warning in a downstream
  epic ships green — exactly the drift the ticket exists to prevent. Fails the *intent*.

### Option B — Add `--max-warnings 0` to the `lint` script *(chosen)*
Change `"lint": "eslint"` → `"lint": "eslint --max-warnings 0"`.
- **Pro:** any warning now makes `npm run lint` exit non-zero, so the script's exit code
  matches the criterion's "zero *warnings*/errors" wording exactly. One-line, one-file change
  (`package.json`). Idiomatic — `--max-warnings 0` is the canonical ESLint knob for "warnings
  are not acceptable". Leaves rule severities untouched, so `eslint-config-next` upgrades keep
  working and the distinction warn-vs-error is preserved for local/editor use.
- **Con:** slightly stricter than a bare generator scaffold; a future *intentional* warning
  would need an explicit `eslint-disable` or a severity decision. That is the desired behavior
  for an enforced gate, not a real downside.

### Option C — Promote `warn` rules to `error` in `eslint.config.mjs`
Add an override block setting the relevant rules (or all) to `error`.
- **Pro:** enforcement travels with the config, independent of how lint is invoked (CI,
  editors, `npx eslint` directly).
- **Con:** fights `eslint-config-next`, which deliberately ships some rules at `warn`. Blanket
  promotion is brittle across preset upgrades; per-rule promotion is a guessing game about
  which rules matter and creates a config maintenance burden. Higher blast radius than the
  ticket warrants. Rejected as scope creep.

### Option D — Add an explicit target/CI wrapper (`eslint .` + a CI step)
- **Con:** bare `eslint` already lints the tree (verified in Research); adding `.` is cosmetic.
  A CI pipeline is out of scope for this ticket and unowned here. Rejected.

## Decision

**Option B.** Set the `lint` script to `eslint --max-warnings 0`.

### Why B over the others
- **Matches the acceptance wording precisely.** The criterion says *zero warnings/errors*; only
  a warning-sensitive exit code delivers that. B makes the script's contract equal the
  criterion. A leaves a gap between "passes" and "clean".
- **Enforcement where the gate is invoked.** `npm run lint` is the gate downstream tracks and
  any CI will call. Tightening the script tightens the gate everyone actually runs.
- **Minimal, idiomatic, reversible.** One token in one file. No preset fights (rules keep their
  authored severities, so editors still show warn-vs-error), no new dependencies, trivially
  revertable. Contrast C's ongoing severity-maintenance cost.
- **Safe right now.** Research verified the current tree passes `--max-warnings=0` (exit 0), so
  flipping the switch does not turn today's green into red. We lock the clean state in at its
  cleanest.

## Consequences

- After the change, **any** future warning fails `npm run lint` — the intended drift barrier.
- Contributors who want a legitimately non-failing warning must make an explicit choice
  (`eslint-disable` with justification, or a severity change) — friction by design.
- `next-env.d.ts` and build output stay ignored via the existing `globalIgnores`; unaffected.

## Verification standard (carried to Plan)

`npm run lint` must exit **0** on the clean tree *after* the change, and exit **non-zero** when
a warning-only violation is introduced (proving warnings now gate). Both are command-level
checks — no unit tests are implied by this ticket.
