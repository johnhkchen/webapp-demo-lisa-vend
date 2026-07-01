# T-002-03-04 — Structure: determinism-test-harness

## Files

| File | Change | Why |
|------|--------|-----|
| `lib/determinism.test.ts` | **create** | The determinism harness — the whole ticket. |
| production `lib/*.ts` | **none** | Test-only ticket; engine already complete for scope. |

No new source module, no `package.json` change (vitest + `npm test` already configured). The
test sits beside the other `lib/*.test.ts` files and is picked up by the existing vitest glob.

## `lib/determinism.test.ts` — internal shape

Module docstring (matching the repo's descriptive-comment style): state that this is the
end-to-end determinism proof for the keystone property, and note the one subtlety — the bag is
a live closure, so states are compared via a bag-excluding `snapshot` and the id stream is
probed separately.

### Imports

```ts
import { describe, it, expect } from "vitest";
import { createInitialState, step, type GameState, type Input } from "./game";
import type { TetrominoType } from "./types";
```

### Helpers (top of file)

1. `type Snapshot` — the bag-excluding projection:
   `{ board: Board; active: Piece; score: number; lines: number; level: number; gameOver: boolean }`
   (import `Board`, `Piece` from `./types`). Or inline via `Omit<GameState, "bag">`.

2. `snapshot(s: GameState): Snapshot` — explicit destructure dropping `bag`. Comment ties it
   to `GameState` so a future added field is a deliberate update, not a silent miss.

3. `run(seed: number, script: readonly Input[]): GameState` — fold `step` over `script` from
   `createInitialState(seed)`. Returns the final state (bag still live for probing).

4. `runTrace(seed, script): Snapshot[]` — same fold but collect `snapshot` after each step
   (including index 0 = initial) for step-by-step comparison.

5. `drawIds(s: GameState, n: number): TetrominoType[]` — `Array.from({length:n}, () =>
   s.bag.next())`. Mutates the bag; callers use it last.

6. `SCRIPT: Input[]` — a fixed, eventful sequence. Construction: a small helper
   `ticks(n)` = `Array(n).fill("tick")`, composed with a few laterals/rotations between long
   tick runs, repeated enough to force ≥ ~8 spawns (cross a 7-bag refill) and ≥ 1 line clear.
   Example spine: `[...ticks(20), "left", ...ticks(20), "right", "rotateCW", ...ticks(20), ...]`
   totalling ~120–200 inputs. Content is illustrative; only identity across runs matters.

### Test cases (`describe("step determinism", ...)`)

- **`it("same seed + same script ⇒ deep-equal final board, score, and piece-sequence state")`**
  — the AC test. `run` twice from the same seed; `expect(snapshot(a)).toEqual(snapshot(b))`;
  then `expect(drawIds(a, 14)).toEqual(drawIds(b, 14))`. Also assert the run was *eventful*
  (e.g. `a.score > 0 || a.lines > 0 || a` advanced several spawns) so the test can't pass on a
  trivial no-op run — a guard that the harness actually exercised locks/clears.

- **`it("stays identical at every step, not just the end")`** — `runTrace` twice; assert equal
  length and `toEqual` per index (loop with an indexed message), pinpointing first divergence.

- **`it("diverges for a different seed")`** — run the same script under two different seeds;
  assert the piece-stream probe differs (`expect(drawIds(x,14)).not.toEqual(drawIds(y,14))`),
  and/or the final snapshot differs. Proves the equality assertions aren't vacuous.

- **`it("a lateral input is a pure function of state (no hidden entropy)")`** — from one
  initial state, apply the same lateral twice to the *same* state; `snapshot` of both results
  `toEqual`. (Laterals don't touch the bag, so re-running one state is safe here.)

## Ordering

Single file, no cross-file ordering. Within the file: helpers → SCRIPT → tests. The AC test
comes first so the primary property reads at the top.

## Interfaces touched

Read-only consumers of the existing public surface: `createInitialState`, `step`, `GameState`,
`Input`, `SevenBag.next` (via `state.bag`), `TetrominoType`. Nothing exported from the test.

## Verification hooks

`npm test` runs the full vitest suite including the new file. `npm run lint` must stay clean
(`--max-warnings 0`) — no unused imports, no `any`.
