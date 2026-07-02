# T-008-02-02 — Research: start-handoff-clean

## Ticket in one line

Pressing Start must halt the attract driver and hand off to a **fresh** human-controlled game —
no residual bot board/score/active piece, no bot input dispatched after Start — with the
production build and existing playability/scoring suites staying green.

## The seam already exists (T-008-02-01 left the hook here)

`components/GameContainer.tsx` is the single `"use client"` island. T-008-02-01 deliberately
staged everything this ticket needs and stopped one line short of wiring it:

- `const [attract] = useState(initialAttract);` — line 107. Held as **state on purpose** (not a
  bare const) so the setter is the exact seam the handoff flips. Currently the setter is not even
  destructured — no code path turns attract off.
- The attract driver: `useAttractLoop({ state, dispatch, reset }, attract)` — dormant when
  `active` is false (schedules no rAF frames; see `useAnimationFrameLoop` early-return on `!active`).
- The human gravity loop: `useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS,
  !attract && !state.gameOver && !state.paused)` — gated off while attract is on.
- The keyboard effect: `if (attract) return;` (line 131) — during attract, **every** key is
  swallowed so the bot plays uncontested.
- `<StartOverlay visible={attract} />` — the non-blocking "PRESS START" pill; disappears (returns
  `null`) the instant `attract` is false.

T-008-02-01's own design.md is explicit that the remaining work is ours: *"the `attract` prop
(default true) is held in state — the single seam the Start handoff (T-008-02-02) will flip to
false"* and *"Full 'no input bleed-through on handoff' is T-008-02-02's AC; gating here is just
'the bot plays uncontested'."*

## Why a bare flip of `attract` is not enough

There is **one** game holder: `useGame()` in `GameContainer`, and the attract loop mutates that
same `state` via the shared `dispatch`. So at the moment Start is pressed, `state` holds the bot's
**in-progress** game — a partially-filled board, a non-zero score/lines, and whatever active piece
the bot is mid-placing. Merely setting `attract=false` would leave the human playing the bot's
leftover board. The ticket's "fresh createInitialState human game … no carried-over board/score/
active piece" therefore **requires a reset**, not just a mode flip.

That reset seam already exists: `useGame` exposes `reset(seed)` →
`setState(createInitialState(seed))`, referentially stable via `useCallback` (see
`components/useGame.ts:139` and its docstring, which names this ticket: *"used by … the Start
handoff to begin a clean human game (T-008-02-02)"*). `useGame.reset.test.ts` already proves a
reset is value-identical to a fresh core state (empty board, first spawn, zeroed score/lines, not
over, `clearedRows: []`).

## How "no bot input after Start" falls out of the loop mechanics

`useAnimationFrameLoop` subscribes in a `useEffect` keyed on `[intervalMs, active]` and its cleanup
calls `cancelAnimationFrame`. When `attract` flips to false:

- the attract loop's effect re-runs with `active=false`, its cleanup **cancels the pending frame**,
  and it schedules none — so `chooseMove`/`dispatch` cannot fire again;
- the human gravity loop's effect re-runs with `active=true` and schedules its own frame.

So after the flip the only scheduled frame is the human gravity tick. The "latest-callback"
guarantee is irrelevant here because the attract callback is unsubscribed entirely. This is the
same mechanism the existing game-over/pause tests rely on (`pending === null` ⇒ loop genuinely
halted, not no-oping).

## Test infrastructure available to reuse

`components/GameContainer.test.tsx` already contains a deterministic rAF pump (stub
`requestAnimationFrame`/`cancelAnimationFrame`, a `frame(now)` helper delivering one frame at an
absolute timestamp) used by the game-over, pause, and attract describe blocks. It also provides
`filledCoords(container)` (DOM squares → sorted `"x,y,type"`) and `expectedAfter(...inputs)` (core
ground truth: `createInitialState(DEFAULT_SEED)` stepped through inputs, composed via
`overlayPiece`). These are exactly the tools needed to assert "board == fresh spawn" and "after
Start, gravity (a `tick`) — not a bot move — advances the board."

The attract describe block currently has a test **"swallows keyboard input while the bot plays
(no bleed-through)"** (lines 506–513) asserting a keypress during attract leaves the board
unchanged. That test encodes the *old* contract (keys swallowed). This ticket intentionally
supersedes it: during attract a key now **starts** the game. That test must be reconciled/replaced.

## Constraints & assumptions

- **Purity boundary.** `lib/` stays framework-free; all changes live in the `GameContainer` seam.
  No new game rules. Reset seed = `DEFAULT_SEED` (the canonical fresh game, matching
  `attract={false}` and keeping tests deterministic — no `Math.random`, which would also break the
  server-render/hydration contract documented on `DEFAULT_SEED`).
- **StartOverlay is `pointer-events-none`** (by T-008-02-01 design so the demo shows through), so a
  click on the pill can't be the trigger. "PRESS START" ⇒ the keyboard is the natural trigger.
- **Don't hijack browser chords / bare modifiers.** A start-on-keydown must not fire on lone
  Shift/Ctrl/Alt/Meta or on Cmd/Ctrl+R etc., or it would break reload and read as jank.
- Existing hard-drop/pause `event.repeat` edge-guards, and the `!attract` gates on the gravity loop
  and keyboard, must keep working unchanged once attract is off.
- `app/page.tsx` caption ("Auto-play demo — the CPU is playing") is now only half-true; a human can
  take over. Minor copy touch-up is in scope for honesty, not required by the AC.

## Files in play

- `components/GameContainer.tsx` — the change site (destructure the setter, add a start handler,
  branch the keyboard handler while attract).
- `components/useGame.ts` — `reset` already present; `DEFAULT_SEED` exported; no change expected.
- `components/GameContainer.test.tsx` — add start-handoff tests; reconcile the obsolete swallow test.
- `app/page.tsx` — optional caption tweak.
