# T-007-06-01 — Research: surface-cleared-rows

## Ticket

Expose which row indices cleared on a lock (from `LineClearResult`) through the view so the
render layer can animate them before they collapse. Advances P2, P5.

AC: The view/state surfaces the cleared-row indices for the frame of a clear; a test asserts the
reported rows match the rows `clearLines` removed for a constructed full-row board (suite green).

This is the data-plumbing precursor to the sibling **T-007-06-02** (`row-flash-and-60fps-transitions`,
`depends_on: [T-007-06-01]`), whose AC is: "the animation is driven off the surfaced cleared-row
indices." So this ticket's only job is to *surface* the indices; the visual flash/transition is 06-02.

## The line that discards the indices today

`lib/line-clear.ts` is the origin. `clearLines(board)` (line 42):

```ts
const kept = board.filter((row) => row.some((cell) => cell === null));
const cleared = board.length - kept.length;
// ...prepend `cleared` fresh empty rows...
return { cleared, board: [...empties, ...kept] };
```

`filter` throws away the *index* of each removed row. The result type `LineClearResult` (line 28)
carries only `{ cleared: number; board: Board }`. The count survives; the positions do not. Nothing
downstream can reconstruct which rows were full — after collapse the board is already re-stacked.

The module is pure/framework-free (enforced by the `lib/**` eslint boundary). Copy-on-write
discipline: input never mutated, fresh outer array, independently-allocated empty rows (there is a
purity test asserting no row aliasing, `line-clear.test.ts:103`).

### Coordinate convention (load-bearing for the animation)

`types.ts` + `line-clear.ts` docstring: board is row-major `board[y][x]`, `y` grows **down** from a
top-left origin. The bottom of the well is the END of the outer array. Full rows are removed and
survivors restack toward higher indices; `cleared` fresh empty rows are prepended at low indices.

Consequence: the indices the animation wants are positions in the **pre-collapse** board — the board
`clearLines` was *given* (the just-merged, post-lock board), not the compacted board it returns. A
row that was full at `y=19` in the input is simply gone from the output. So the natural, only-correct
meaning of "cleared row indices" is *indices into `clearLines`'s input board*.

## The pipeline from clear → state → view

### `lib/game.ts` — the reducer (`descend`, line 156)

The single lock site. On a lock:

```ts
const { cleared, board } = clearLines(result.board);
const score = state.score + scoreFor(cleared, state.level);
const lines = state.lines + cleared;
// ...spawn next, gameOver check...
return { ...state, board, active, score, lines, gameOver, canHold: true };
```

`clearLines`'s input here is `result.board` — the board `applyGravity` returns with the locked piece
already merged, **before** collapse. That is exactly the pre-collapse board whose row indices the
animation needs. `descend` currently destructures only `cleared`; it discards the rest.

`GameState` (line 67) fields: `board, active, bag, score, lines, level, gameOver, paused, hold,
canHold`. No transient per-frame field exists yet. `createInitialState` (line 117) builds the initial
snapshot. `step` (line 213) is the reducer with these return shapes:

- `gameOver` gate → `return state` (same reference — **no-op contract**).
- `"pause"` → `{ ...state, paused: !state.paused }` (constructive; test asserts `.not.toBe(s)`).
- `state.paused` gate → `return state` (same reference — **no-op contract**, `game.test.ts:320,338`).
- `left/right/rotateCW/rotateCCW` → `{ ...state, active: <moved> }` (constructive; movement returns
  the *same active reference* when blocked, and `game.test.ts:66` asserts that no-op contract — but
  the outer state object is fresh either way).
- `hardDrop` → `descend({ ...state, active: hardDrop(...) })`.
- `softDrop`/`tick` → `descend(state)`.
- `hold` → `hold(state)`; `hold` (line 187) has a `!canHold` same-reference no-op (`game.test.ts:216`)
  and an otherwise-constructive `{ ...state, active, hold, canHold, gameOver }` return.

The **same-reference no-op contracts** (gameOver gate, paused gate, blocked-move active ref, second
hold) are asserted by tests and must be preserved by any change here.

### `lib/scoring.ts`

`scoreFor(lines, level)` consumes only the `cleared` **count**, not indices. Untouched by this ticket;
`descend` must keep passing `cleared` to it.

### `components/useGame.ts` — the React seam

`useGame` (line 86) holds the `GameState` and derives a render-ready `GameView` (line 68):
`{ state, view, ghost, queue, dispatch }`. `view` is `overlayPiece(state.board, state.active)` — the
**post-collapse** board with the next active piece overlaid, memoized on `state`. `ghost` and `queue`
are likewise derived and memoized on `state`; each re-derives every dispatch because `state` identity
changes. The hook reimplements no rules — it only exposes core outputs. This is the "view/state"
surface the AC refers to: adding a field here is how the render layer reads the indices.

Note the mismatch the animation (06-02) will have to reconcile: `view` is already collapsed, but the
cleared indices reference the pre-collapse board. Surfacing the indices is in scope; reconciling them
against the collapsed view is 06-02's animation concern.

### `components/GameContainer.tsx`

The client island wiring `useGame` → `Board`/overlays. Its header note already says "Locked cells and
cleared lines need no code here — they already flow through the composed `view`." It destructures
`{ state, view, ghost, queue, dispatch }`. It will be the eventual consumer of the new field (via
06-02), but this ticket need not change it.

## Existing test patterns to mirror

- `lib/line-clear.test.ts` — `fullRow(width, type)` helper builds full rows; `filled(board)` counts
  non-null cells. Existing describes: counts, collapse, non-adjacent, dimensions/extremes, purity.
  A new "cleared row indices" describe fits naturally beside these. This is the AC's primary test.
- `lib/game.test.ts` — `fillRowExcept` + a hand-placed `O` completes a bottom row; the reducer test
  at line 90 ("locking a piece that completes a row clears it and awards score") is the exact scenario
  to extend with a `clearedRows` assertion. Same-reference no-op tests live at 66/216/320/338.
- `components/useGame.queue.test.ts` — `renderHook` + `act` pattern for asserting the hook surfaces a
  core-derived field and tracks the pure core exactly. Template for a hook-level `clearedRows` test.

## Constraints & assumptions

- `lib/` stays pure/framework-free; copy-on-write; no mutation of inputs.
- `cleared` (count) must remain available for scoring — do not remove it.
- Same-reference no-op contracts must be preserved.
- "Frame of a clear" ⇒ the surfaced indices must be non-empty **only** on the step that cleared, and
  reset otherwise, or a stale flash would replay across subsequent frames.
- Indices are pre-collapse (input-board) positions, ascending, `y`-down.
