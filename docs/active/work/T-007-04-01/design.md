# Design — T-007-04-01 surface-upcoming-queue

## Goal

Widen `useGame`'s `GameView` with a `queue: TetrominoType[]` — the next N upcoming tetromino ids,
sourced from the live bag's non-consuming `peek(N)` — so components (the sibling `NextPreview`
ticket) can render the lookahead **without ever touching the live bag**. Prove with a test that the
surfaced queue matches subsequent spawns for a fixed seed.

## Design questions & decisions

### Q1 — How to read the lookahead from state

**Option A (chosen): a pure core accessor `upcomingPieces(state, n)` in `lib/game.ts`, memoized in
the hook.**

```ts
// lib/game.ts
export function upcomingPieces(state: GameState, n: number): TetrominoType[] {
  return state.bag.peek(n);
}
```

```ts
// components/useGame.ts
const queue = useMemo(() => upcomingPieces(state, PREVIEW_COUNT), [state]);
```

- **Pros**: mirrors the established seam pattern *exactly* — `view ← overlayPiece`,
  `ghost ← ghostCells`, `queue ← upcomingPieces`, each a pure `lib/` function memoized on `[state]`.
  "How you read lookahead from a `GameState`" becomes a named, framework-free, unit-testable core
  concept rather than an ad-hoc reach into `state.bag` scattered across the render layer. It gives
  the AC's "matches subsequent spawns" property a home that can be tested without React. The
  accessor documents the read-only contract at the core boundary (the ticket's whole point:
  "without touching the live bag").
- **Cons**: a one-line wrapper over `state.bag.peek`. Marginal indirection.

**Option B (rejected): inline `state.bag.peek(PREVIEW_COUNT)` in the hook memo.**
Fewer lines, but it breaks the symmetry with `view`/`ghost` (both go through a named pure helper),
and it puts a direct `state.bag.*` reach in the render layer — the exact coupling the ticket frames
as "touching the live bag." Rejected: the wrapper's clarity and testability-in-isolation are worth
one line.

**Option C (rejected): store the queue as a field on `GameState`, populated by `step`.**
Would make the core carry derived, redundant state (the bag already *is* the source of truth), add
a new field to every `{ ...state }` spread and to the determinism `Snapshot`, and risk drift if the
stored queue and the live bag disagree. `peek` is O(n) and cheap; deriving on read is strictly
simpler and cannot desync. Rejected as over-engineering that contradicts the bag's design intent.

### Q2 — Where the preview-count constant lives, and its value

**Decision: `export const PREVIEW_COUNT = 5;` in `components/useGame.ts`.**

The window size is a UI/feel policy — how many next pieces the HUD shows — not a rule of the pure
core. `useGame.ts` already owns exactly this class of seam constant (`DEFAULT_SEED`,
`GRAVITY_INTERVAL_MS`) with a documented rationale that feel/UI decisions stay out of
`lib/constants.ts`. Placing it there keeps `lib/` policy-free and lets the sibling render ticket
import one authoritative number.

Value **5**: the modern guideline standard shows up to 5 next pieces; it's a well-understood default
and small enough that eager buffer growth in `peek` is trivial (≤ ⌈5/7⌉ = 1 extra bag generated).
It is exported so `NextPreview` (T-007-04-02) renders exactly as many slots as are surfaced — no
magic-number drift between data and view.

### Q3 — Test strategy for "queue matches subsequent spawns"

Two layers, matching the repo's existing split:

1. **Pure core test (`lib/game.test.ts`)** — `upcomingPieces`:
   - `upcomingPieces(state, n)` equals the types of the next `n` spawned pieces. Build a fresh
     `createInitialState(seed)`, capture `q = upcomingPieces(s, N)`, then fold `step(_, "hardDrop")`
     N times, collecting each resulting `state.active.type`; assert the collected spawn types equal
     `q`. (`hardDrop` → immediate lock + spawn, so each drop consumes exactly one bag id = one queue
     entry.)
   - Non-mutation: capture `upcomingPieces(s, N)` twice in a row on the same state and assert the
     stream is unaffected — reading the queue does not advance the bag (calling `step` afterward
     still yields the same first spawn). This nails the "without touching the live bag" contract.
   - Edge: `upcomingPieces(s, 0)` → `[]`.

2. **Hook test (new `components/useGame.queue.test.ts`, jsdom)** — the AC surface literally says
   "useGame's view exposes...", so assert at the hook:
   - `renderHook(() => useGame(DEFAULT_SEED))`; read `result.current.queue`; assert
     `queue.length === PREVIEW_COUNT`.
   - Drive `PREVIEW_COUNT` `dispatch("hardDrop")`s via `act`; after each, assert the new
     `state.active.type` equals the corresponding entry of the **originally captured** queue — i.e.
     the surfaced queue predicted the spawn order.
   - Cross-check against the pure core (repo idiom "no rules reimplemented in the hook"):
     independently drive `step(_, "hardDrop")` from the same seed and compare.

Guard against top-out: `PREVIEW_COUNT = 5` hard-drops stack pieces at the board floor; 5 pieces
cannot reach the spawn rows on an empty `COLS×ROWS` board, so no `gameOver` interrupts the spawn
sequence. (If this ever changed, the test would surface it as a real regression, not flake.)

## Chosen shape (summary)

- `lib/game.ts`: add pure `upcomingPieces(state: GameState, n: number): TetrominoType[]` =
  `state.bag.peek(n)`, with a doc comment stating the read-only / non-consuming contract.
- `components/useGame.ts`: add `export const PREVIEW_COUNT = 5`; add `queue: TetrominoType[]` to
  `GameView`; derive `queue` via `useMemo(() => upcomingPieces(state, PREVIEW_COUNT), [state])`;
  return it.
- Tests: extend `lib/game.test.ts`; add `components/useGame.queue.test.ts`.

## Invariants preserved

- **Read-only**: `peek` is non-consuming, so surfacing the queue cannot advance the stream or break
  determinism (`determinism.test.ts` stays green — no change to `step`/spawn order).
- **Seam pattern**: `queue` joins `view`/`ghost` as a pure-helper-derived, `state`-memoized
  projection — no rules reimplemented in the hook.
- **Additive `GameView`**: existing consumer `GameContainer` destructures by name; unaffected.
- **`lib/` purity**: `upcomingPieces` imports nothing from React/Next; it only reads the bag.

## Explicitly out of scope

- Rendering the queue (`NextPreview` component) — sibling ticket **T-007-04-02**.
- Any change to bag/`peek` semantics (delivered by T-007-01-01).
- Making the window size dynamic/level-scaled — not needed; a single exported constant suffices.
