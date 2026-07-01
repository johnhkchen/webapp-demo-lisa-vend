# Progress — T-001-02-02: establish-app-components-lib-layout

Execution log for the Plan. Option B: machine-enforce `lib/` purity via a `lib/**`-scoped
`no-restricted-imports` ESLint rule (zero new deps).

## Step status

| Step | Description | Status |
|---|---|---|
| 1 | Confirm baseline green (pre-change) | ✅ done |
| 2 | Add scoped enforcement rule to `eslint.config.mjs` | ✅ done |
| 3 | Prove the gate bites (probe fails lint) | ✅ done |
| 4 | Remove probe, confirm restore | ✅ done |
| 5 | Update progress + write review | ✅ done |
| 6 | Commit config + artifacts | ✅ done |

## What was done

- **Step 1 — baseline.** `npm run lint` exit 0 and `npm run build` exit 0 on the unmodified
  tree, so any later failure is attributable to the edit.
- **Step 2 — rule added.** Appended one `files: ["lib/**/*.{ts,tsx}"]` config object to
  `eslint.config.mjs` with `no-restricted-imports` forbidding `react`, `react-dom`, `next` and
  their subpaths (`react/*`, `react-dom/*`, `next/*`, `@next/*`), message pointing at CLAUDE.md.
  Placed after `...nextTs` / `globalIgnores(...)`.
  - **Assertion 1 (baseline green):** `npm run lint` exit 0; `npm run build` exit 0 — the rule
    does not false-positive on the existing tree (`lib/constants.ts` imports nothing).
- **Step 3 — gate bites.** Temporary probe `lib/__purity_probe.ts` with
  `import { useState } from "react"` → `npx eslint` reported
  `error 'react' import is restricted from being used by a pattern` (the CLAUDE.md message).
  - **Scope check:** the identical import copied to `components/__scope_probe.tsx` produced
    **0** `no-restricted-imports` hits — confirming the rule is scoped to `lib/` only and
    leaves `app/`/`components/` free to import React/Next.
- **Step 4 — restore.** Deleted both probe files. `npm run lint` exit 0; `git status` shows
  no probe residue.
- **Steps 5–6 —** review written; committed `eslint.config.mjs` + this ticket's artifacts only.

## Deviations from plan

- **None material.** Minor: assertion 2 was run via `npx eslint <probe>` (direct) and the
  scope check via a second `components/` probe — both are within the Plan's "exercise the gate
  both ways" intent and gave cleaner, file-scoped output than running the whole `npm run lint`.

## Acceptance-criteria check

- ✅ `app/`, `components/`, `lib/` exist and are committed (unchanged; from scaffold).
- ✅ `lib/` holds a pure, framework-free module imported by the app: `lib/constants.ts`
  (`COLS`/`ROWS`) ← `components/Board.tsx` ← `app/page.tsx`. Now *guarded* against framework
  leakage by the new rule.
- ✅ `npm run build` still passes (verified post-change).
