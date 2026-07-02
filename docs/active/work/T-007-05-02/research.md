# T-007-05-02 — Research

Ticket: **pause-key-and-overlay**. Bind `P` to toggle pause, halt the rAF gravity
loop while paused, and show a pause overlay (via `GameOverlay`) that resumes descent
cleanly from the frozen state. Depends on T-007-05-01 (pause-state-core), which is
`done`.

Descriptive map of what already exists and how the pieces connect. No solutioning.

## What T-007-05-01 already delivered (the pure core)

`lib/game.ts` already carries the full pause semantics — this ticket wires them to the UI,
it does **not** touch the core.

- `GameState.paused: boolean` (game.ts:75) — a resumable running-state flag (distinct from
  the terminal `gameOver`). Initialized `false` in `createInitialState` (game.ts:130).
- `Input` union includes `"pause"` (game.ts:108).
- `step` reducer (game.ts:213):
  - `if (state.gameOver) return state;` — every input, incl. `"pause"`, is a no-op once
    the game is over. A finished game cannot be paused.
  - `if (input === "pause") return { ...state, paused: !state.paused };` — the toggle,
    placed **before** the paused gate so a paused game can always resume.
  - `if (state.paused) return state;` — one gate swallowing every *other* input as a
    same-reference no-op; gravity (`tick`), movement, rotation, drops, hold all freeze.
  - No bag draw / spawn on a toggle, so pausing never perturbs the piece stream.
- Covered by `lib/game.test.ts` (commit 2d95005): paused tick is a no-op, toggle-twice
  returns an equivalent state, bag not advanced.

Net: the reducer is complete. Nothing in `lib/` needs to change for this ticket.

## The React seam (where this ticket lives)

### `components/GameContainer.tsx` — the single client island

- Calls `useGame()` → `{ state, view, ghost, dispatch }` (GameContainer.tsx:64).
- Drives gravity: `useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS,
  !state.gameOver)` (GameContainer.tsx:69). The **third arg (`active`) is the gate** — it
  already halts the loop on game-over; pause is the second condition to add here.
- Keyboard: `KEY_TO_INPUT` record (GameContainer.tsx:49) maps `event.key` → `Input`. The
  `onKeyDown` effect (GameContainer.tsx:71) looks up the key, `preventDefault()`s consumed
  keys, and `dispatch`es. Hard-drop is the only edge-triggered key (`event.repeat` guard).
  Every other key rides OS auto-repeat.
- Renders `<Board>` inside a `relative` wrapper, with `<GameOverlay visible={state.gameOver}
  score lines />` as a sibling absolutely-positioned layer (GameContainer.tsx:93-100).

Pause must plug into three points here: (1) a `P`/`p` entry in `KEY_TO_INPUT`, (2) the
loop's `active` gate, (3) a pause overlay in the render tree.

### `components/GameOverlay.tsx` — the observable overlay

- Presentational, props-driven: `{ visible, score, lines }`. Returns `null` when hidden
  (GameOverlay.tsx:29) → zero DOM footprint during normal play. When visible, renders an
  absolutely-positioned dimmed layer (`absolute inset-0 … bg-black/70 backdrop-blur-sm`)
  with `role="alert"` and a hardcoded "GAME OVER" heading + "Score N · Lines N" summary.
- The banner text and `role` are currently **hardcoded to game-over**. The ticket says the
  pause overlay is shown "via GameOverlay", so this component must gain a way to render a
  *pause* variant while keeping the existing game-over rendering byte-identical.

### `components/useAnimationFrameLoop.ts` — the timing seam

- `useAnimationFrameLoop(onTick, intervalMs, active = true)`. The `active` flag already
  documents itself as "A seam for pause/game-over" (useAnimationFrameLoop.ts:31).
- When `active` is false the effect early-returns and schedules no frame
  (useAnimationFrameLoop.ts:46). When it flips false→true the effect re-runs, resetting
  `last = null` and `acc = 0` (lines 49-50) → **clean resume**: no backlog of accumulated
  ticks fires on unpause. This is exactly the "resume cleanly from the frozen state"
  behavior the AC wants, and it already works via the existing `active` mechanism.
- Dependency array is `[intervalMs, active]` (line 66), so toggling `active` cancels the
  pending frame (cleanup `cancelAnimationFrame`) and re-subscribes. No change needed here.

### `components/useGame.ts`

- Thin holder: `state`, memoized `view`/`ghost`/`queue`, stable `dispatch`. `dispatch` is
  generic over `Input`, so `"pause"` already flows through with no change (same as `"hold"`
  needed none). `state.paused` is already exposed on the returned `state`. No change needed.

## Testing patterns available

- `components/GameContainer.test.tsx`: jsdom, `@testing-library/react`. Uses `fireEvent.keyDown(window, { key })` for input assertions and a **deterministic rAF pump**
  (the `GameContainer — game over` describe block, lines 241-315): stubs
  `requestAnimationFrame`/`cancelAnimationFrame` to capture the pending callback and drives
  frames by hand with explicit timestamps. `pending === null` is the assertion that the loop
  has halted. This is the exact idiom to reuse for "P halts the loop / resumes it".
- `expectedAfter(...inputs)` helper reduces the pure core to ground-truth filled coords —
  the container assertions compare DOM against the core, never reimplementing rules.
- `components/GameOverlay.test.tsx`: renders the component directly, asserts `role`/text.
- `useAnimationFrameLoop.test.ts`: same rAF-pump idiom at the hook level.

## Constraints & assumptions

- Keep `lib/` pure and untouched — all changes are in `components/`.
- The existing game-over overlay rendering (text, `role="alert"`, classes) must stay intact;
  three GameContainer + GameOverlay tests assert on it.
- `paused` and `gameOver` are mutually exclusive at the core level (can't pause once over),
  so at most one overlay is ever visible.
- Key choice: `P` and `p` (Shift/CapsLock parity, matching the `c`/`C`, `x`/`X`, `z`/`Z`
  precedent). Pause key should `preventDefault()` like the other consumed keys.
- Build (`npm run build`) and lint (`--max-warnings 0`) must stay green; tests via `vitest run`.
- Advances P4 (per ticket).
