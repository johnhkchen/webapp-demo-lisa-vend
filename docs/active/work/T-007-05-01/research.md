# Research — T-007-05-01 pause-state-core

## Ticket in one line

Add a `paused` flag and a toggle `Input` to the pure core (`lib/game.ts`) so a paused game ignores
gravity ticks and movement while remaining resumable to an identical state. Advances P4, P5.
`depends_on: []` — nothing blocks it.

## The reducer this ticket modifies: `lib/game.ts`

`step(state: GameState, input: Input): GameState` is the single pure reducer. Its current shape:

```ts
export function step(state: GameState, input: Input): GameState {
  if (state.gameOver) return state;         // terminal: every input is a no-op
  switch (input) {
    case "left":     return { ...state, active: moveLeft(state.board, state.active) };
    case "right":    return { ...state, active: moveRight(state.board, state.active) };
    case "rotateCW": return { ...state, active: rotateCW(state.board, state.active) };
    case "rotateCCW":return { ...state, active: rotateCCW(state.board, state.active) };
    case "hardDrop": return descend({ ...state, active: hardDrop(state.board, state.active) });
    case "softDrop":
    case "tick":     return descend(state);
    case "hold":     return hold(state);
  }
}
```

Established structural facts relevant to pause:

- **A leading guard is the existing idiom.** `if (state.gameOver) return state;` is a full-input
  gate at the top: once set, *every* input returns the input reference unchanged. This is exactly
  the shape a pause gate needs, and it is already tested ("once game-over is set, further input is a
  no-op", both for `left` and `tick`, `game.test.ts:288`).
- **No-op contract = same reference.** Blocked lateral moves return the *same* `active` reference
  (`movement.ts` no-op contract), and the terminal `gameOver` guard returns the *same* `GameState`.
  Tests assert identity with `toBe` (e.g. `game.test.ts:71`, `:173`, `:220`, `:295`). A paused no-op
  should follow suit: `step(paused, "tick") === paused`.
- **`Input` is a string-literal union** (`types`/`game.ts:88`). Adding a member is additive; the
  `switch` is exhaustive over the union (no `default`), so a new case must be handled or `tsc` flags
  a non-exhaustive switch / unhandled member. This is a compiler-enforced safety net.
- **State is spread-copied every step** (`{ ...state, ... }`); the `bag` reference is preserved
  across every state (same live closure). Pause must not touch the bag — it advances no piece.

## The state shape: `GameState` (`lib/game.ts:62`)

```ts
export interface GameState {
  board; active; bag; score; lines; level; gameOver; hold; canHold;
}
```

- Every field is either data (`board`, scalars) or the live `bag`. Adding `paused: boolean` is a
  scalar flag, structurally identical to `gameOver` — the closest existing analogue.
- `createInitialState(seed)` builds the initial state literal (`:104`). A new flag needs a default
  there (`paused: false`), mirroring `gameOver: false`.
- Several tests construct partial states via `{ ...createInitialState(n), ...overrides }`
  (`game.test.ts:96`, `:198`, `:227`). Adding a defaulted field does not break them — spreads carry
  the default through. Tests that assert *equivalence* by deep-equality (`toEqual`) will now include
  `paused` on both sides, which is consistent and desirable.

## The AC decomposed

> step gates ticks/movement while paused and resumes cleanly; game.test.ts asserts a paused tick is
> a no-op and toggling twice returns an equivalent state (suite green).

Two concrete test obligations plus a behavioral contract:

1. **"paused tick is a no-op"** — `step(pausedState, "tick")` returns an unchanged state (same
   reference is the strongest form; deep-equal is the weakest acceptable). The gravity pipeline must
   not run: no descent, no lock, no bag draw, no score change.
2. **"toggling twice returns an equivalent state"** — `step(step(s, "pause"), "pause")` is deeply
   equal to `s` (`toEqual`). Toggle #1 sets `paused: true`; toggle #2 sets it back to `false`; all
   other fields untouched ⇒ deep-equal to the original. Note: not *reference*-equal (each toggle
   spreads a fresh object), so the assertion is `toEqual`, not `toBe`.
3. **"gates ticks/movement while paused and resumes cleanly"** — while paused, movement inputs
   (`left`/`right`/`rotate*`), drop inputs (`soft`/`hard`), `tick`, and `hold` are all no-ops;
   un-pausing restores exactly the pre-pause state so descent continues from the frozen piece.

## Scope boundary — where this ticket stops

- **Core only.** The sibling **T-007-05-02** (`pause-key-and-overlay`, `depends_on: [T-007-05-01]`)
  owns: binding **P**, halting the `requestAnimationFrame` gravity loop, and the `GameOverlay` pause
  UI. This ticket adds *only* the pure-core flag + input + gating + `game.test.ts` coverage. No
  React/seam changes.
- The `lib/**` eslint boundary forbids React/Next imports in `lib/`; a boolean flag + switch case
  are trivially framework-free.
- `components/useGame.ts` `dispatch(input)` is generic over `Input` (its doc notes adding drop
  inputs "needed no change here"). A new `"pause"` member flows through `dispatch` unchanged, so the
  seam ticket can dispatch `"pause"` without a core signature change — but wiring that is 05-02.

## Testing landscape

- Runner: `vitest run` (`npm test`), `vitest ^4.1.9`. Pure `lib/` suites use plain
  `describe/it/expect` (no jsdom). This ticket's tests are pure-core → `lib/game.test.ts`.
- Existing helpers in `game.test.ts` reusable here: `fillRowExcept`, `tickUntilGameOver`,
  `fillTopCenter`, and the `{ ...createInitialState(n), ...overrides }` construction idiom.
- Precedent for a no-op assertion: `expect(step(ended, "tick")).toBe(ended)` (`:296`). The paused
  analogue: `expect(step(paused, "tick")).toBe(paused)`.
- Precedent for equivalence: hard-drop-vs-tick uses `toEqual` on `board`/`active` (`:146`). The
  toggle-twice test uses `toEqual` on the whole state.

## Assumptions & constraints

- **Interaction with `gameOver`.** `gameOver` is terminal and its guard runs first today. Decision
  deferred to Design: should `"pause"` be honored after game-over? Leaning no — a finished game is
  not "running", and keeping the `gameOver` guard first preserves the existing "every input is a
  no-op once over" contract without a special-case.
- **Pause does not touch the bag / determinism.** No piece is drawn or spawned on pause; same seed +
  same input sequence (with `pause`/`pause` inserted) yields an identical stream. `determinism.test`
  is unaffected.
- **`paused` is serializable** (a plain boolean), unlike the live bag — no new serialization concern.
- **Toggle vs. explicit set.** The ticket says "a toggle Input". One `"pause"` member that flips the
  flag (vs. separate `"pause"`/`"resume"`) — the exact alphabet choice is a Design decision.

## Open questions for Design

1. Toggle semantics: a single `"pause"` that flips `paused`, vs. explicit `"pause"`/`"resume"`.
2. Where the pause gate sits relative to the `gameOver` guard and the `switch`, and whether the
   `"pause"` case lives in the `switch` or as an early guard.
3. Whether a paused no-op must return the *same reference* (`toBe`) or merely deep-equal — and how
   that reconciles with the AC's "equivalent state" wording for toggle-twice.
