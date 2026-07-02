# T-007-06-01 — Plan: surface-cleared-rows

Three atomic steps, bottom-up (each compiles and is green before the next). Testing strategy after
each step; full build + suite at the end.

## Step 1 — `clearLines` reports `clearedRows`

**Edit** `lib/line-clear.ts`:
- Add `clearedRows: number[]` to `LineClearResult` with a doc line (ascending pre-collapse input
  indices; `cleared === clearedRows.length`).
- Rewrite the body: `forEach((row, y) => ...)` splitting into `kept` (row has a `null`) and
  `clearedRows.push(y)` (full row); `cleared = clearedRows.length`; unchanged empties/return.
- Update module/function docstring to mention the indices and the input-board coordinate space.

**Test** `lib/line-clear.test.ts` — append `describe("clearLines — cleared row indices")`:
- adjacent bottom two → `[ROWS-2, ROWS-1]`
- non-adjacent 17 & 19 → `[17, 19]`
- none → `[]`
- all rows → `Array.from({length: ROWS}, (_, i) => i)`
- `cleared === clearedRows.length` on a mixed board

**Verify:** `npx vitest run lib/line-clear.test.ts` green (old 9 + new).
**Commit:** `feat(line-clear): report cleared row indices from clearLines`.

## Step 2 — reducer carries `clearedRows` per frame

**Edit** `lib/game.ts`:
- `GameState`: add `clearedRows: number[]` + docstring (transient; non-empty only on the clearing
  frame; y-down pre-collapse; names 06-02 as consumer).
- `createInitialState`: `clearedRows: []`.
- `descend`: destructure `clearedRows` from `clearLines`; lock return includes it; non-lock early
  return adds `clearedRows: []`; docstring note.
- `hold`: constructive return adds `clearedRows: []` (leave `!canHold` `return state`).
- `step`: add `clearedRows: []` to the `"pause"` toggle return and the four movement/rotation
  returns. Leave both `return state` gates untouched.

**Test** `lib/game.test.ts` — append:
- clearing `step` → `clearedRows` `toEqual([ROWS - 1])` (extend the existing complete-a-row scenario).
- non-clearing `tick` → `toEqual([])`.
- lateral move → `toEqual([])`.
- `createInitialState(seed).clearedRows` `toEqual([])`.

**Verify:** `npx vitest run lib/game.test.ts` green — including the existing same-reference no-op
tests (66/216/320/338) unchanged.
**Commit:** `feat(game): surface cleared-row indices for the clear frame in the reducer`.

## Step 3 — seam surfaces `clearedRows`

**Edit** `components/useGame.ts`:
- `GameView`: add `clearedRows: number[]` + docstring line (pass-through for the clear animation).
- return object: `clearedRows: state.clearedRows` (no memo).

**Test** `components/useGame.clearedRows.test.ts` (new, jsdom, `renderHook`):
- initial `clearedRows` `toEqual([])`.
- pass-through under a clear: drive a scenario that clears (parallel core stepped identically) and
  assert `result.current.clearedRows` equals the core's `clearedRows` — proves no hook-local rules.

**Verify:** `npx vitest run components/useGame.clearedRows.test.ts` green.
**Commit:** `feat(useGame): expose clearedRows on the game view`.

## Final verification

- `npx vitest run` — full suite green.
- `npm run build` — production build stays green (AC of the sibling ticket depends on it; keep it
  green here too so the branch never regresses).
- `npm run lint` — no `lib/**` boundary violations (no React import added to `lib/`).

## Testing strategy summary

- **Unit (pure), AC-primary:** `line-clear.test.ts` — indices match removed rows for constructed
  full-row boards. Directly satisfies the AC sentence.
- **Unit (reducer):** `game.test.ts` — the clear frame surfaces indices; every other step resets to
  `[]`; initial state empty. Guards the "frame of a clear" transient semantics.
- **Integration (hook):** `useGame.clearedRows.test.ts` — the view/state seam exposes the indices and
  mirrors the pure core.
- No new integration/e2e needed: there is no runtime UI behavior yet (the flash is 06-02). This
  ticket is pure data plumbing; unit + hook coverage is complete for it.

## Rollback

Each step is an isolated additive change. If step 3 regresses, steps 1–2 stand alone (the field is
simply unused by the seam). No migrations, no data, no deploy surface touched.
