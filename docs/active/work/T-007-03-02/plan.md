# Plan — T-007-03-02 hold-key-and-display

Ordered, independently-verifiable steps. Each ends green (`npm run lint`, `npm test`, and — at the
end — `npm run build`). Small enough to commit atomically.

## Step 1 — `HoldBox` component

**Do:** create `components/HoldBox.tsx` per `structure.md`:
- `HoldBoxProps { type: TetrominoType | null; canHold: boolean }`.
- Local literal `PIECE_FILL: Record<TetrominoType, string>` (`bg-piece-*`), with the
  tree-shaking-rationale comment.
- Module JSDoc: presentational hold display, reuses `cellsFor`/`BOUNDING_BOX`, logic-free, the
  `data-hold` (not `data-cell`) invariant, and the `canHold` dim = "block felt".
- Render the labelled panel + `box×box` inner grid; filled squares → `data-hold={type}` + fill;
  empties → faint style, no data attrs. `box = type ? BOUNDING_BOX[type] : 4`.
- `data-can-hold={canHold}` + `opacity-40` when `!canHold`.

**Verify:** `npx tsc --noEmit` (or the project's typecheck) clean; component compiles.

## Step 2 — `HoldBox` unit tests

**Do:** create `components/HoldBox.test.tsx` (`// @vitest-environment jsdom`):
1. `type={null}` → box present (`[aria-label="Hold"]`), `queryAllByData`… zero `[data-hold]`.
2. `type="T"` → exactly 4 `[data-hold="T"]` squares.
3. Loop `TETROMINO_TYPES`: each renders 4 filled squares with matching `data-hold`.
4. Filled coords equal `cellsFor(type, 0)` mapped into the box (reuse, not hard-coded literals).
5. `canHold={false}` → box carries `data-can-hold="false"` and the dim class; `true` → not dim.

**Verify:** `npm test -- HoldBox` green.

**Commit:** `feat(hold): add HoldBox held-piece display component`.

## Step 3 — bind C + wire the display in `GameContainer`

**Do:** modify `components/GameContainer.tsx` per `structure.md`:
- Add `c: "hold"`, `C: "hold"` to `KEY_TO_INPUT`; update the map's JSDoc.
- Import `HoldBox`; wrap the board stack + `<HoldBox type={state.hold} canHold={state.canHold} />`
  in the flex-row layout, keeping the `relative` wrapper tight around `Board`+`GameOverlay`.
- Update the module JSDoc (one sentence on the hold key + display).

**Verify:** `npm test -- GameContainer` — existing tests still green (board helpers unaffected
because hold squares use `data-hold`, and `cells(container)` is still `ROWS*COLS`).

## Step 4 — `GameContainer` hold tests

**Do:** add `describe("GameContainer — hold")` to `components/GameContainer.test.tsx`:
1. **C → `'hold'` dispatch (the AC):** capture the pre-hold active type; `fireEvent.keyDown(window,
   {key:"c"})`; assert `filledCoords(container)` equals `expectedAfter("hold")` and the hold box
   shows a `[data-hold]` matching the stashed type.
2. **Visible held piece:** the `[aria-label="Hold"]` region contains 4 `[data-hold]` squares.
3. **Ignored until next lock (the AC):** press `c` twice; board identical to the single-hold state,
   box unchanged, `data-can-hold="false"`.
4. **Capital `C`** also holds.
5. **Board helpers intact:** after a hold, `cells(container)` length still `ROWS*COLS`.

**Verify:** `npm test -- GameContainer` green.

**Commit:** `feat(hold): bind C to hold + show held piece in GameContainer`.

## Step 5 — full gate

**Do:** run the whole suite + lint + production build.
**Verify:**
- `npm test` — full suite green (no regression; expect prior count + new HoldBox/GameContainer
  cases).
- `npm run lint` (`--max-warnings 0`) clean.
- `npm run build` — vinext production build green (the AC's "build stays green").

## Testing strategy summary

| Concern | Level | Where |
|---|---|---|
| HoldBox renders held piece / empty slot / dim | unit (jsdom) | `HoldBox.test.tsx` |
| HoldBox reuses `cellsFor` (no hard-coded coords) | unit | `HoldBox.test.tsx` |
| C key → `'hold'` dispatch (AC) | integration | `GameContainer.test.tsx` |
| Held piece visible in box (AC) | integration | `GameContainer.test.tsx` |
| Second hold ignored until lock (AC) | integration | `GameContainer.test.tsx` |
| No board-helper regression | integration | `GameContainer.test.tsx` |
| Build green (AC) | build gate | `npm run build` |

## Rollback / risk notes

- All changes are additive to render/input; core untested paths are untouched, so a regression can
  only surface in the two component test files — fast to localize.
- If `filledCoords` unexpectedly breaks, the cause is a stray `data-cell` on a hold square — the
  single thing Structure forbids; grep `HoldBox.tsx` for `data-cell` before debugging further.
- No deploy step here (deploy is a separate runbook); "build stays green" is the ceiling.
