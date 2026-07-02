# Review — T-007-03-02 hold-key-and-display

## Summary

Surfaced the hold feature in the UI. The pure core (`hold`/`canHold`, `step`'s `"hold"` case) was
already complete and tested from T-007-03-01, so this ticket is the render/input seam only: the
**C** key now dispatches `"hold"`, and a new presentational `HoldBox` renders the held piece beside
the board — dimmed while the once-per-drop block is in effect. No game logic was added or
duplicated; `lib/**` and `useGame.ts` are untouched. Commit `df078f9`.

## Files changed

### Created

- **`components/HoldBox.tsx`** (~90 lines) — presentational, props-driven, logic-free (the
  `Board`/`Cell`/`GameOverlay` discipline). `HoldBox({ type, canHold })`:
  - Draws the held piece by reusing shape data — `cellsFor(type, 0)` painted onto a
    `BOUNDING_BOX[type]` mini grid — so it re-derives no offsets.
  - `type === null` renders a stable 4×4 blank (slot present from first paint; layout never jumps).
  - `canHold === false` → `opacity-40` + `data-can-hold="false"` (the block "felt").
  - Local literal `PIECE_FILL` map of `bg-piece-*` tokens (Tailwind tree-shaking; per-module-map
    pattern from `Cell`).
  - **Attribute discipline:** held squares carry `data-hold`, never `data-cell`.
- **`components/HoldBox.test.tsx`** (~90 lines) — 7 unit cases.

### Modified

- **`components/GameContainer.tsx`** — added `c`/`C` → `"hold"` to `KEY_TO_INPUT`; imported and
  wired `HoldBox` (`state.hold`, `state.canHold`) into a flex-row layout, keeping the `relative`
  wrapper tight around `Board`+`GameOverlay` so the game-over overlay still covers exactly the
  board. Module + key-map JSDoc updated.
- **`components/GameContainer.test.tsx`** — 4 new hold integration cases.

### NOT touched (deliberately)

`lib/**` (core is done), `components/useGame.ts` (`state.hold`/`state.canHold` already exposed;
`dispatch` already generic over `Input`), `components/Cell.tsx` (local map instead of a new export),
`app/page.tsx` (GameContainer still one root node).

## Acceptance criteria

> Pressing C in the running game swaps the active piece into a visible hold box and is ignored
> until the next lock; container test covers the C→'hold' dispatch and build stays green.

- ✅ **C swaps the active piece** — `KEY_TO_INPUT` maps `c`/`C` → `"hold"`; test asserts the board
  equals the core's `expectedAfter("hold")` ground truth.
- ✅ **Into a visible hold box** — `HoldBox` renders the stashed piece's four spawn cells; test
  reads 4 `[data-hold]` squares matching the stashed id.
- ✅ **Ignored until the next lock** — the core's `!canHold` no-op is the guard (no handler
  special-casing needed); test presses C twice and asserts the board is unchanged and the box is
  flagged `data-can-hold="false"`.
- ✅ **Container test covers C→'hold'** — 4 new cases in `GameContainer.test.tsx`.
- ✅ **Build stays green** — `npm run build` (vinext) passes.

## Test coverage

| Concern | Test | File |
|---|---|---|
| Empty slot renders no piece | HoldBox › renders a labelled box … empty | HoldBox.test |
| Held piece = 4 spawn cells | HoldBox › renders exactly the … four spawn cells | HoldBox.test |
| All 7 types render correctly | HoldBox › draws every tetromino … | HoldBox.test |
| Reuses `cellsFor` (no hard-coded coords) | HoldBox › places the filled squares at cellsFor(type,0) | HoldBox.test |
| Spent-hold dim + flag | HoldBox › dims and flags … / does not dim … | HoldBox.test |
| No `data-cell` leak | HoldBox › never tags a square with data-cell | HoldBox.test |
| C → 'hold' dispatch (AC) | GameContainer › C dispatches 'hold' … | GameContainer.test |
| Capital C parity | GameContainer › capital C also holds | GameContainer.test |
| Second hold ignored (AC) | GameContainer › a second hold is ignored until … | GameContainer.test |
| Board helpers not polluted | GameContainer › the hold box does not pollute … | GameContainer.test |

- Full suite: **206 passed / 21 files** — no regression.
- The C→'hold' assertion cross-checks against the core (`expectedAfter("hold")`) rather than
  hard-coding coordinates, so it survives spawn-column/shape changes (matches the file's idiom).
- HoldBox coordinate test derives expected cells from `cellsFor`, not literals — same reuse
  discipline.

## Open concerns / limitations

- **Transient lint warning from a concurrent thread (not this ticket).** `npm run lint` reports one
  warning — `'upcomingPieces' is defined but never used` in `lib/game.test.ts`. That file (with
  `lib/game.ts` and `docs/.../T-007-04-01.md`) is being edited by a **parallel lisa thread** on the
  shared branch (the next-queue work). It is **not** in this ticket's diff; my four files lint clean
  in isolation (`eslint … --max-warnings 0`, exit 0). Left untouched per the concurrency model —
  flagged only so it isn't mis-attributed here. It should clear when that thread finishes wiring
  `upcomingPieces`.
- **No animation/juice** on the swap or the spent-hold dim — a plain static state, matching
  `GameOverlay`'s scope note. The flash treatment is E-004's, out of scope here.
- **Preview pattern is local, not yet shared.** `HoldBox` establishes the "draw one piece in a mini
  grid" pattern; a future `NextPreview` (T-007-04) could factor out a shared `PieceGlyph`. Not done
  here to avoid pre-emptive abstraction and a needless edge onto the concurrent next-queue work.
- **`PIECE_FILL` duplicates `Cell.CELL_COLOR`** (7 literal lines) by design (Tailwind-literal /
  per-module-map pattern). If a third consumer appears, promote to a shared exported map.

## Handoff note

Nothing blocking for a human reviewer. The change is additive to the render/input layer; any
regression would surface only in the two component test files. The one thing to eyeball: confirm
the `lib/game.test.ts` lint warning is indeed the sibling next-queue thread's and not a stray edit
here — `git show df078f9 --stat` shows this commit touches only the four `components/` files.
