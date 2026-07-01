# Plan — T-003-03-01 move-rotate-keys

## Steps (each independently verifiable; commit after each green unit)

### Step 1 — Expose `dispatch` from `useGame`
- Edit `components/useGame.ts`:
  - `useState` → destructure `[state, setState]`.
  - Import `useCallback`; import `step` and `Input` from `@/lib/game`.
  - Add stable `dispatch = useCallback((input) => setState((s) => step(s, input)), [])`.
  - Add `dispatch` to `GameView` and the return.
  - Refresh the module doc comment (input dispatch now exists; gravity loop still later).
- Verify: `npm run lint` and `npx tsc --noEmit` clean; existing tests still pass
  (`npm test` — the starting-frame tests must be unaffected since default render is unchanged).

### Step 2 — Wire keydown in `GameContainer`
- Edit `components/GameContainer.tsx`:
  - Import `useEffect` and `type Input`.
  - Add module-level `KEY_TO_INPUT` map (Left/Right/Up/x/X/z/Z).
  - Destructure `dispatch` from `useGame()`.
  - `useEffect` attaching `window` `keydown` → map lookup → `preventDefault` + `dispatch`,
    with cleanup removing the listener; deps `[dispatch]`.
  - Refresh the component doc comment.
- Verify: lint + tsc clean; app still renders the starting board (existing GameContainer
  tests pass unchanged).

### Step 3 — Tests
- Edit `components/GameContainer.test.tsx`. Add a helper `filledCoords(container)` returning
  the sorted `x,y,type` of non-empty `[data-cell]` squares (factor from the existing inline
  logic). Add cases:
  1. ArrowLeft → coords match `step(createInitialState(DEFAULT_SEED), "left")` overlay.
  2. ArrowRight → match `"right"`.
  3. ArrowUp → match `"rotateCW"`.
  4. Wall no-op: fire ArrowLeft N times (> board width); coords stabilize and equal the
     piece pinned at the wall; no `x < 0`.
  5. Unmapped key (`Enter`) → coords unchanged from initial frame.
  6. Unmount then fire key → no throw.
- Drive events with `fireEvent.keyDown(window, { key })` from `@testing-library/react`
  (wraps in `act`, flushing the React 19 state update).
- Verify: `npm test` all green.

## Testing strategy

- **Unit/core:** none added — `lib/game.test.ts` already covers `step` left/right/rotate and
  the no-op contract. Re-testing the reducer here would be redundant.
- **Component/integration (this ticket's focus):** jsdom + Testing Library asserting that a
  real DOM `keydown` routes through `dispatch → step` and repaints the board. Ground truth is
  computed by calling the pure core directly (same seed), so tests assert *wiring*, not
  geometry.
- **Manual smoke (optional):** `npm run dev`, load `/`, press ←/→/↑ — piece moves/rotates,
  page does not scroll, piece stops at walls. Not required for CI.

## Verification gates (must all pass before Review)

1. `npm run lint` → 0 warnings (repo runs `--max-warnings 0`).
2. `npx tsc --noEmit` → clean (or `npm run build`).
3. `npm test` → all suites green, including the new GameContainer cases.

## Risks / mitigations

- **React 19 state flush in tests:** use `fireEvent` (act-wrapped) rather than raw
  `dispatchEvent`, else the assertion runs before the re-render.
- **Strict-Mode double effect:** cleanup removes the exact handler, so a double
  subscribe/unsubscribe nets one listener — no duplicate dispatch.
- **Scope creep:** resist adding ArrowDown/space here; those are T-003-03-02. Keep the map
  to move+rotate only.

## Commit sequence

- `feat(T-003-03-01): expose stable dispatch(input) from useGame`
- `feat(T-003-03-01): wire keydown move/rotate handlers in GameContainer`
- `test(T-003-03-01): cover keyboard move/rotate wiring + wall no-op`
(Or fold 1–2 into one feat commit if steps land together; tests separate.)
