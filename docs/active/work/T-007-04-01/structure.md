# Structure — T-007-04-01 surface-upcoming-queue

Blueprint of file-level changes. No code — the shape of the code.

## Files touched

| File | Change | What |
|------|--------|------|
| `lib/game.ts` | modify | add pure `upcomingPieces(state, n)` accessor |
| `components/useGame.ts` | modify | add `PREVIEW_COUNT`, widen `GameView` with `queue`, derive it |
| `lib/game.test.ts` | modify | tests for `upcomingPieces` (spawn match, non-mutation, edge) |
| `components/useGame.queue.test.ts` | **create** | hook test: `queue` matches subsequent spawns |

No files deleted. No changes to `lib/bag.ts` (primitive already delivered), `lib/constants.ts`
(window size is UI policy), or `GameContainer.tsx` (additive `GameView` field).

## 1. `lib/game.ts` — new pure accessor

Public surface addition (framework-free; `lib/**` boundary intact):

```ts
/**
 * The next `n` upcoming tetromino ids the game will spawn, read from the live bag **without
 * consuming them** (`SevenBag.peek`). Read-only: calling this never advances the stream, so a
 * render layer can surface the lookahead without desyncing the piece sequence. `n <= 0` → `[]`.
 * The returned ids are exactly the types the next `n` spawns will use, in order.
 */
export function upcomingPieces(state: GameState, n: number): TetrominoType[];
// body: return state.bag.peek(n);
```

- `TetrominoType` is already imported in `game.ts`.
- Placement: after `createInitialState`, alongside the other top-level state helpers (before the
  internal `descend`/`hold`, or at the end near `step` — pick the read-accessor grouping). It is an
  exported, standalone read; no wiring into `step`.

## 2. `components/useGame.ts` — surface the queue

Three additive edits:

**(a) New exported constant** (next to `DEFAULT_SEED` / `GRAVITY_INTERVAL_MS`, with a doc comment
mirroring their "seam owns UI/feel policy" rationale):

```ts
export const PREVIEW_COUNT = 5;
```

**(b) Widen `GameView`**:

```ts
export interface GameView {
  state: GameState;
  view: Board;
  ghost: Point[];
  queue: TetrominoType[]; // next PREVIEW_COUNT upcoming ids (peek — never consumes the bag)
  dispatch: (input: Input) => void;
}
```

**(c) Derive + return** inside `useGame`, next to the `view`/`ghost` memos:

```ts
const queue = useMemo(() => upcomingPieces(state, PREVIEW_COUNT), [state]);
...
return { state, view, ghost, queue, dispatch };
```

Import updates:
- add `upcomingPieces` to the existing `import { ... } from "@/lib/game"`.
- add `TetrominoType` to the existing `import type { ... } from "@/lib/types"`.

## 3. `lib/game.test.ts` — pure-core coverage

Add a `describe("upcomingPieces", ...)` block:

- **matches subsequent spawns**: from `createInitialState(seed)`, capture `q = upcomingPieces(s, N)`;
  fold `step(_, "hardDrop")` N times collecting each `state.active.type`; assert equals `q`.
- **non-consuming / read-only**: two back-to-back `upcomingPieces(s, N)` calls return equal arrays,
  and a `step(s, "hardDrop")` afterward still spawns `q[0]` — reading did not advance the bag.
- **returns a fresh array**: mutating the result does not affect a subsequent call (guards against
  buffer aliasing at the accessor level; `peek` already slices, this pins the contract).
- **edge**: `upcomingPieces(s, 0)` → `[]`.

Use a fixed seed (e.g. the suite's existing seed convention) so assertions are deterministic.

## 4. `components/useGame.queue.test.ts` — hook coverage (new file)

Header + imports (mirror `useGame.gravity.test.ts`):

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useGame, DEFAULT_SEED, PREVIEW_COUNT } from "@/components/useGame";
import { createInitialState, step } from "@/lib/game";
afterEach(cleanup);
```

Tests:

- **exposes a queue of PREVIEW_COUNT ids**: `renderHook(() => useGame(DEFAULT_SEED))`;
  `expect(result.current.queue).toHaveLength(PREVIEW_COUNT)`.
- **queue predicts spawn order**: capture `const q = [...result.current.queue]`; loop
  `PREVIEW_COUNT` times: `act(() => dispatch("hardDrop"))`, then
  `expect(result.current.state.active.type).toBe(q[i])`.
- **tracks the pure core (no rules reimplemented)**: independently drive `step(_, "hardDrop")` from
  `createInitialState(DEFAULT_SEED)` the same number of times; the hook's queue at t=0 equals
  `upcomingPieces(coreState0, PREVIEW_COUNT)` and the spawn types agree.

## Ordering of changes

1. `lib/game.ts` accessor (no dependents break — pure addition).
2. `lib/game.test.ts` (validates 1 in isolation).
3. `components/useGame.ts` (imports the accessor from 1).
4. `components/useGame.queue.test.ts` (validates 3).

Each step is independently runnable via `npx vitest run <file>`; the whole suite (`npm test`) and
`npm run lint` gate the finish.

## Module boundaries / interfaces (unchanged contracts)

- `lib/` stays pure; `upcomingPieces` reads the bag but performs no side effect (peek is
  non-consuming). No React import crosses into `lib/`.
- `GameView` grows by one read-only field; `dispatch` signature unchanged; `GameContainer` needs no
  edit.
- `PREVIEW_COUNT` is the single source of truth for the window size, re-exported for the render
  ticket to consume.
