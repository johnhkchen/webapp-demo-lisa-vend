# Research — T-003-03-01 move-rotate-keys

## Ticket

Wire keydown handlers for left/right move and rotate through the core transitions so the
active piece responds to the keyboard. Illegal moves (wall/collision) must be no-ops.

Depends on **T-003-01-02** (GameContainer + useGame island), which is landed.

## The core is already complete for this ticket

The pure reducer `lib/game.ts` `step(state, input)` already handles every intent this
ticket needs — nothing in `lib/` has to change.

- `Input` alphabet (`lib/game.ts:70`): `"left" | "right" | "rotateCW" | "rotateCCW" |
  "softDrop" | "tick"`. The first four are exactly the move/rotate intents.
- `step` (`lib/game.ts:126`):
  - `case "left"` → `moveLeft(board, active)`
  - `case "right"` → `moveRight(board, active)`
  - `case "rotateCW"` → `rotateCW(board, active)`
  - `case "rotateCCW"` → `rotateCCW(board, active)`
  - Each returns `{ ...state, active: <new piece> }` and touches nothing else.
  - `if (state.gameOver) return state;` — inputs are already no-ops after game over.

### Collision / wall limits are already enforced below `step`

- `lib/movement.ts` `tryMove` (line 46): proposes a shifted position, asks `collides`,
  and returns the **input piece reference unchanged** when blocked — the documented
  "no-op contract" (`next === prev`). `moveLeft`/`moveRight` delegate to it.
- `rotateCW`/`rotateCCW` (`lib/rotation.ts`) are collision-gated the same way (SRS kicks).
- Net: the "illegal moves are no-ops" acceptance criterion is satisfied by the core.
  This ticket only needs to *route keystrokes into `step`* and re-render.

## The React seam (what must change)

### `components/useGame.ts`

- Holds `const [state] = useState(() => createInitialState(seed))` — note **no setter is
  destructured** (line 42). The module doc explicitly says "no input dispatch yet … which
  is why no setter is exposed. The `seed` parameter and the returned `state` are the seams
  that ticket will consume." This ticket is that consumer.
- Returns `GameView { state, view }`; `view` is `overlayPiece(state.board, state.active)`
  memoized on `state` (line 43). A new `state` object ⇒ recomputed view ⇒ re-render.
- To drive input we must (a) capture the setter and (b) expose a `dispatch(input: Input)`
  that does `setState(s => step(s, input))`.

### `components/GameContainer.tsx`

- The single `"use client"` island (line 15). Currently `const { view } = useGame();`
  then `<Board board={view} />`. Its doc: "Input and the gravity loop arrive in a later
  ticket and will hang off the same hook." This is that ticket (input half only).
- Needs a `useEffect` that attaches a `window` `keydown` listener mapping keys → dispatch,
  and cleans it up on unmount.

### `components/Board.tsx`

- Pure props-driven CSS grid; no state, no logic. **No change needed.** Re-renders when
  `GameContainer` passes a new `view`.

## Testing patterns in the repo

- Component tests use `// @vitest-environment jsdom`, `@testing-library/react`
  (`render`, `cleanup`), and `afterEach(cleanup)` — see `components/GameContainer.test.tsx`.
- That file already recovers `(x, y, type)` of filled DOM squares from row-major
  `[data-cell]` order and compares against core ground truth (`pieceCells`, `createInitialState`).
  The move/rotate test can reuse this exact readback helper to assert the piece moved.
- `@testing-library/react` re-exports `fireEvent` and `act`; dispatching a real
  `keydown` on `window` (`fireEvent.keyDown(window, { key: "ArrowLeft" })`) is the natural
  driver. React 19 state updates from event handlers must be wrapped so they flush (RTL's
  `fireEvent` wraps in `act`).
- `lib/game.test.ts` shows the core-level movement contracts already have coverage; this
  ticket's tests are about the *wiring*, not re-testing `step`.

## Constraints & assumptions

- **Scope fence:** T-003-03-02 (sibling) owns soft-drop / hard-drop and depends on the rAF
  gravity loop (T-003-02-01). This ticket must NOT add gravity, a rAF loop, soft-drop, or
  hard-drop. Only left / right / rotate.
- The `lib/**` eslint boundary forbids React imports in `lib/` but places no restriction on
  `components/` importing from `lib/` — so `useGame` importing `step`/`Input` is fine.
- SSR/hydration: `useGame` uses a fixed `DEFAULT_SEED` deliberately; input handling adds a
  `keydown` listener which must be attached in `useEffect` (client-only) to stay SSR-safe.
- Arrow keys scroll the page by default — the handler should `preventDefault()` on keys it
  consumes.
