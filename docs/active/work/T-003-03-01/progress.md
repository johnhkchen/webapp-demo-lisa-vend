# Progress — T-003-03-01 move-rotate-keys

## Status: complete

All plan steps executed as written; no deviations from the design.

## Steps

- [x] **Step 1 — `dispatch` from `useGame`** (`a9a4a00`)
  - Destructured `[state, setState]`; added stable `dispatch = useCallback((input) =>
    setState((s) => step(s, input)), [])`; added `dispatch` to `GameView` and the return;
    imported `useCallback`, `step`, `Input`; refreshed module doc.
- [x] **Step 2 — keydown wiring in `GameContainer`** (`beb5ccc`)
  - Added `KEY_TO_INPUT` map (Left/Right/Up/x/X/z/Z), a `useEffect` window `keydown`
    listener that maps → `preventDefault` (consumed keys only) → `dispatch`, with cleanup;
    deps `[dispatch]`; refreshed component doc.
- [x] **Step 3 — tests** (`1c83cfc`)
  - Factored `filledCoords()` readback + `expectedAfter(...inputs)` core-ground-truth helper.
    Added: ArrowLeft, ArrowRight, ArrowUp(rotateCW), z(rotateCCW), left-wall no-op,
    unmapped-key ignore (incl. ArrowDown reserved for next ticket), and unmount cleanup.

## Verification

- `npx tsc --noEmit` → clean.
- `npm test` → **140 passed (16 files)**, including the 6 new GameContainer cases.
- `npx eslint` on the three changed files → clean (no output).

## Deviations

None to the code. One environmental note (see Review): the repo-wide `npm run lint` reports
**one pre-existing error in `components/useAnimationFrameLoop.ts`**, which belongs to sibling
ticket **T-003-02-01** (committed at `b5ae0a3`) and is unrelated to this change. Not fixed
here — it is another ticket's file and outside this ticket's scope.
