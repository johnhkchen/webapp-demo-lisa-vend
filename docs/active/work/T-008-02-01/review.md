# T-008-02-01 — Review: attract-driver-loop

## What changed

| File | Change | Notes |
|------|--------|-------|
| `components/useGame.ts` | **modified** | Added `ATTRACT_INTERVAL_MS = 120` and `reset(seed)` (+ `reset` on `GameView`). Additive only — existing fields/`dispatch` identity unchanged. |
| `components/useAttractLoop.ts` | **created** (~90 lines w/ docstring) | `AttractGame` + `useAttractLoop(game, active, intervalMs?)` — the CPU attract driver. |
| `components/StartOverlay.tsx` | **created** (~45 lines) | Non-blocking arcade "PRESS START" banner. |
| `components/GameContainer.tsx` | **modified** | `attract?` prop (default `true`, held in state); runs the driver; gates human gravity loop + keyboard on `!attract`; renders `StartOverlay`. |
| `app/page.tsx` | **modified** | Renders `<GameContainer attract />`; caption now reflects auto-play. |
| `components/useGame.reset.test.ts` | **created** | 2 tests. |
| `components/useAttractLoop.test.ts` | **created** | 6 tests. |
| `components/StartOverlay.test.tsx` | **created** | 3 tests. |
| `components/GameContainer.test.tsx` | **modified** | 26 human-play renders opt into `attract={false}`; new "attract mode" block (3 tests). |
| `docs/active/work/T-008-02-01/*` | **created** | RDSPI artifacts. |

No `lib/` changes (driver is React glue over the already-pure `chooseMove`); no files deleted; no
new dependencies. Three commits (`140b6a1`, `25aa4f9`, `5b11479`).

## What it does

On load the app auto-plays behind a "PRESS START" overlay. Each `ATTRACT_INTERVAL_MS` the driver
asks `chooseMove(state)` for the current piece's best move and dispatches **one** input toward it
(rotate → shift → hardDrop), so the demo visibly slides/rotates each piece and drops it; on top-out
it re-initializes the game (next counter seed) and continues. The bot-driven `state` flows through
the exact same `view`/`ghost`/`queue`/`flash` → `Board` path, so rendering is reused wholesale.

**Design crux — stateless one-input-per-frame (no stored plan):** `chooseMove`'s *chosen placement*
depends only on `board` + piece `type` (both unchanged while a piece falls), so it is invariant
frame-to-frame; only the emitted relative maneuver shrinks as the piece is nudged toward it.
Dispatching `chooseMove(state)[0]` every frame therefore converges deterministically and ends on the
plan's terminal `hardDrop` (lock + spawn), after which the next frame replans. No queue to hold or
desync, and the driver always reads the latest committed state (the rAF loop's latest-callback
guarantee makes the closure safe). Empty plan (`[]`, topped-out) → dispatch `"tick"` to let `step`
top the game out, which the next frame resets — self-healing at the reachability boundary.

## Acceptance criterion

> Loading the app shows the board auto-playing behind the start overlay with no keypress: pieces are
> AI-placed, lines clear, and on top-out the demo resets and continues; observable in the running
> dev/deployed app and covered by a driver test asserting successive frames advance bot-chosen state
> until game-over then re-initialize.

✅ Met.
- **Auto-plays, AI-placed, no keypress:** `GameContainer — attract mode` pumps rAF with no key press
  and asserts the settled board gains locked cells; `useAttractLoop` #1 asserts the first dispatched
  input equals `step(s0, chooseMove(s0)[0])` exactly (bot-chosen, not a reimplementation).
- **Lines clear:** the bot ends every piece with `hardDrop` through the unchanged `step` pipeline
  (clear + score), so clears occur exactly as in the human game; the mechanism itself is covered by
  the existing line-clear / flash suites, reused verbatim.
- **On top-out resets and continues:** `useAttractLoop` #4 (injected game-over) asserts `reset` is
  called (not `dispatch`) and then, with a fresh state, the driver resumes dispatching bot inputs —
  the "then re-initialize and continue" half. #5 asserts the seed advances across resets.
- **Behind the start overlay / observable:** `StartOverlay` renders a non-blocking PRESS START banner
  over the live board; container test asserts it loads with the board playing beneath.

Suite: **299 tests / 32 files** green. Lint clean (`--max-warnings 0`). Build passes (client + SSR).

## Test coverage

- **`reset` seam** — equals `createInitialState(seed)`; stable identity.
- **Driver, real seam** — exact bot-chosen first input; keeps placing pieces; inert while inactive.
- **Driver, injected states** — game-over → reset-then-resume; seed advances across resets;
  no-placement → `tick`.
- **StartOverlay** — hidden renders nothing; visible shows PRESS START; `pointer-events-none`.
- **Container attract mode** — PRESS START over a live board; auto-play advances with no keypress;
  keyboard swallowed (no bleed-through).
- **Regression** — all prior playability/gravity/pause/game-over/hold/next/flash tests stay green
  under explicit `attract={false}`.

### Gaps / not covered (intentional)
- **Natural top-out is not driven end-to-end.** A greedy hole-avoiding bot survives hundreds of
  pieces, so playing a real game to game-over in a unit test is impractically slow/flaky. The
  reset-and-continue path is instead proven with an injected game-over state (the same
  "isolate-the-seam" move `bot.test.ts` used). The full loop is observable in `npm run dev`.
- **Cadence/timing of the demo** is asserted structurally (one input per interval via the pump), not
  as wall-clock feel — `ATTRACT_INTERVAL_MS` is a tunable feel constant.
- **Reachability near top-out** — inherited from `chooseMove` (a lateral shift can be blocked by a
  near-top stack; tuck/slide-under is a later ticket). In attract mode this coincides with imminent
  top-out and is resolved by the reset loop rather than a stuck state (documented in the hook).

## Open concerns / notes for the reviewer

1. **`attract` default is `true`; existing human-play tests opt into `attract={false}`.** The app's
   load behaviour is now attract mode, which is genuinely incompatible with "keyboard plays from
   load". Rather than break the 26 existing renders, `attract` is a default-`true` prop and those
   renders now pass `attract={false}`. This is deliberate churn, not a workaround: it makes each test
   declare its mode, keeps the playability/scoring suite meaningful, and leaves `attract` as the
   exact state seam the handoff ticket flips. If a reviewer prefers the component default to be human
   (attract enabled only at `page.tsx`), that's a one-line flip of the prop default — but attract-as-
   default matches what the app actually loads.
2. **Start is inert this ticket — by design.** `StartOverlay` has no handlers and the `attract` state
   setter is unwired. Halting the bot and handing off to a clean human game with no input
   bleed-through is `T-008-02-02`'s AC. This ticket deliberately gates the keyboard while attract is
   on (so the bot isn't fought), which is the *floor* of "no bleed-through"; the handoff ticket owns
   the transition itself.
3. **Reset seed variety vs. determinism.** Resets use a deterministic counter (`DEFAULT_SEED + n`),
   not `Math.random()` — every loop is reproducible (tests/replays) while still varying the game each
   top-out. The first game keeps `DEFAULT_SEED` (server-render/hydration safe).
4. **Two loops, one driver rule.** The human gravity loop is gated `!attract`, so with attract on it
   schedules no frames and only the attract loop advances state — verified by the mode-specific tests
   pumping a single `pending` frame source. No double-advance.

No known bugs or TODOs left in code.
