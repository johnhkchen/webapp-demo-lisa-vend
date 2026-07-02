# T-007-06-01 — Design: surface-cleared-rows

## Problem restated

`clearLines` knows which rows were full but throws the indices away in a `filter`. Plumb those
indices from `clearLines` → `GameState` → `useGame`'s view so 06-02 can animate the flash. Keep the
`lib/` purity, the `cleared` count for scoring, and the same-reference no-op contracts intact.

Three decisions: (D1) how `clearLines` reports indices, (D2) how the reducer carries them per-frame,
(D3) how the seam exposes them. Plus (D4) the test strategy.

---

## D1 — `clearLines` reports the removed row indices

### Options

- **A1a. Add `clearedRows: number[]` to `LineClearResult`, keep `cleared: number`.** Compute both in
  one pass; `cleared === clearedRows.length` by construction.
- **A1b. Replace `cleared` with `clearedRows`, derive the count at call sites** (`clearedRows.length`).
- **A1c. Return indices only from a new function**, leave `clearLines` alone.

### Decision: A1a

Add `clearedRows: number[]` alongside the existing `cleared`. Reasons grounded in research:

- `scoring.ts` and `game.ts` consume `cleared` directly, and `line-clear.test.ts` asserts `.cleared`
  in five places. A1b churns all of them for no behavioral gain; A1a is additive and keeps every
  existing assertion green.
- One function, one pass: the row scan already decides full-vs-survivor per row; recording the index
  on the "full" branch is free. A separate function (A1c) would scan twice and split a cohesive op.
- `cleared` stays the documented count for scoring; `clearedRows` is the positional detail. Documenting
  the invariant `cleared === clearedRows.length` makes the redundancy self-explaining, matching the
  codebase's habit of narrating intent in docstrings.

### Implementation shape

Swap the `filter` for an explicit split so the index is captured:

```ts
export interface LineClearResult {
  cleared: number;
  clearedRows: number[]; // ascending indices, in the INPUT (pre-collapse) board
  board: Board;
}

const clearedRows: number[] = [];
const kept: Board = [];
board.forEach((row, y) => {
  if (row.some((cell) => cell === null)) kept.push(row);
  else clearedRows.push(y);
});
const cleared = clearedRows.length;
```

Behavior is identical to the old `filter` (same survivors, same order, same fresh-empties prepend,
same copy-on-write — survivors carried by reference, empties freshly allocated). Indices are ascending
and reference the pre-collapse input board (the only reconstructable coordinate space — see research).

---

## D2 — the reducer carries the indices for exactly one frame

### Options

- **A2a. Add a transient `clearedRows: number[]` field to `GameState`**, populated on the clearing
  lock and reset to `[]` on every other constructive step.
- **A2b. Return the indices as a second value from `step`** (tuple / out-param). Breaks the
  `GameState -> GameState` reducer signature every caller and test depends on. Rejected.
- **A2c. Store on state but never reset** — let the consumer diff. Rejected: "frame of a clear"
  becomes ambiguous, and a stale array would re-trigger the flash on the next move/tick.

### Decision: A2a

`GameState` gains `clearedRows: number[]`. It is a *transient* per-step output (like a reducer's
"effect" channel), non-empty only on the step whose lock cleared rows, `[]` otherwise.

Where it is set:

- `descend` lock path: `clearedRows` straight from `clearLines` (naturally `[]` when a lock clears
  nothing, since `clearLines` returns `[]` — one code path covers clear and no-clear locks).
- `descend` non-lock path (`{ ...state, active }`): reset to `[]`.
- `hold` constructive path: `[]` (a hold never clears).
- `step` movement/rotation branches and the `"pause"` toggle branch: `[]`.
- `createInitialState`: `[]`.

Where it is **not** touched (preserving same-reference no-op contracts from research):

- `gameOver` gate `return state`, `paused` gate `return state`, `!canHold` hold no-op `return state`,
  blocked-move (movement returns same `active` ref — the outer `{ ...state, active }` is still fresh,
  and we add `clearedRows: []` there, which does not disturb the `active`-reference assertion).

Why reset in the movement/pause branches and not rely on the next descend: a clear at frame N sets the
field; if the player then moves left at N+1, `{ ...state, active }` would *carry over* the populated
array (spread copies it), replaying the flash until the next tick. Resetting in every constructive
branch guarantees a single-frame pulse. The reset is one extra property per branch — cheap and
explicit, matching how `descend` already re-enables `canHold` at the one lock site.

The no-op `return state` paths keep a possibly-stale array, but that is harmless: those paths run only
when the game is over, paused, or the hold is spent — no new clear, and the consumer's loop is gated
off in those states anyway.

---

## D3 — the seam exposes the field

### Options

- **A3a. Add `clearedRows: number[]` to `GameView`, value `state.clearedRows`.** Explicit surface
  alongside `ghost`/`queue`.
- **A3b. Do nothing in the hook** — `useGame` already returns `state`, so consumers can read
  `state.clearedRows`.

### Decision: A3a

Surface it explicitly on `GameView`. `state.clearedRows` is technically reachable via A3b, but the
sibling render inputs (`view`, `ghost`, `queue`) are all promoted to top-level `GameView` fields so
the render layer reads a flat, intentional surface rather than reaching into raw `state`. `clearedRows`
is a render input of the same kind (it exists *for* the animation), so it belongs at the same level.

No memo needed: `state.clearedRows` is already a stable reference produced by the reducer and changes
identity exactly when `state` does. `view`/`ghost`/`queue` are memoized only because they *compute*
something; this is a straight pass-through, so `clearedRows: state.clearedRows` in the returned object
is correct and cheapest.

`GameContainer` needs no change this ticket — it will destructure `clearedRows` when 06-02 wires the
animation. Leaving it out now keeps the diff to the surface that the AC names ("view/state surfaces").

---

## D4 — test strategy

Three levels, matching the three plumbing points; the AC's required test is the first.

1. **`lib/line-clear.test.ts`** (AC-primary): a new "cleared row indices" describe. Construct
   full-row boards at known indices and assert `clearLines(board).clearedRows` equals them —
   adjacent (bottom two → `[ROWS-2, ROWS-1]`), non-adjacent (`[17, 19]`, reusing the existing
   sandwich scenario), none (`[]`), and all rows (`[0..ROWS-1]`). Assert the invariant
   `cleared === clearedRows.length`.
2. **`lib/game.test.ts`**: extend the existing row-completion reducer scenario to assert the clearing
   `step` surfaces `clearedRows === [ROWS-1]`; assert a non-clearing `tick` and a lateral move both
   yield `clearedRows === []`; assert `createInitialState().clearedRows === []`.
3. **`components/useGame.clearedRows.test.ts`** (new, `renderHook` per the queue-test template):
   the hook surfaces `[]` initially and tracks the core — after a hard-drop that clears a
   pre-loaded row, `result.current.clearedRows` equals the core's `clearedRows`.

## Rejected globally

- Storing the pre-collapse **board** (not just indices) on state to feed the animation directly:
  out of scope. The AC asks for *indices*; 06-02 owns the animation and can reconstruct what it needs
  from indices + the two board snapshots. Surfacing a whole extra board now would over-fit an unbuilt
  consumer.

## Risks

- Forgetting a reset branch → a stale flash. Mitigated by D4 test 2's "resets to `[]`" assertions and
  by resetting in every constructive branch.
- Breaking a same-reference no-op contract → caught by existing `game.test.ts` (66/216/320/338), which
  we leave untouched.
