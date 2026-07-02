# Plan — T-007-05-01 pause-state-core

Ordered, independently-verifiable steps. Two commits (production+doc, then tests), or one atomic
commit if the suite is authored alongside the code. Testing strategy: pure-core unit tests in
`lib/game.test.ts` (no jsdom); the AC lives entirely in this suite.

## Step 1 — State field + default (`lib/game.ts`)

- Add `paused: boolean;` to `GameState` after `gameOver` (E1). Update the interface doc: `paused`
  freezes gravity/movement, resumable, distinct from terminal `gameOver`.
- Add `paused: false,` to the `createInitialState` return literal (E3).
- **Verify:** `npx tsc --noEmit` fails *only* where a `GameState` literal now lacks `paused` — there
  should be none outside tests that spread `createInitialState` (those inherit it). Fix any direct
  literal if the compiler flags one.

## Step 2 — Input member (`lib/game.ts`)

- Add `| "pause"` to the `Input` union (E2) and extend its doc comment (toggle semantics + "honored
  only while running").
- **Verify:** `tsc` now flags the `step` `switch` as non-exhaustive **only if** we try to handle
  `"pause"` there — we will not; the early `if` consumes it. Confirm `tsc` is green after Step 3.

## Step 3 — Gate + toggle in `step` (`lib/game.ts`)

- Insert, between the `gameOver` guard and the `switch`:
  ```ts
  if (input === "pause") return { ...state, paused: !state.paused };
  if (state.paused) return state;
  ```
- Update the `step` doc comment (toggle + paused no-op, symmetric with `gameOver`).
- **Verify:** `npx tsc --noEmit` clean; `npm test` — existing suite still green (nothing regressed;
  `paused` defaults false so the gate never fires for existing tests).

**Commit 1:** `feat(game): add resumable paused flag + pause toggle to core reducer`
(Steps 1–3: production + docs, one atomic unit — the feature compiles and the existing suite passes.)

## Step 4 — Test suite (`lib/game.test.ts`)

Add `describe("pause (AC)", …)` with the eight cases from structure.md:

1. `"pause"` toggles on→off (`paused` true then false).
2. **(AC)** paused `tick` is a no-op — `expect(step(p,"tick")).toBe(p)` + `y` unchanged.
3. **(AC)** toggling twice → `toEqual(s)` and `not.toBe(s)`.
4. every play input gated while paused — loop, each `toBe(p)`.
5. clean resume — pause→(paused tick)→pause→tick drops one row; `y === s.y + 1`.
6. pause consumes no bag draw — `step(s,"pause").bag.peek(3)` equals sibling seed's `peek(3)`.
7. paused `hold` doesn't spend the allowance — `toBe(p)`, `canHold` stays true.
8. `"pause"` is a no-op once game-over — `expect(step(ended,"pause")).toBe(ended)`.

- **Verify:** `npm test` — full suite green including the new block; `npm run lint` clean.

**Commit 2:** `test(game): cover pause gating, clean resume, and game-over/bag invariants`

## Testing strategy

- **Unit only, pure core.** Every obligation is expressible against `step`/`createInitialState`
  without React — matches the `lib/` suite convention. No hook/DOM test here (that arrives with the
  seam in T-007-05-02).
- **AC → cases.** "paused tick is a no-op" = case 2 (strongest form, `toBe`). "toggling twice returns
  an equivalent state" = case 3 (`toEqual`). "gates ticks/movement while paused and resumes cleanly"
  = cases 4 (gate breadth) + 5 (clean resume).
- **Regression guard.** Cases 6–8 pin the non-obvious invariants (no bag draw, no hold spend,
  game-over precedence) that a naive implementation could violate. The untouched `determinism`/`bag`
  suites confirm the piece stream is unperturbed.

## Verification checklist (Definition of Done)

- [ ] `npx tsc --noEmit` clean.
- [ ] `npm test` green (suite count = prior + new pause cases).
- [ ] `npm run lint` — 0 warnings, no React import in `lib/`.
- [ ] AC boxes satisfied: paused tick no-op ✓, toggle-twice equivalent ✓, gate+resume ✓.
- [ ] Two atomic commits, production before/with tests.

## Rollback / risk

- Additive change; revert is dropping the two `step` lines, the field, the default, the union member,
  and the test block. No data migration, no seam coupling. If the seam ticket (05-02) later needs a
  different toggle shape, the `Input` member name `"pause"` is the only contract to preserve.
