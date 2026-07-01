# T-003-02-02 — Research: lock / clear / game-over render

## Ticket

Reflect the core's lock, line-clear, and game-over transitions on screen: locked cells
persist in the grid, a completed row visibly clears, and stacking to the top halts the
gravity tick in an observable game-over state. Depends on T-003-02-01 (gravity tick loop),
which is already merged.

## What already exists

### The pure core already produces every transition (lib/game.ts)

`step(state, input)` is the composition root. On a descent input (`tick`/`softDrop`) it calls
`descend(state)`:

- `applyGravity(board, active)` → if the piece can still fall, returns `{locked:false, piece}`;
  the reducer swaps in the new `active`. If it lands, returns `{locked:true, board}` with the
  piece **already merged** into a fresh settled board.
- On lock: `clearLines(board)` removes full rows, `scoreFor(cleared, level)` awards points,
  `lines += cleared`, then `spawnPiece(bag.next(), width)` spawns the next piece.
- **Game-over (top-out):** if the freshly spawned piece `collides` with the settled stack,
  `gameOver: true` is set. Once `gameOver` is true, `step` is a **no-op** (returns input state) —
  the loop can keep ticking harmlessly.

Consequence: **lock and line-clear are already fully reflected on screen** with zero new render
code. Because the settled cells live in `state.board` and the view is `overlayPiece(board, active)`
recomputed on every `setState`, a locked piece persists and a cleared row disappears the moment the
core does it. This ticket's lock/clear ACs are satisfied by existing plumbing; the *observable
game-over* is the real gap.

### The render + loop + hook seam

- `components/useGame.ts` — holds `GameState` in `useState`, derives `view = overlayPiece(board, active)`
  memoized on `state`, and exposes a stable `dispatch(input)` that runs `step`. **It already returns
  `state`** (the `GameView` interface: `{ state, view, dispatch }`), so `state.gameOver` is available
  to any consumer today. `DEFAULT_SEED = 0x5eed`, `GRAVITY_INTERVAL_MS = 800` are exported here.
- `components/GameContainer.tsx` — the single `"use client"` island. Calls `useGame()`, mounts the
  gravity loop `useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS)`, wires keydown →
  `dispatch`, and renders `<Board board={view} />`. It currently destructures only `{ view, dispatch }`
  and renders the bare board — no game-over branch.
- `components/useAnimationFrameLoop.ts` — `useAnimationFrameLoop(onTick, intervalMs, active=true)`.
  **Crucially it already has the `active` gate:** "When false, the loop does not run … A seam for
  pause/game-over." When `active` flips false the effect returns early and schedules no frame. Its
  tests prove `active=false` ⇒ zero ticks. GameContainer does **not** yet pass this argument.
- `components/Board.tsx` — props-driven CSS grid, paints the matrix, no state. Root is a `<div>` with
  `aria-label="Tetris board"`, sized `width: min(90vw,300px)`, `aspectRatio: cols/rows`.
- `components/Cell.tsx` — one square; `data-cell` attribute is `"empty"` or the tetromino id (tests
  read filled cells via `[data-cell]`).
- `lib/overlay.ts` — `overlayPiece(board, piece)`, pure copy-on-write compose.

### Styling vocabulary (app/globals.css)

The neon/glass theme utilities already ship (provisioned by E-004 ahead of consumers): `.glass`,
`.glow-*`, `.flash` (row-clear flash keyframes), `.motion*`. They live in `@layer components` so they
emit unconditionally. **However E-004 owns the visual wow / line-clear juice / animation** — that is a
separate epic (see E-003 "OUT OF SCOPE"). This ticket is E-003 (render + loop + input seam), so it
should render an *observable* game-over but not build out animated juice; the row-clear `.flash`
animation is E-004's to wire.

## Test conventions

- Vitest + `@testing-library/react`, jsdom via `// @vitest-environment jsdom` header per file.
  `npm test` = `vitest run`. Baseline: 4 files / 20 tests green.
- Component tests read filled squares through `[data-cell]` DOM order and compare against a core
  "ground truth" (`createInitialState` + `step` chain from `DEFAULT_SEED`) — the discipline is
  "prove the component reimplements no rules."
- `useAnimationFrameLoop.test.ts` shows the canonical **deterministic rAF pump**: stub
  `requestAnimationFrame`/`cancelAnimationFrame`, capture the pending callback, and drive frames by
  hand with explicit timestamps. This is the tool for testing gravity/game-over at the container level.
- Empirically (default seed, no lateral input): the stack tops out at **tick 108**, `lines=0` (pieces
  fall straight down and pile up). A container integration test can pump ~150 frames to reach game-over
  deterministically.

## Constraints & assumptions

- `lib/**` is framework-free (eslint boundary); all new React code lives in `components/`.
- No rules may be reimplemented in components — game-over is read from `state.gameOver`, never
  recomputed.
- The overlay must sit *over* the frozen board (board stays visible beneath), so a positioned wrapper
  is needed around `Board`.
- Stale comments: `useGame.ts` still says "there is still no requestAnimationFrame gravity loop" and
  GameContainer's is accurate post-T-003-02-01. Comment drift to fix where touched.
- Deterministic-render constraint (hydration): seeding stays fixed (`DEFAULT_SEED`); nothing here
  introduces `Date.now()`/`Math.random()`.
