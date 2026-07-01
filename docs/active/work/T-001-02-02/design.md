# Design — T-001-02-02: establish-app-components-lib-layout

Options, tradeoffs, decision, rationale. Grounded in `research.md`: the three directories
already exist and every acceptance clause is already green — so the design question is *what
increment, if any, genuinely establishes the boundary* rather than merely re-asserting it.

## The problem restated

The literal criteria (dirs exist + one pure module imported + build passes) are satisfied by
the scaffold. But the ticket's **Context** — "so rendering and pure, framework-free game
logic stay on separable tracks that lisa can build in parallel without file collisions" — is
a *durability* goal, not an existence check. Nothing today prevents a future parallel track
from importing React into `lib/` and dissolving the boundary. The design must decide how much
to invest in making the boundary hold under concurrent development, without scope creep.

## Options considered

### Option A — No-op / ratify only
Declare acceptance already met; produce artifacts documenting that the scaffold discharged
the criteria; change no code; verify build/lint still green; commit artifacts only.

- **Pro:** Zero risk; honest about the scaffold already doing the work.
- **Con:** Leaves the boundary as prose-only convention — the exact thing the Context warns
  about ("without file collisions") stays unenforced. The next epic can breach `lib/` purity
  with a green build. A ticket whose whole purpose is "establish a separable boundary" that
  ships no mechanism to keep it separable is under-delivering on its Context.

### Option B — Machine-enforce `lib/` purity via scoped ESLint rule (chosen)
Add one path-scoped config object to `eslint.config.mjs` targeting `lib/**` with
`no-restricted-imports`, forbidding imports of `react`, `react-dom`, and `next` (and their
subpaths). Zero new dependencies — `no-restricted-imports` is a core ESLint rule. `lib/`
stays framework-free *by construction*; a violation fails `npm run lint` (already an enforced
`--max-warnings 0` gate).

- **Pro:** Directly operationalizes the Context. The boundary becomes a build-time invariant,
  not a hope. Zero deps, ~10 lines, reversible. Scoped to `lib/**` only, so it cannot affect
  `app/`/`components/` (which legitimately import React/Next). No collision with T-001-02-01
  (that ticket touches only `app/globals.css` + `app/layout.tsx`; this touches only
  `eslint.config.mjs`).
- **Con:** Touches shared lint config; must verify it doesn't false-positive on the existing
  tree and doesn't fight the next presets. (Both checked in Plan/Implement.)

### Option C — Add barrel `index.ts` public interfaces per track
Create `lib/index.ts` (+ possibly `components/index.ts`) re-exporting each track's public API,
establishing an explicit interface surface.

- **Pro:** Names an intentional public API per track.
- **Con:** **Premature and rot-prone.** Research shows T-001-01-02 confirmed unused *exports*
  are *not* caught by the lint gate — an `index.ts` barrel would be exactly the kind of
  unchecked surface that silently drifts. It also imposes an import-style decision
  (`@/lib` vs `@/lib/constants`) on downstream epics that should make it themselves. Adds
  surface without adding a guarantee. Rejected.

### Option D — Enforce full layered dependency direction (app→components→lib, no back-edges)
Beyond `lib/` purity, add rules forbidding `lib/` from importing `components/`/`app/` and
`components/` from importing `app/`.

- **Pro:** Encodes the whole dependency DAG.
- **Con:** Over-reaches for this ticket. `lib/` importing `react`/`next` is the *material*
  breach the Context cares about (framework leaking into pure logic). The `no-back-edge`
  rules guard against violations no current or near-term code is close to making, and expressing
  "no importing from a sibling app dir" cleanly tends to pull in `eslint-plugin-import` or
  `boundaries` — a new dependency, against the minimal-path grain. Defer; revisit if the DAG
  grows. Rejected for now (documented as a future option).

## Decision

**Option B.** Add a single `lib/**`-scoped `no-restricted-imports` rule to the flat ESLint
config that forbids `react`, `react-dom`, `next`, and their subpath imports, with a message
pointing at CLAUDE.md. Keep `lib/constants.ts` as the satisfying pure module — no new
placeholder is needed (research confirms it already discharges that clause). No barrels, no
back-edge rules, no touch to `app/` or `components/` source.

### Why B over A
A is *safe* but leaves the ticket's reason-for-being unfulfilled. The Context explicitly ties
the boundary to lisa's parallel, same-branch execution where "if two tickets modify the same
files, that is a missing dependency edge." A framework import sneaking into `lib/` is the
logic/render collision the boundary exists to prevent. B converts the convention into a
checked invariant at near-zero cost and risk — the strictly better discharge of the ticket.

### Why B over C / D
C adds an unchecked export surface (proven un-gated by T-001-01-02) — surface without
guarantee. D adds guarantees nobody needs yet and tends to drag in a dependency, violating the
established minimal-path norm. B is the smallest change that makes the boundary *real*.

## The enforcement rule (shape, not final code)

A new trailing config object in the flat array:

```
{
  files: ["lib/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["react", "react-dom", "next",
                "react/*", "react-dom/*", "next/*", "@next/*"],
        message: "lib/ must stay pure and framework-free (see CLAUDE.md). Keep React/Next in components/ and app/.",
      }],
    }],
  },
}
```

- `patterns.group` catches bare specifiers **and** subpaths (`next/navigation`, `react/jsx-runtime`).
- Default `allowTypeImports: false` means even `import type { FC } from "react"` is caught —
  correct: a pure module should not reference framework types either.
- Placed **after** the `next` presets so it layers on top; scoped by `files` so it never
  applies to `app/`/`components/`.

## Impact on current tree

- `lib/constants.ts` imports nothing → rule is a no-op on it; `npm run lint` stays green.
- `components/Board.tsx` imports `@/lib/constants` (app→lib, and it's not under `lib/`) →
  unaffected. `app/**` unaffected. Verified in Implement.

## What stays out of scope

Neon/glass theme, game loop, the actual pure logic modules (tetromino/collision/scoring/RNG),
a test runner, CI wiring, and the layered back-edge rules (Option D). This ticket establishes
and *guards* the boundary; downstream epics fill the tracks.

## Verification intent (for Plan)

Prove three things: (1) clean tree still lints/builds green; (2) the rule actually *bites* —
a temporary `import { useState } from "react"` in a `lib/**` file fails lint; (3) tree
restored, no residue. This mirrors T-001-01-02's "exercise the gate both ways" evidence style.
