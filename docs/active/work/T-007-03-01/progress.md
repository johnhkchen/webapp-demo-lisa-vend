# Progress — T-007-03-01 hold-slot-core

## Status: complete

All plan steps executed; one atomic commit; full suite + lint + build green.

## Commit

- `12dd6fd` — feat(game): add hold slot + once-per-drop lock flag to step

## Steps

### Step 1 — Edit `lib/game.ts` ✅

Applied all six edits from structure.md, exactly as planned:
1. Added `TetrominoType` to the `import type … from "./types"` line.
2. `GameState`: added `hold: TetrominoType | null` and `canHold: boolean` with JSDoc; extended
   the interface header to explain both fields.
3. `Input`: added `"hold"` member + JSDoc paragraph describing swap/once-per-drop semantics.
4. `createInitialState`: seeds `hold: null, canHold: true`.
5. `descend`: added `canHold: true` to the lock/spawn return only; the non-locking falling
   return is untouched.
6. Added the private `hold(state)` helper (guard → stash → `?? bag.next()` → spawn → collide)
   and the `case "hold": return hold(state);` branch.

No deviations. Imports needed (`spawnPiece`, `collides`) were already present; only
`TetrominoType` was new.

### Step 2 — Tests in `lib/game.test.ts` ✅

Added a `describe("hold slot (AC)", …)` block (9 cases) and imported `createSevenBag`.
Cases, mapping to plan.md:
- empty-slot first hold stashes + draws fresh from bag (asserts bag draw via
  `createSevenBag(1).peek(2)[1]`)
- occupied-slot swap brings the held piece back fresh (rotation 0, y 0) and stashes the active
- **swap does not consume a bag draw** (peek(3) equality vs. an untouched sibling) — guards the
  `??` short-circuit, the most bug-prone line
- second hold before lock is a no-op (`toBe` same reference)
- allowance resets on lock and genuinely re-enables hold
- a non-locking tick leaves `canHold` untouched (guards the reset-branch placement)
- hard-drop shares the reset (routes through `descend`)
- `"hold"` is a no-op once game-over is set
- non-mutation of the input state's `active`/`hold`/`canHold`

### Step 3 — Verification ✅

- `npx vitest run lib/game.test.ts` → 22 passed (13 pre-existing + 9 new).
- `npx vitest run` (full) → **186 passed / 19 files**. No pre-existing test broke — every
  existing `GameState` is built via `createInitialState` spreads, so the two new required
  fields inherit defaults.
- `npm run lint` → clean (`--max-warnings 0`).
- `npm run build` → built successfully.

## Deviations from plan

None of substance. The empty-slot test asserts the exact drawn id (`peek(2)[1]`) rather than
only structural freshness as plan.md hedged — the deterministic bag makes the stronger
assertion safe and more valuable.

## Notes for the renderer ticket (T-007-03-02)

- `GameState.hold` is a `TetrominoType | null` (an identity, not a positioned piece) — the
  view renders the held *shape* at spawn orientation.
- `GameState.canHold` can drive a "hold locked" visual affordance if desired.
- Bind a key to the `"hold"` input; the reducer handles all the rules.
