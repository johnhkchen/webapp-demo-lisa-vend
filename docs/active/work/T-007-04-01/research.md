# Research — T-007-04-01 surface-upcoming-queue

## Ticket in one line

Surface the bag's lookahead into the render-ready view (`useGame`'s `GameView`) so components can
read the next N upcoming tetromino ids **without touching the live bag**. Advances P4, P5. Depends
on T-007-01-01 (which is `done`).

## The dependency that unblocks this: `lib/bag.ts` (T-007-01-01)

`SevenBag` already exposes the exact primitive this ticket needs:

```ts
export interface SevenBag {
  next(): TetrominoType;         // draw + consume
  peek(n: number): TetrominoType[]; // reveal next n WITHOUT consuming
}
```

Established, tested properties of `peek` (from `bag.ts` doc + `bag.test.ts`):

- **Non-consuming**: draws after a peek are identical to draws without it. `peek` and `next` read
  one materialized `buffer`; `rand` is advanced only when the buffer grows. So `peek` can never
  desynchronize from `next`.
- **Agreement**: `peek(n)` equals the ids the following `n` `next()` calls return, for any seed and
  any interleaving.
- **Total / forgiving**: `n <= 0` → `[]`; returns a **fresh array** (`slice`), never the internal
  buffer, so a caller mutating the result cannot corrupt bag state.
- Return length is exactly `n` for `n >= 0` (buffer grown to satisfy `n`).

This is precisely a read-only lookahead accessor — no new bag work is required.

## Where the bag lives at runtime: `lib/game.ts`

- `GameState` carries the **live** bag as `bag: SevenBag` (a closure whose `next()` mutates internal
  state). The module's purity note is explicit: advancing the bag on spawn is the one intentional
  side effect `step` performs.
- The bag is advanced in exactly two places:
  - `descend()` — on lock: `spawnPiece(state.bag.next(), width)`.
  - `hold()` — only on the empty-slot path: `state.hold ?? state.bag.next()`.
- `step` returns `{ ...state, ... }`, so the **bag reference is preserved across every state**
  (lateral moves, ticks, locks all share the same live closure). State *identity* changes on every
  `step` (new object spread), but `state.bag === prevState.bag`.
- `createInitialState(seed)` draws the **first** piece immediately (`spawnPiece(bag.next(), COLS)`),
  so at t=0 `state.active` is piece #0 and `bag.peek(n)` is pieces #1..#n (the true "upcoming").

Consequence for this ticket: reading `state.bag.peek(N)` at any state yields the ids that the next
`N` spawns will use — this is the "matches subsequent spawns" property the AC asserts.

## The render seam: `components/useGame.ts`

`useGame(seed)` is the thin React holder for the pure core. It:

- Holds `GameState` in `useState(() => createInitialState(seed))` (lazy — bag/spawn run once).
- Derives read-ready values with `useMemo(..., [state])`:
  - `view = overlayPiece(state.board, state.active)` — settled board + active overlaid.
  - `ghost = ghostCells(state.board, state.active)` — translucent landing marker cells.
- Exposes a stable `dispatch(input) = setState(s => step(s, input))` (functional update, no `state`
  dep, referentially stable).
- Returns `GameView { state, view, ghost, dispatch }`.

**Established pattern**: every render-ready projection is a pure `lib/` function memoized on
`state`. `view` ← `overlayPiece`, `ghost` ← `ghostCells`. This ticket adds a third of the same
shape: an upcoming-queue projection ← a pure lookahead read, memoized on `state`.

Memoization correctness note: because `state` identity changes on every `dispatch`, a `useMemo`
keyed on `[state]` recomputes after every input — including the lock/hold steps that advance the
bag — so a peek-derived queue stays current. Lateral moves recompute too but peek returns the same
ids (bag unchanged), which is correct.

## Consumers of `useGame` — impact of widening `GameView`

- `components/GameContainer.tsx` destructures `{ state, view, ghost, dispatch }` explicitly. Adding
  a `queue` field is additive; it will not break this consumer (no consumer spreads or index-maps
  the return object).
- No other component reads `useGame` today. The eventual `NextPreview` render is the sibling ticket
  **T-007-04-02** (story S-007-04 has two tickets); this ticket stops at *surfacing* the data.

## Testing landscape

- Runner: `vitest run` (`npm test`); `vitest ^4.1.9`.
- Pure `lib/` suites: plain `describe/it/expect` (e.g. `lib/game.test.ts`, `lib/determinism.test.ts`).
- Hook suites: `// @vitest-environment jsdom` + `@testing-library/react`'s `renderHook`/`act`
  (`components/useGame.gravity.test.ts`). Existing pattern: drive the hook via `dispatch`, and
  cross-check against an independently-driven pure core from the same seed ("no rules reimplemented
  in the hook").
- `lib/determinism.test.ts` shows the idiom for probing bag position: `drawIds(state, n)` draws the
  next `n` ids from a run's bag to compare stream position. Same-seed + same-input ⇒ identical
  stream is the keystone property this queue rides on.

## Constants / conventions

- No preview-count constant exists yet. `useGame.ts` already owns seam-level constants
  (`DEFAULT_SEED`, `GRAVITY_INTERVAL_MS`) with the rationale that feel/UI policy lives in the seam,
  not the pure core. A preview window size (how many next pieces to surface) is exactly such a UI
  policy → it belongs in the seam, not `lib/constants.ts`.
- `TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L"` (`lib/types.ts`).

## Assumptions & constraints

- The `lib/**` eslint boundary forbids React/Next imports in `lib/`. Any pure helper added to
  `game.ts` must stay framework-free (a `state.bag.peek(n)` read qualifies).
- `peek` is read-only, so surfacing it cannot desync the piece stream or violate determinism.
- The number of pieces surfaced (N) is a caller/UI decision; the primitive already supports any N.
- No serialization concern here — the queue is derived, never stored.

## Open questions for Design

1. Add a pure core accessor (`upcomingPieces(state, n)`) vs. call `state.bag.peek(n)` inline in the
   hook memo.
2. Where the preview-count constant lives and its value.
3. Test placement: pure `lib/game.test.ts`, a new hook test, or both — and how to assert "matches
   subsequent spawns."
