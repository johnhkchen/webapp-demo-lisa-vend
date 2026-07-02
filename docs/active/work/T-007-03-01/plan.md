# Plan — T-007-03-01 hold-slot-core

## Overview

One production file (`lib/game.ts`) and its test (`lib/game.test.ts`), one atomic commit.
The logic is small; the substance is the test suite proving the three AC clauses (stash/swap,
second-hold no-op, flag-resets-on-lock). Verify with `npm test`, `npm run lint`,
`npm run build`.

## Steps

### Step 1 — Edit `lib/game.ts`

Apply the five edits from structure.md in order:

1. `import type { Board, Piece, TetrominoType } from "./types";` (add `TetrominoType`).
2. `GameState`: add `hold: TetrominoType | null` and `canHold: boolean` with JSDoc.
3. `Input`: add `"hold"`; extend the union JSDoc to describe it.
4. `createInitialState`: return `…, hold: null, canHold: true`.
5. `descend`: add `canHold: true` to the lock/spawn return only (leave the falling return
   untouched).
6. Add the private `hold(state)` helper and the `case "hold": return hold(state);` branch.

Verify: `npm run lint` (no unused imports, purity boundary), `npx tsc --noEmit` if available
(the exhaustive `switch` now type-checks with the new member handled).

### Step 2 — Add tests to `lib/game.test.ts`

New `describe("hold slot", …)` block. Cases:

**First hold — empty slot (stash + draw):**
1. From `createInitialState(1)`, capture `activeType = s.active.type`. `h = step(s, "hold")`.
   Assert `h.hold === activeType`, `h.canHold === false`, and `h.active.type !==` … well,
   the incoming is a fresh bag draw — assert `h.active` is a spawn-position piece
   (`rotation === 0`, `position.y === 0`) so we know it re-spawned fresh, and
   `h.active.type` equals the bag's next id. To pin the drawn id deterministically, build a
   sibling `createInitialState(1)`, advance nothing, and compare against
   `createSevenBag(1)`… simpler: assert structural freshness (`rotation 0`, `y 0`) rather
   than the exact type, since the type is "whatever the queue deals." Keep it behavioral.

**First hold — occupied slot (swap, no bag draw):**
2. Set up a state with a known `hold` and known `active.type` (via
   `{ ...createInitialState(1), hold: "T", active: { type: "L", rotation: 0, position: {…} } }`,
   `canHold: true`). `h = step(s, "hold")`. Assert `h.active.type === "T"` (held piece came
   back), `h.active.rotation === 0` and `h.active.position` is the spawn column (fresh, not
   the old L's position), `h.hold === "L"` (active went to hold), `h.canHold === false`.
3. **No bag draw on swap**: build two sibling games from the same seed. On game A, do the
   occupied-hold swap; on game B, do nothing to the bag. Assert `A.bag.peek(1)` equals
   `B.bag.peek(1)` — the swap did **not** advance the queue. (Guards the `??` short-circuit.)

**Second hold before lock is a no-op:**
4. `s1 = step(createInitialState(1), "hold")` (now `canHold === false`).
   `s2 = step(s1, "hold")`. Assert `s2 === s1` (same reference — the `if (!canHold)` guard),
   and `s2.hold === s1.hold`, `s2.active === s1.active`.

**Flag resets on lock:**
5. Take a state that will lock on the next `tick` (place `active` one row above the floor,
   `canHold: false`). `after = step(s, "tick")`. Assert the piece locked (settled cells
   appeared / a new piece spawned) and `after.canHold === true`. Reuse the
   `fillRowExcept`/low-placement pattern from the existing descent tests.
6. **Hold again works after the reset**: from case 5's `after`, `step(after, "hold")`
   succeeds (returns a *different* reference, `canHold === false` again) — proving the reset
   actually re-enabled hold, not just flipped a bool no one reads.

**Reset also happens via hard-drop:**
7. From `{ ...createInitialState(1), canHold: false }`, `step(s, "hardDrop")` locks and
   spawns; assert `after.canHold === true` (hard-drop routes through `descend`, so the reset
   is shared, not duplicated).

**Interaction with game-over:**
8. From an ended game (`tickUntilGameOver(...)`), assert `step(ended, "hold") === ended`
   (the `gameOver` short-circuit covers `"hold"` for free).

**Non-mutation / determinism:**
9. Snapshot the input state's `board` reference and `active` before a hold; assert the hold
   returns a fresh state without mutating the input's `active` (`s.active` unchanged) or
   board reference identity where applicable.

### Step 3 — Full verification

- `npm test` — all suites green, including the new block and every pre-existing case
  (`GameState`'s new required fields must not break any existing construction; all existing
  states are built via `createInitialState` spreads, so they inherit defaults).
- `npm run lint` — clean.
- `npm run build` — production build passes (the `Input` union change compiles end-to-end).

## Testing strategy

- **Unit only** — this is pure `lib/` logic; no integration/render surface (that is
  T-007-03-02). All assertions are on `GameState` transitions via `step`.
- **Determinism hazard**: the empty-hold path draws from the shared mutable bag. Tests that
  compare two games must use **separate** `createInitialState` calls (never share one state's
  bag across two logical games) — the existing hard-drop suite documents this exact trap.
- **Reference-identity contracts**: the second-hold and game-over no-ops assert `toBe` (same
  reference); the successful holds assert value equality and field-by-field expectations.
- **Coverage of the subtle line**: case 3 (no bag draw on swap) specifically guards the `??`
  short-circuit — the single most bug-prone line in the change.

## Risks & mitigations

- *Risk*: an existing test constructs a `GameState` literal without the new fields → type
  error. *Mitigation*: structure.md confirms all sites use `{ ...createInitialState(...) }`
  spreads; `npx tsc`/`npm run build` catches any stragglers.
- *Risk*: swap accidentally advances the bag. *Mitigation*: case 3 asserts `peek` equality.
- *Risk*: flag reset placed on the wrong `descend` branch (resets on a non-locking tick).
  *Mitigation*: case 5 + a check that a mid-air `tick` leaves `canHold` unchanged (add to
  case 5 or as a sub-assertion).

## Commit

One commit: `feat(game): add hold slot + once-per-drop lock flag to step`.
