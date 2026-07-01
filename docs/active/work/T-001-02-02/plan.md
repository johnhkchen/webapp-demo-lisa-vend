# Plan — T-001-02-02: establish-app-components-lib-layout

Ordered, independently verifiable steps to implement the chosen design (Option B: machine-
enforce `lib/` purity via a `lib/**`-scoped `no-restricted-imports` ESLint rule). Testing
strategy is exercise-the-gate-both-ways, mirroring T-001-01-02's evidence style. The whole
change is one config edit, so it commits atomically.

## Testing strategy (up front)

- **No unit tests added.** This ticket adds no application logic — consistent with
  T-001-01-01 / T-001-01-02, which both deferred a test runner to the first `lib/` logic epic
  (E-002). The mechanism here *is* a build-time gate; the correct test is to exercise the gate.
- **Verification = three assertions:**
  1. **Baseline green** — clean tree passes `npm run lint` and `npm run build` with the rule
     added (proves no false-positive on existing `lib/`, `app/`, `components/`).
  2. **Gate bites** — a temporary framework import inside `lib/**` fails `npm run lint`
     (proves the rule is real, not inert).
  3. **Tree restored** — removing the temp file returns to green and leaves `git status`
     clean (proves the probe left no residue).
- Acceptance-criteria check: `app/`/`components/`/`lib/` committed (already true), `lib/` pure
  module imported by app (`lib/constants.ts` ← `Board` ← `page`), `npm run build` passes.

## Step 1 — Confirm baseline (pre-change)

- Run `npm run lint` and `npm run build`; both must be green *before* editing, so any post-
  change failure is attributable to the edit.
- **Verify:** lint exit 0; build exit 0. (Recorded in `progress.md`.)

## Step 2 — Add the scoped enforcement rule

- Edit `eslint.config.mjs`: append the `files: ["lib/**/*.{ts,tsx}"]` config object with
  `no-restricted-imports` forbidding `react`/`react-dom`/`next` + subpaths (exact shape in
  `structure.md`), after the `...nextTs` spread / `globalIgnores(...)`.
- **Verify (assertion 1 — baseline green):** `npm run lint` exit 0, then `npm run build`
  exit 0. Confirms the rule doesn't false-positive on the current tree.

## Step 3 — Prove the gate bites (assertion 2)

- Create a throwaway probe file `lib/__purity_probe.ts` containing a forbidden import, e.g.
  `import { useState } from "react";` plus a trivial export so the file is valid.
- Run `npm run lint`; **expect exit 1** citing `no-restricted-imports` on that line.
- Also spot-check scoping: the same import placed in `components/` would *not* be flagged
  (reasoned from the `files` glob; the probe stays in `lib/` to keep the check focused).
- **Verify:** lint fails with the restricted-import message pointing at CLAUDE.md.

## Step 4 — Remove probe, confirm restore (assertion 3)

- Delete `lib/__purity_probe.ts`.
- Run `npm run lint` (exit 0) and `git status` (no `__purity_probe` residue; only intended
  changes staged/unstaged).
- **Verify:** green + clean tree.

## Step 5 — Update progress + review artifacts

- Record step outcomes in `progress.md` (done / deviations).
- Write `review.md` (handoff): what changed, verification table, test-coverage stance, open
  concerns.

## Step 6 — Commit

- Stage **only** `eslint.config.mjs` + `docs/active/work/T-001-02-02/*`.
- Do **not** stage: sibling ticket files, `app/globals.css`/`app/layout.tsx` (T-001-02-01's
  in-flight surface), or any ticket-frontmatter `phase`/`status` change (Lisa manages those).
- Commit message: `chore(T-001-02-02): enforce lib/ purity boundary via scoped eslint rule`
  with a short body noting zero new deps and the app/components/lib boundary intent, plus the
  Co-Authored-By trailer.
- **Verify:** `git show --stat` lists only the config file + this ticket's artifacts.

## Rollback

Single reversible edit: delete the appended config object (or `git revert` the commit). No
dependency or lockfile change to unwind, no source file altered.

## Risk & mitigation recap

| Risk | Mitigation | Caught by |
|---|---|---|
| Rule false-positives on existing `lib/` | `lib/constants.ts` imports nothing | Step 2 verify |
| Glob leaks rule into `app/`/`components/` | `files: ["lib/**"]` scoping | Step 2 (those import React/Next) |
| Rule inert (wrong pattern) | Positive probe test | Step 3 |
| Probe file left behind | Explicit delete + `git status` | Step 4 |
| Accidental sibling-file staging | Stage explicit paths only | Step 6 `git show --stat` |

## Out of plan

Barrel exports, layered back-edge rules, test runner, CI wiring, theme/game-loop work — all
downstream. This plan establishes and guards the boundary; it does not fill the tracks.
