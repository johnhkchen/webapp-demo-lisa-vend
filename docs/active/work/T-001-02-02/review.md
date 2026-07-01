# Review — T-001-02-02: establish-app-components-lib-layout

Handoff document. What changed, how it was verified, and what a reviewer needs to know
without reading every diff.

## Outcome

The `app/` · `components/` · `lib/` track boundary is now **established and enforced**. The
three directories already existed and were committed by the scaffold (T-001-01-01), and
`lib/constants.ts` was already a pure module imported by the app — so the *literal* acceptance
criteria were met before this ticket began. What this ticket adds is the missing piece its
Context demands: a build-time guarantee that `lib/` stays framework-free, so rendering and
pure game logic remain on separable tracks that lisa's parallel threads cannot silently merge.
**All acceptance criteria met; boundary now machine-enforced.** Committed as `cd68bdc`.

## What changed

### Modified
- `eslint.config.mjs` — appended one `files: ["lib/**/*.{ts,tsx}"]`-scoped config object with
  a core `no-restricted-imports` rule (severity `error`) forbidding `react`, `react-dom`,
  `next`, and their subpaths (`react/*`, `react-dom/*`, `next/*`, `@next/*`). The rule's
  message points violators at CLAUDE.md. **No dependency added** — `no-restricted-imports`
  ships with ESLint core. Global rule severities from `next/core-web-vitals` +
  `next/typescript` are untouched.

### Added
- `docs/active/work/T-001-02-02/{research,design,structure,plan,progress,review}.md`.

### Not changed (deliberately)
- `lib/constants.ts` — already the satisfying pure module (`COLS`/`ROWS`); no new placeholder
  needed. Now guarded rather than replaced.
- `app/**`, `components/**` — untouched. In particular `app/globals.css` and `app/layout.tsx`
  are sibling ticket **T-001-02-01**'s in-flight surface; keeping off them preserves the
  disjoint file sets that let the two S-001-02 tickets run concurrently without collision.
- `package.json` / lockfile, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs` — no change.

## Why a change at all (not just "verify")

The criteria check that the tracks *exist*; the ticket **Context** asks that they stay
*separable* "without file collisions" under lisa's parallel, same-branch execution. Existence
was already true; separability was held only by prose in CLAUDE.md. A future epic could
`import { useState } from "react"` inside `lib/` and ship green — the exact logic/render merge
the boundary exists to prevent. The scoped rule converts that convention into an enforced
invariant at ~30 lines and zero dependencies. This mirrors the reasoning of T-001-01-02, which
tightened the lint *script* rather than merely confirming it was clean.

## Verification

Exercise-the-gate-both-ways (no logic added → no unit tests, consistent with T-001-01-01/02).

| Check | Command | Result |
|---|---|---|
| Baseline clean (pre-change) | `npm run lint` / `npm run build` | exit 0 / exit 0 |
| Rule doesn't false-positive on tree | `npm run lint` (post-change) | exit 0, zero warnings |
| Production build still passes | `npm run build` | exit 0, `/` + `/_not-found` static |
| **Gate bites in `lib/`** | temp `lib/__purity_probe.ts` w/ `import {useState} from "react"` → `npx eslint` | **exit 1**, `no-restricted-imports` error w/ CLAUDE.md message |
| **Rule scoped to `lib/` only** | same import in `components/__scope_probe.tsx` | **0** `no-restricted-imports` hits |
| Tree restored | remove probes → `npm run lint`; `git status` | exit 0, no residue |
| Commit scope | `git show --stat` | only `eslint.config.mjs` + this ticket's artifacts |

The `lib/` fail vs. `components/` pass contrast is the core evidence: the boundary is real and
correctly one-directional (framework may not enter `lib/`; `app`/`components` stay unrestricted).

## Test coverage

- **No automated tests, by design.** This ticket adds a build-time gate, not application
  logic. The gate itself is the quality mechanism and was verified by exercising it both ways.
- **Gap carried forward (unchanged from T-001-01-01/02):** no `test` script / runner yet.
  Stand up Vitest (or Jest) when the first pure `lib/` logic epic (E-002 → S-002/S-003/S-004)
  lands — those tetromino/collision/scoring/RNG modules are the ones this boundary protects and
  the ones that will want real unit coverage.

## Open concerns / notes for the reviewer

1. **Rule guards imports, not all impurity.** `no-restricted-imports` blocks framework
   *imports* into `lib/` — the material breach. It does **not** catch non-import impurity
   (e.g. reading `window`/`document`, `Math.random` in a function meant to be seeded, hidden
   global state). Those are correctness concerns for the logic epic's own tests, not this
   structural gate. Documented so the gate isn't mistaken for a full purity proof.
2. **`allowTypeImports` is left default (`false`)**, so even `import type { FC } from "react"`
   is rejected in `lib/`. Intentional — a pure module should not reference framework types.
   If a downstream module has a genuine need for a framework *type* (unlikely for game logic),
   that is an explicit `eslint-disable` with justification, not a silent allowance.
3. **Layered back-edges not enforced (deferred Option D).** The rule stops framework → `lib/`.
   It does not stop `lib/` → `components/`/`app/` or `components/` → `app/`. Expressing those
   cleanly tends to pull in `eslint-plugin-import`/`boundaries` (a new dep), against the
   project's minimal-path norm. Revisit only if the DAG grows and a real violation appears.
4. **No barrel `index.ts` per track (rejected Option C).** T-001-01-02 confirmed unused
   *exports* are not flagged by the lint gate, so a barrel would be an un-gated surface prone
   to drift. Import style (`@/lib/constants` vs `@/lib`) is left for the consuming epic to set.
5. **Committed on the shared branch (`main`)**, matching the RDSPI concurrency model and prior
   tickets. Only `eslint.config.mjs` + this ticket's artifacts were staged; sibling files and
   ticket frontmatter (`phase`/`status`) were left untouched for Lisa to manage.

## Critical issues

None. One additive, scoped, zero-dependency config object; fully reversible (delete the object
or revert `cd68bdc`); clean tree verified green; enforcement verified live in both directions.

## Bottom line

The app/components/lib boundary is no longer just a directory convention — it is a checked
invariant. `lib/` cannot import React/Next without failing the enforced lint gate, so the
pure-logic and rendering tracks stay collision-free for parallel development. The pure-game-core
epic can now build in `lib/` on guaranteed-clean ground.
