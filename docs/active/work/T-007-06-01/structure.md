# T-007-06-01 — Structure: surface-cleared-rows

Blueprint for the change. Four source edits (line-clear, game, useGame) + three test files. No files
created in `lib/`; one new test file under `components/`. Nothing deleted.

## Files

| File | Action | What |
|------|--------|------|
| `lib/line-clear.ts` | modify | Add `clearedRows: number[]` to `LineClearResult`; compute it in `clearLines`. |
| `lib/game.ts` | modify | Add `clearedRows: number[]` to `GameState`; set/reset it across the reducer paths + `createInitialState`. |
| `components/useGame.ts` | modify | Add `clearedRows: number[]` to `GameView`; pass through `state.clearedRows`. |
| `lib/line-clear.test.ts` | modify | New "cleared row indices" describe (AC-primary). |
| `lib/game.test.ts` | modify | Assert reducer surfaces + resets `clearedRows`; initial state `[]`. |
| `components/useGame.clearedRows.test.ts` | create | Hook surfaces + tracks-core test. |

## `lib/line-clear.ts`

### Public interface change

```ts
export interface LineClearResult {
  cleared: number;          // unchanged — count consumed by scoring; === clearedRows.length
  clearedRows: number[];    // NEW — ascending indices in the INPUT (pre-collapse) board
  board: Board;             // unchanged — compacted result
}
```

### Body

Replace the `filter`/length-diff with a single `forEach` split that records the index on the full-row
branch (see design D1). Update the docstring: the result now also carries the pre-collapse indices,
`cleared === clearedRows.length`, and note that indices reference the *input* board (the coordinate
space that survives — the output board no longer contains those rows). Copy-on-write and dimension
guarantees are unchanged.

## `lib/game.ts`

### `GameState` (interface, ~line 67)

Add field + docstring note describing it as a **transient per-frame** output: the indices of rows the
last `step` cleared, non-empty only on that frame, `[]` on every other step. Reference the y-down,
pre-collapse coordinate convention and name T-007-06-02 as the consumer.

```ts
export interface GameState {
  // ...existing...
  canHold: boolean;
  clearedRows: number[]; // NEW: rows cleared THIS step (pre-collapse indices); [] otherwise
}
```

### `createInitialState` (~line 117)

Add `clearedRows: []` to the returned object.

### `descend` (~line 156)

- Destructure `clearedRows` from `clearLines`: `const { cleared, clearedRows, board } = clearLines(...)`.
- Lock return: add `clearedRows` (the array from `clearLines` — `[]` for a no-clear lock).
- Non-lock early return `{ ...state, active: result.piece }`: add `clearedRows: []`.
- Docstring: note it surfaces the cleared indices on the lock and clears them otherwise.

### `hold` (~line 187)

Constructive return: add `clearedRows: []`. (The `!canHold` early `return state` stays untouched.)

### `step` (~line 213)

- `"pause"` toggle return: add `clearedRows: []`.
- `left`/`right`/`rotateCW`/`rotateCCW` returns: add `clearedRows: []`.
- `hardDrop`/`softDrop`/`tick` → `descend` (already handled inside `descend`).
- `hold` → `hold` (handled there).
- The `gameOver` gate and `paused` gate `return state` lines stay **unchanged** (same-reference no-op
  contracts).

Update the `step` docstring's pause paragraph area only if needed; the key note is that constructive
branches reset `clearedRows` so the surface pulses for exactly one frame.

## `components/useGame.ts`

### `GameView` (interface, ~line 68)

```ts
export interface GameView {
  state: GameState;
  view: Board;
  ghost: Point[];
  queue: TetrominoType[];
  clearedRows: number[]; // NEW: rows cleared this frame (pre-collapse indices), for the flash
  dispatch: (input: Input) => void;
}
```

Docstring: add `clearedRows` to the enumerated returns, noting it is a straight pass-through of
`state.clearedRows` (no compute → no memo) surfaced for the render layer's clear animation (06-02).

### `useGame` return (~line 98)

`return { state, view, ghost, queue, clearedRows: state.clearedRows, dispatch };`

No new `useMemo` — it is a reference already produced by the reducer.

## Test files

### `lib/line-clear.test.ts` (append a describe)

`describe("clearLines — cleared row indices")` with `it`s:
- adjacent bottom two full → `clearedRows` = `[ROWS-2, ROWS-1]`.
- non-adjacent (rows 17 & 19 full, 18 partial) → `[17, 19]`; survivor preserved (reuse existing setup).
- no full rows → `[]`.
- entirely full board → `[0 .. ROWS-1]`.
- invariant: `cleared === clearedRows.length` on a mixed board.

### `lib/game.test.ts` (append)

- Extend/duplicate the "completes a row clears it" scenario: after the clearing `step`, assert
  `s.clearedRows` toEqual `[ROWS - 1]`.
- A non-clearing `tick` (piece still falling) → `clearedRows` toEqual `[]`.
- A lateral move on a fresh state → `clearedRows` toEqual `[]`.
- `createInitialState(seed).clearedRows` toEqual `[]`.

### `components/useGame.clearedRows.test.ts` (new)

`// @vitest-environment jsdom`, `renderHook`/`act`/`cleanup` per the queue-test template:
- initial `result.current.clearedRows` toEqual `[]`.
- drive a clear (build a hook whose first piece/board completes a row on hard-drop, or step a
  parallel core the same way) and assert `result.current.clearedRows` equals the core's
  `step(...).clearedRows` — proving pass-through, no hook-local rules.

## Ordering

1. `lib/line-clear.ts` + its test (self-contained; AC-primary; commit).
2. `lib/game.ts` + its test (depends on 1's new field; commit).
3. `components/useGame.ts` + its test (depends on 2's `GameState` field; commit).

Each step is independently green and atomically committable. `npm run build` + full `vitest` after 3.
