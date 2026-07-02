# T-008-02-01 — Plan: attract-driver-loop

Ordered, independently-verifiable steps. Each step is a candidate atomic commit.

## Step 1 — `reset` seam + attract cadence in `useGame`

- Add `export const ATTRACT_INTERVAL_MS = 120;` with a docstring mirroring `GRAVITY_INTERVAL_MS`
  (feel/timing lives in the seam, not `lib/`).
- Add `reset: (seed: number) => void` to `GameView`; implement
  `const reset = useCallback((seed) => setState(createInitialState(seed)), []);` and return it.
- **Test** `components/useGame.reset.test.ts`: render `useGame`, dispatch a few `"tick"`s to advance
  the state, then `act(() => reset(SEED))` and assert the state deep-equals `createInitialState(SEED)`
  (fresh empty board, score 0, `gameOver` false); assert `reset` identity is stable across renders.
- **Verify:** `npm run test` for the new file green; existing `useGame.*` tests still green.

## Step 2 — `useAttractLoop` driver hook + tests

- Create `components/useAttractLoop.ts` per structure.md: `AttractGame` interface, `useAttractLoop`,
  a `seedRef = useRef(DEFAULT_SEED)`, and one `useAnimationFrameLoop(onTick, intervalMs, active)`.
  `onTick`: game-over → bump seed + `reset`; else `dispatch(chooseMove(state)[0] ?? "tick")`.
- **Test** `components/useAttractLoop.test.ts` — reuse the manual rAF pump from
  `useAnimationFrameLoop.test.ts` (stub `requestAnimationFrame`/`cancelAnimationFrame`, `frame(now)`):
  1. **advances bot-chosen state (real seam):** `renderHook` a wrapper that calls
     `useGame(DEFAULT_SEED)` + `useAttractLoop(game, true)`; capture `const s0 = createInitialState(DEFAULT_SEED)`;
     `frame(0); frame(INTERVAL)`; assert `result.current.state` equals `step(s0, chooseMove(s0)[0])`.
  2. **keeps advancing / locks a piece:** pump many intervals; assert the settled board eventually
     has ≥1 non-null cell (a piece locked) — bot is placing pieces frame over frame.
  3. **re-initializes on game-over (injected):** wrapper with a controlled fake `game`
     (`useState` a real `GameState`, start with `{...createInitialState(SEED), gameOver: true}`),
     spy `reset`/`dispatch`; pump a frame → `reset` called once, `dispatch` not called. Then set a
     fresh non-game-over state and pump → `dispatch` called with a valid bot input (continues).
  4. **no legal placement → `tick`:** controlled fake whose board is fully filled (helper fills every
     cell) so `chooseMove` returns `[]`; pump a frame → `dispatch("tick")`.
  5. **inactive:** `active=false` → pumping frames dispatches nothing and never resets.
- **Verify:** new file green; determinism (same seed → same first dispatch) implicitly checked by
  test 1's exact equality.

## Step 3 — `StartOverlay` component + test

- Create `components/StartOverlay.tsx`: `visible` prop, `return null` when hidden; else a
  non-blocking (`pointer-events-none`, bottom-anchored, no full dim) neon "PRESS START" banner with
  `role="status"`, gradient text matching the app theme, a subtle pulse.
- **Test** `components/StartOverlay.test.tsx`: renders nothing when `!visible`; renders a
  `role="status"` with "PRESS START" text when `visible`; assert the root carries
  `pointer-events-none` (does not intercept the board) — mirrors `GameOverlay.test.tsx` structure.
- **Verify:** green.

## Step 4 — wire `GameContainer` + page caption

- `GameContainer`: destructure `reset`; `const [attract] = useState(true);`
  `useAttractLoop({ state, dispatch, reset }, attract);` change the human gravity loop gate to
  `!attract && !state.gameOver && !state.paused`; early-return `if (attract) return;` in `onKeyDown`
  and add `attract` to the effect deps; render `<StartOverlay visible={attract} />` in the `relative`
  wrapper. Update the container docstring with a T-008-02-01 paragraph (attract driver + start
  overlay + the gate seam the handoff ticket flips).
- `app/page.tsx`: caption → auto-play wording.
- **Test** `components/GameContainer.test.tsx`: verify existing tests still pass; add/adjust as
  needed so that with `attract` default true — (a) a keydown does **not** change the board (keyboard
  gated), and (b) the `StartOverlay` ("PRESS START") is present. Keep assertions resilient to the
  bot advancing state on rAF (jsdom's rAF is available under jsdom env; if flakiness risk, assert on
  the overlay presence + keyboard-gating, which are timing-independent).
- **Verify:** full container suite green.

## Step 5 — full gate

- `npm run test` (whole suite — target: 285 prior + new tests, all green).
- `npm run lint` (`--max-warnings 0`).
- `npm run build` (type-check + production build passes).
- Manual/observed: `npm run dev` shows the board auto-playing with the "PRESS START" banner and a
  reset after top-out (documented in progress.md; a full natural top-out is slow, so observation
  focuses on auto-play + banner; the reset path is proven by test 3).

## Testing strategy summary

| Behaviour | Test | Kind |
|-----------|------|------|
| `reset` returns a fresh game | `useGame.reset.test.ts` | unit (hook) |
| Driver dispatches bot-chosen input, exactly | `useAttractLoop.test.ts` #1 | integration (real seam) |
| Driver keeps placing pieces | #2 | integration |
| Game-over → re-initialize → continue | #3 | unit (injected fake) |
| No legal placement → `tick` | #4 | unit (injected fake) |
| Inactive → does nothing | #5 | unit |
| Start overlay present + non-blocking | `StartOverlay.test.tsx` | unit (render) |
| Keyboard gated + overlay shown in attract | `GameContainer.test.tsx` | integration |

## Commit sequence

1. `feat(useGame): add reset seam + attract interval constant`
2. `feat(attract): rAF driver hook running chooseMove with reset-on-gameover`
3. `feat(attract): non-blocking PRESS START overlay`
4. `feat(GameContainer): run attract driver behind start overlay on load`

(RDSPI artifacts committed alongside per the repo convention.)

## Risks / mitigations

- **Double-drive** if both loops run → mitigated by the `!attract` gate on the human loop (only one
  loop advances state).
- **rAF under jsdom** in the container test could advance the bot mid-assertion → keep container
  assertions timing-independent (overlay presence, keyboard gating), leave cadence assertions to the
  pump-driven driver test.
- **Natural top-out too slow to unit-test** → reset path tested via injected game-over state (test
  #3); gap documented in review.
