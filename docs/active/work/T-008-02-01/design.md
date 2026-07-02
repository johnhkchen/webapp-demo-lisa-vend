# T-008-02-01 — Design: attract-driver-loop

## What must be true when done

1. On load, the board **auto-plays** with no keypress: pieces are AI-placed, lines clear.
2. On top-out, the demo **resets and continues** (fresh game, keeps looping).
3. A **start overlay** sits over the auto-playing board (arcade attract convention).
4. Existing `Board` rendering is **reused** (no new rendering path).
5. Covered by a **driver test**: successive frames advance bot-chosen state; game-over
   re-initializes.

## Decision 1 — How the driver feeds inputs: stateless one-input-per-frame

The bot's plan for a piece is a *sequence* (rotate ×k, shift ×m, hardDrop). Three ways to enact it:

- **(A) Plan-and-flush per tick.** Each interval, `chooseMove(state)` and dispatch the *whole*
  sequence at once → one piece placed per tick. Simple, but the piece **teleports** into place —
  no visible sliding/rotating. Poor juice for an attract screen.
- **(B) Pre-planned queue.** On the frame a new piece appears, `chooseMove` once, store the
  `Input[]` in a ref, dispatch one per frame until empty, then replan. Visible motion, but carries
  mutable ref state that must stay in lock-step with `state.active` (staleness risk across the
  lock→spawn frame).
- **(C) Stateless recompute.** Each frame: `const inputs = chooseMove(state)`; dispatch
  `inputs[0]` (or `"tick"` if empty). No stored plan.

