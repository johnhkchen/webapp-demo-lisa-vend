# Research — T-003-02-01 raf-gravity-tick

## Ticket in one line

Drive gravity from a `requestAnimationFrame` loop that steps the active piece down at a fixed
interval via the core `step(state, "tick")` transition and repaints. AC: on load with no input, the
piece descends one row per interval, locks when it can fall no further, then the next piece spawns.

## Where this ticket sits

Epic **E-003** (wire-playable-render-loop-input) bridges the pure `lib/` core to the screen: render
components, a rAF gravity tick, keyboard input. Story **S-003-02** (gravity-render-loop) is the tick
half; this ticket (T-003-02-01) is the automatic-descent loop. Sibling **T-003-02-02** and the
input story handle keyboard dispatch — explicitly *not* this ticket. `depends_on: [T-003-01-02]`,
which landed the render seam (`useGame` + `GameContainer`) this ticket extends.

## The pieces already in place

### The pure core — `lib/game.ts` (the seam this binds to)

- `createInitialState(seed): GameState` — empty `COLS×ROWS` board, seeded 7-bag, first piece spawned.
- `step(state, input): GameState` — the reducer. Relevant input: **`"tick"`** (one gravity step).
  - `step` already implements the *entire* AC pipeline. `descend(state)` calls `applyGravity`; if the
    piece fell it swaps in the new `active`; if it **locked** it clears lines, scores, accumulates
    lines, **spawns the next piece from the bag**, and sets `gameOver` if that spawn collides.
  - Once `state.gameOver` is set, `step` is a **no-op** (returns the same reference) — a loop can keep
    ticking harmlessly.
- `Input` union includes `"tick"` and `"softDrop"` (currently identical single gravity steps).

**Consequence:** the ticket needs **no new game logic**. Every rule the AC names
(descend / lock / spawn) already exists behind `step(state, "tick")`. This is purely a *seam*
ticket: build the clock that dispatches `"tick"` and feeds the result back into React state.

### `lib/gravity.ts` — what one tick does underneath

- `applyGravity(board, piece)` → `Fell { locked:false, piece }` when `softDrop` returned a *different*
  piece object (it moved), or `Locked { locked:true, board: merged, piece:null }` when `softDrop`
  returned the *same reference* (blocked → lock via `lockPiece`). Floor-landing and stack-landing are
  unified through `softDrop`/`collides`. Copy-on-write; never mutates inputs.

### The render seam — `components/useGame.ts` (landed by T-003-01-02)

```ts
export function useGame(seed = DEFAULT_SEED): GameView {
  const [state] = useState(() => createInitialState(seed));   // NO setter exposed
  const view = useMemo(() => overlayPiece(state.board, state.active), [state]);
  return { state, view };
}
```

- Holds core `GameState`; derives the composed `view` (settled board + active piece overlaid) via the
  pure `overlayPiece`. Reimplements no rules.
- **`DEFAULT_SEED = 0x5eed`** — fixed on purpose: a `"use client"` component still server-renders its
  first HTML, so a non-stable seed (`Date.now()`) would spawn a different first piece server vs.
  client and trip hydration. The `seed` param and returned `state` are the seams "the loop ticket
  will consume" (its own docblock).
- **No `setState` is exposed** — the T-003-01-02 design explicitly says: *"The setter will be surfaced
  when `step`-dispatch lands."* That is this ticket.

### `components/GameContainer.tsx` — the single client island

```tsx
export default function GameContainer() {
  const { view } = useGame();
  return <Board board={view} />;
}
```

- The only `"use client"` boundary that mounts state; `app/page.tsx` stays a server component and just
  renders `<GameContainer />`. Docblock: *"the gravity loop arrive[s] in a later ticket and will hang
  off the same hook."* This is where the loop wires in.

### `components/Board.tsx` / `Cell.tsx`

Props-driven; paint a `Board` matrix to a grid of `[data-cell]` squares. Re-render whenever the
`board` prop identity changes — so a new composed `view` each tick repaints automatically.

## Constants / timing

- `lib/constants.ts` holds **only** board dims (`COLS=10`, `ROWS=20`) — deliberately "pure game
  logic". Timing/feel is explicitly *not* pure: `gravity.ts` calls lock-delay/timing "a feel/timing
  concern, not pure logic." So a gravity **interval** constant belongs in the **seam** layer
  (components), not `lib/`.

## Tooling / test patterns

- **vitest 4** (`npm test` → `vitest run`). Default env **node**; component/hook tests opt into jsdom
  per-file via a `// @vitest-environment jsdom` docblock (see `GameContainer.test.tsx`). `@/*` alias
  resolved by `vitest.config.ts`.
- `@testing-library/react` **16.3.2** — provides `render`, `cleanup`, **`renderHook`**, and **`act`**
  (needed to drive a hook's state updates and to flush effects).
- Existing precedent: `GameContainer.test.tsx` renders the island and recovers filled `[data-cell]`
  squares as `(x,y,type)`, comparing against ground truth from the core (`pieceCells`). The same
  "assert against the core, don't reimplement" discipline applies here.

## Environment constraints that shape the design

- **React 19 + Next 16 App Router.** `reactStrictMode` is unset in `next.config.ts` → **defaults to
  `true`**. In dev, Strict Mode **double-invokes** state-updater functions and effect
  setup/cleanup to surface impurity.
- **`GameState.bag` is a live, mutating 7-bag** (`bag.next()` advances closure state). `game.ts`'s
  purity note calls this "the one intentional side effect `step` performs" and defers a serializable
  bag to a later refactor. **Implication for this ticket:** a `setState(s => step(s,"tick"))` updater
  is *not* value-pure (a lock advances the bag), so Strict Mode's dev double-invoke can advance the
  bag twice per lock. Must be surfaced in Design as a known dev-only tension (prod build does not
  double-invoke). Not this ticket's to fix — the fix is the core bag refactor.
- **RAF banned globals:** N/A to app code, but note the workflow's own constraint that `Date.now()`
  is avoided — the rAF callback receives a `DOMHighResTimeStamp` argument, so the loop can derive
  deltas from that timestamp rather than any wall-clock call.

## Assumptions & open questions (for Design)

1. **One tick = one gravity step.** `step(state,"tick")` moves the piece down exactly one row (or
   locks). The loop must therefore fire `"tick"` once per gravity *interval*, not once per animation
   frame (~60/s would be unplayably fast).
2. **Interval value** is a feel choice; classic ≈ 800 ms/row at level 1. Level-scaled speed is out of
   scope (E-003 lists levels as a separate epic).
3. **Where the loop lives:** a generic rAF hook (timing) vs. folding rAF into `useGame` (state).
   Separation of "what advances" from "when" mirrors the codebase's pure-core-vs-seam ethic — to be
   decided in Design.
4. **Feeding latest state:** the loop fires repeatedly over time, so the tick dispatch must use a
   functional `setState` updater (or a ref) to avoid stepping a stale state snapshot.
5. **Cleanup:** the rAF must be cancelled on unmount to avoid a leaked loop / setState-after-unmount.
