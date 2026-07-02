# T-008-02-01 — Research: attract-driver-loop

## Ticket in one line

Add the rAF **attract driver** that runs `chooseMove` behind a start overlay — auto-stepping the
bot's inputs at an accelerated drop speed, clearing lines, and looping (reset + continue) on
game-over — reusing the existing `Board` rendering.

Story `S-008-02` (*attract-mode-driver-and-handoff*) splits into this driver ticket and the
follow-on `T-008-02-02` (*start-handoff-clean*: pressing Start halts the bot and starts a fresh
human game with no input bleed-through). So the **handoff interaction is explicitly out of scope
here**; this ticket owns the driver + the loop + the observable auto-play, and leaves the Start
*dismissal* to the next ticket.

## The pieces that already exist

### Pure move planner — `lib/bot.ts` (the dependency just landed, commit `19a71bb`)

```ts
export function chooseMove(state: GameState): Input[]
```

- Reads only `state.board` and `state.active`; mutates nothing; deterministic.
- Enumerates every legal hard-drop of the active piece (`enumeratePlacements`), scores each with
  `evaluate` (`lib/bot-heuristic.ts`), and returns the rotate/shift/hardDrop `Input[]` that lands
  the piece at the best placement — **relative** to the active piece's current `(rotation, x)`.
- The returned sequence always ends with `"hardDrop"`, so it is length ≥ 1 whenever a placement
  exists; folding it through `step` lands the piece exactly on the chosen candidate.
- Returns `[]` **only** when there is no legal placement (`enumeratePlacements` empty — the stack
  reaches the top everywhere reachable, i.e. top-out is imminent). Its docstring names the intended
  driver behaviour for that case: *"an honest 'no move' a driver can follow with a `tick` to let
  the game top out through `step`."*

Key property for the driver (verified in `bot.ts`): candidate enumeration depends only on
`board` + piece `type`, never the piece's live position/rotation. So across successive frames while
the board is unchanged, `chooseMove`'s *chosen placement* is invariant; only the emitted relative
maneuver shrinks as the piece is nudged toward it. This makes a **stateless, one-input-per-frame**
driver feasible (see design).

### The game core — `lib/game.ts`

- `GameState` fields relevant here: `board` (settled cells only), `active`, `gameOver`, `paused`,
  `score`, `lines`, `clearedRows` (transient per-step flash indices).
- `step(state, input)` is the reducer. Once `gameOver` is set, **every** input is a no-op — so a
  driver cannot "play through" a topped-out state; it must reset.
- `createInitialState(seed)`: fresh empty board + first spawn; same seed ⇒ identical piece stream.
  The **only** way to get a fresh game — there is no in-core "restart" input.
- `"hardDrop"` runs the full lock→clear→score→spawn pipeline in one step; `"tick"` is one gravity
  step (used to force a topped-out board to actually set `gameOver`).

### React seam — `components/useGame.ts`

- `useGame(seed = DEFAULT_SEED)` holds one `GameState` (lazy `createInitialState`) and returns
  `{ state, view, ghost, queue, clearedRows, dispatch }`.
- `dispatch(input)` = `setState(s => step(s, input))` — referentially stable (empty deps).
- **There is no `reset`/`newGame` today.** The ticket's "resets and continues" requires one; this
  is the single gap in the seam. `DEFAULT_SEED = 0x5eed`, `GRAVITY_INTERVAL_MS = 800`.
- Note the hydration rationale on `DEFAULT_SEED`: the *first* server-rendered state must be seeded
  deterministically. A client-side reset after game-over is well past hydration, so a varied seed
  there is safe.

### Timing seam — `components/useAnimationFrameLoop.ts`

- `useAnimationFrameLoop(onTick, intervalMs, active = true)` — game-agnostic. Fires `onTick` once
  per `intervalMs` of elapsed wall-clock time; drains backlogs; reads `onTick` through a ref
  refreshed every render (**latest-callback guarantee**), re-subscribing only when
  `intervalMs`/`active` change; cancels on unmount / dep change. This is the exact loop the driver
  should ride — one bot input per interval.

### Container — `components/GameContainer.tsx`

- The single `"use client"` island. Wires `useGame` → `Board` + overlays, and the keyboard →
  `dispatch`. Runs the human gravity loop:
  `useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS, !gameOver && !paused)`.
- Renders two `GameOverlay`s (game-over, paused) over a `relative` wrapper, plus `HoldBox` /
  `NextPreview`. **All render inputs come from `state`**, so pointing the same components at a
  bot-driven state needs no rendering changes — exactly the "reusing the existing Board rendering"
  the ticket calls for.

### Overlay — `components/GameOverlay.tsx`

- Presentational, props-driven. `mode: "gameOver" | "paused"`, `visible`. When visible it lays a
  **full-board dimmed, backdrop-blurred** layer over the parent. That full-dim chrome would *hide*
  the auto-play, which conflicts with "board auto-playing **behind** the start overlay" — so an
  attract start overlay wants different, non-obscuring chrome (an arcade "PRESS START" banner), not
  a reuse of this dim layer.

### Page — `app/page.tsx`

- Server component; renders header (caption "Live board — starting position") + `GameContainer`.
  The caption is stale for an auto-playing demo.

## Test conventions (what the driver test must match)

- Vitest, `// @vitest-environment jsdom`, `@testing-library/react` `renderHook`/`act`/`cleanup`.
- `useAnimationFrameLoop.test.ts` establishes the canonical **manual rAF pump**: stub
  `requestAnimationFrame`/`cancelAnimationFrame`, store the pending callback, and drive frames by
  hand with explicit timestamps (`frame(now)`). No real timers → exact, observable cadence. The
  driver test should reuse this pump.
- `useGame.gravity.test.ts` shows the "track the pure core exactly" style: drive the hook and an
  independent `step(...)` chain from the same seed and assert equality — the strongest possible
  "no rules reimplemented" check. The driver test can mirror it against `chooseMove`.
- Suite currently green at **285 tests / 29 files**; lint runs `--max-warnings 0`; `npm run build`
  must pass (type-check).

## Constraints & assumptions

- **`lib/` stays pure** (eslint boundary): the driver is React glue and belongs in `components/`,
  importing `chooseMove` from `lib/`. No game rules may be reimplemented in the driver.
- **No `Date.now()`/`Math.random()`** for anything that could affect the first render; a
  post-game-over reset seed may vary but should stay deterministic (a counter, not RNG) so tests
  and replays are stable.
- **Two loops must not both drive**: the human gravity `"tick"` loop and the attract driver would
  double-advance the state if both ran. An `attract` gate must disable the human loop (and, to keep
  the bot un-fought, human keyboard dispatch) while the driver runs. This gate is the seam the
  handoff ticket (`T-008-02-02`) flips.
- Reachability boundary inherited from `chooseMove`: near top-out a lateral shift can be blocked
  (tuck/slide-under is a later ticket). In attract mode this coincides with imminent top-out, which
  the loop resolves by resetting — so it is self-correcting, not a stuck state.
- A greedy hole-avoiding bot on a full-width board survives **many** pieces, so driving a *natural*
  top-out in a unit test is impractically slow — the reset path needs an isolated, injected
  game-over state to test deterministically (see plan).
