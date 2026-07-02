# Review — T-007-05-01 pause-state-core

## What was asked

Add a `paused` flag and a toggle `Input` to the pure core so a paused game ignores gravity ticks and
movement while remaining resumable to an identical state. **AC:** `step` gates ticks/movement while
paused and resumes cleanly; `game.test.ts` asserts a paused tick is a no-op and toggling twice
returns an equivalent state (suite green).

## What changed

### Production code — `lib/game.ts` (commit `ca82063`)

- **`GameState`** gained `paused: boolean` (after `gameOver`). Documented as a *resumable
  running-state* flag, explicitly contrasted with terminal `gameOver`.
- **`createInitialState`** defaults `paused: false` — a new game is running.
- **`Input`** gained `"pause"`; the union doc describes toggle semantics, that it is honored only
  while the game is running, and that it never touches the bag.
- **`step`** gained two lines above the `switch`, in this order:
  ```ts
  if (state.gameOver) return state;                       // existing terminal guard
  if (input === "pause") return { ...state, paused: !state.paused };  // toggle — always resumable
  if (state.paused) return state;                         // gate — swallow all other inputs
  ```
  The `switch` body is unchanged. TypeScript narrows `input` past the `"pause"` early-return, so the
  `switch` remains exhaustive over the remaining members without a `"pause"` case (`tsc` clean).

### Tests — `lib/game.test.ts` (commit `2d95005`)

New `describe("pause (AC)", …)`, eight cases:

1. `"pause"` toggles the flag on then off.
2. **(AC)** a paused `tick` is a no-op — `toBe(paused)` (same reference ⇒ nothing ran) + `y`
   unchanged.
3. **(AC)** toggling twice → `toEqual(s)` and `not.toBe(s)` (resumes identical, fresh object).
4. every play input (`left/right/rotateCW/rotateCCW/softDrop/hardDrop/tick/hold`) is a
   same-reference no-op while paused — proves one leading gate covers the whole alphabet.
5. clean resume — pause → paused-tick → resume → tick drops the piece exactly one row and the
   `active` equals an uninterrupted `step(s, "tick").active`.
6. pausing consumes no bag draw — `step(s,"pause").bag.peek(3)` equals a same-seed sibling's
   `peek(3)`.
7. a paused `hold` doesn't spend the once-per-drop allowance (`canHold` stays `true`).
8. `"pause"` is a no-op once `gameOver` is set.

## Test coverage assessment

- **AC directly covered.** "paused tick is a no-op" = case 2 (strongest form, `toBe`). "toggling
  twice returns an equivalent state" = case 3 (`toEqual`). "gates ticks/movement while paused and
  resumes cleanly" = cases 4 (gate breadth) + 5 (clean resume matches uninterrupted descent).
- **Invariants pinned.** Cases 6–8 lock the non-obvious guarantees a naive implementation could
  break: no bag draw on toggle, no hold-allowance spend, and game-over precedence over pause.
- **Regression safety.** Full suite **221/221** green. `determinism.test.ts` and `bag.test.ts`
  unchanged and passing — confirming the toggle/gate never perturbs the piece stream. Existing tests
  that build states via `{ ...createInitialState(n), ...overrides }` inherit `paused: false`
  transparently; none regressed.
- **Gates.** `npx tsc --noEmit` clean; `npm run lint` 0 warnings (no React import in `lib/`).

### Gaps / not covered (intentional)

- **No seam/DOM test.** Key binding (P), rAF-loop halt, and the `GameOverlay` pause UI are the
  sibling ticket **T-007-05-02** (`depends_on: [T-007-05-01]`). This ticket is core-only; its AC
  lives entirely in `lib/game.test.ts`.
- **Pause interaction with an in-flight lock** isn't a distinct case because pause is a pure gate on
  `step` inputs — there is no timing/lock-delay state in the core to interfere with (lock happens
  synchronously within a single `tick`/`hardDrop`, never across pause).

## Open concerns / notes for a reviewer

- **Ordering is the design.** The three guards must stay in the order `gameOver` → `pause` →
  `paused`. If the paused gate moved above the toggle, a paused game would swallow `"pause"` and
  deadlock (unresumable); case 5 would catch it. If the toggle moved above the `gameOver` guard, a
  finished game could be paused; case 8 would catch it. Both are asserted, so the ordering is locked
  by tests.
- **Same-reference no-op contract.** Paused non-toggle inputs return the input state object (matches
  the reducer's existing `gameOver`/blocked-move identity contract). The toggle path allocates a
  fresh object (the flag must change) — hence toggle-twice is `toEqual`, not `toBe`. This distinction
  is intentional and tested.
- **Serialization.** `paused` is a plain boolean — no new serialization concern (unlike the live
  `bag`). Save/replay work is unaffected.

## Verdict

AC met, suite green (221/221), additive and pattern-consistent (mirrors the `gameOver` guard idiom).
No blocking issues. Ready for the sibling ticket T-007-05-02 to bind P, halt the gravity loop on
`state.paused`, and render the pause overlay.
