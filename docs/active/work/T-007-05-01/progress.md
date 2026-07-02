# Progress — T-007-05-01 pause-state-core

## Status: complete

All plan steps executed, suite green, two atomic commits landed. No deviations from the plan.

## Steps

- [x] **Step 1 — State field + default** (`lib/game.ts`): added `paused: boolean` to `GameState`
  (after `gameOver`) with a doc note (resumable, distinct from terminal `gameOver`); defaulted
  `paused: false` in `createInitialState`.
- [x] **Step 2 — Input member** (`lib/game.ts`): added `| "pause"` to the `Input` union; extended
  the union doc comment with toggle semantics + "honored only while running / no bag effect".
- [x] **Step 3 — Gate + toggle in `step`**: inserted, between the `gameOver` guard and the `switch`:
  `if (input === "pause") return { ...state, paused: !state.paused };` then
  `if (state.paused) return state;`. `switch` body unchanged; `step` doc updated. TS narrows
  `input` past the toggle so the `switch` stays exhaustive over the remaining members.
- [x] **Step 4 — Tests** (`lib/game.test.ts`): added `describe("pause (AC)", …)` with all eight
  planned cases.

## Commits

- `ca82063` — `feat(game): add resumable paused flag + pause toggle to core reducer`
- `2d95005` — `test(game): cover pause gating, clean resume, and game-over/bag invariants`

## Verification

- `npx tsc --noEmit` — clean.
- `npm test` — **221 passed** (22 files); prior 213 + 8 new pause cases. `determinism`/`bag` suites
  unchanged and green (piece stream unperturbed).
- `npm run lint` — 0 warnings, no React import in `lib/`.

## Deviations

None. Implementation matches design.md / structure.md / plan.md exactly.

## Notes for the sibling ticket (T-007-05-02)

- The core contract to consume: dispatch `"pause"` to toggle; read `state.paused` to drive the
  overlay and to gate/halt the rAF gravity loop. `dispatch` in `useGame.ts` is already generic over
  `Input`, so no seam signature change is needed to send `"pause"`.