**Chosen: (C).** Research established the enabling invariant: `enumeratePlacements` depends only on
`board` + piece `type`, both unchanged until the piece locks, so the *chosen placement* is
identical every frame while a piece falls — only the emitted relative maneuver shrinks as we nudge
the piece toward it. Dispatching `inputs[0]` each frame therefore converges deterministically and
ends with the plan's terminal `hardDrop`, which locks the piece and spawns the next; the following
frame replans the new active. This gives visible per-frame motion (B's payoff) with **zero stored
plan state** (A's simplicity) — no queue to desync, and it always reads the latest committed
`state`. Cost is recomputing `enumeratePlacements` (~4 rotations × ≤10 columns of cheap pure work)
per frame at the attract cadence (~8/s) — negligible.

Empty-plan case: `chooseMove` returns `[]` only when the board is topped out everywhere reachable.
Per its docstring, the driver then dispatches `"tick"` to let the game top out through `step`
(the next spawn collides → `gameOver`), which the reset branch then handles. So the loop is
self-healing at the reachability boundary rather than stuck.

## Decision 2 — Reset lives in `useGame`, driver decides *when*

"Resets and continues" needs a fresh `GameState`, and the core has no restart input — only
`createInitialState(seed)`. Two homes:

- Driver owns its own `useState<GameState>` and reimplements the hold/view/queue derivation. ✗
  Duplicates `useGame`; two state holders for one board; fights the "no rules reimplemented" norm.
- **Add `reset(seed)` to `useGame`** (`setState(createInitialState(seed))`, stable via
  `useCallback`), expose it on `GameView`, and have the driver call it. ✓

**Chosen: add `reset` to `useGame`.** One state holder; the driver is pure orchestration over
`{ state, dispatch, reset }`. This also directly serves `T-008-02-02` (its "fresh
`createInitialState` human game" is the same `reset`), so the seam is shared, not attract-only.

Seed choice on reset: a **deterministic counter** (`seedRef`, incremented each reset), not
`Math.random()`. Keeps every loop reproducible (tests, replays) while still varying the game each
top-out so the demo doesn't replay one identical game forever. The first game keeps `DEFAULT_SEED`
(server-render safe); resets use `DEFAULT_SEED + n`.

## Decision 3 — A dedicated driver hook, riding the existing rAF loop

Put the driver in `components/useAttractLoop.ts`:

```ts
useAttractLoop(game: { state; dispatch; reset }, active: boolean, intervalMs = ATTRACT_INTERVAL_MS)
```

Internally one `useAnimationFrameLoop(onTick, intervalMs, active)` where `onTick` is:

```
if (game.state.gameOver) { reset with next counter seed; return; }
const inputs = chooseMove(game.state);
game.dispatch(inputs.length ? inputs[0] : "tick");
```

Rationale: **reuse the timing seam** (latest-callback guarantee already handles the closure
capturing fresh `game.state` each render — the whole reason (C) is safe) rather than write a second
rAF loop. Keeping the driver a hook (not inline in `GameContainer`) mirrors `useClearFlash` /
`useAnimationFrameLoop` and makes it unit-testable in isolation with the manual pump. Taking `game`
as a small injected object (not calling `useGame` inside) lets the reset/game-over branch be tested
with a controlled fake — the key to a fast, deterministic reset test (Decision 5).

Rejected: driving via a raw `useEffect` on `state.gameOver` for reset + a separate loop for inputs.
Splitting the two responsibilities across two mechanisms invites races (a reset effect firing while
the input loop dispatches into a game-over state is a no-op, but the ordering is fragile). One loop,
one branch, is simpler and matches the "cadence owns when" model.

## Decision 4 — The `attract` gate in `GameContainer`, and the start overlay

`GameContainer` gains an `attract` flag (`const [attract] = useState(true)` — a state seam whose
setter `T-008-02-02` will wire to Start; kept as state, not a bare `const`, to avoid a
constant-condition lint and to be the exact hook the handoff flips).

- Attract driver: `useAttractLoop(game, attract)`.
- Human gravity loop: gated `!attract && !gameOver && !paused` — so it does **not** run while the
  bot drives (prevents double-advance, Research constraint).
- Keyboard: early-return while `attract` so stray keys don't fight the bot. (Full "no input
  bleed-through on handoff" is `T-008-02-02`'s AC; gating here is just "the bot plays uncontested".)

**Start overlay:** the ticket says the board auto-plays *behind* it, so it must **not** obscure the
board — `GameOverlay`'s full-dim/blur chrome is wrong for this. Add a small presentational
`StartOverlay` (arcade "PRESS START" banner, non-blocking: a bottom-anchored translucent pill,
`pointer-events-none`) shown while `attract`. It is **non-interactive this ticket** — that matches
the arcade idiom (attract screens show a blinking "PRESS START" while the demo plays) and leaves the
actual key/click handoff to `T-008-02-02`, which only needs to flip `attract` and `reset`. Update
`app/page.tsx`'s stale caption to reflect auto-play.

Rejected alternatives for the overlay: (a) a new `mode="start"` on `GameOverlay` — would either
inherit the obscuring dim (wrong) or fork its shared chrome (muddies a clean component); (b) no
overlay at all — fails AC point 3 and the "behind the start overlay" wording. A dedicated,
non-blocking component is the smallest honest fit.

## Decision 5 — Test strategy: isolate the branch, don't play a whole game

A greedy bot survives hundreds of pieces, so a *natural* top-out is impractical in a unit test
(Research). Split coverage:

- **Advance (real seam):** render `useGame` + `useAttractLoop` with the manual rAF pump; pump one
  frame and assert `state === step(initialState, chooseMove(initialState)[0])` — proves the driver
  dispatches the **bot-chosen** input, exactly (mirrors `useGame.gravity`'s "track the core"). Pump
  more frames and assert the settled board accumulates cells / a piece locks — proves it keeps
  advancing bot-chosen state across frames.
- **Reset (injected game-over):** render `useAttractLoop` with a *controlled* fake `game` whose
  `state.gameOver = true` and spy `reset`/`dispatch`; pump a frame → assert `reset` called (with a
  seed), `dispatch` **not** called. Flip a fresh non-game-over `state` in and pump again → asserts
  it resumes dispatching a bot input (the "then re-initialize and continue" half). Fast,
  deterministic, and covers exactly the AC's "until game-over then re-initialize."
- **No-legal-placement:** controlled fake with a fully-filled board (every spawn collides →
  `chooseMove` returns `[]`) → assert `dispatch("tick")`. Covers the empty-plan branch.

This is the same "isolate the seam with an injected dependency" move `bot.test.ts` used (oracle) —
honest about what is and isn't exercised, with the natural-top-out gap documented in the review.
