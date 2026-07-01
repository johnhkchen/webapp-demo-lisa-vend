# T-003-01-02 — Review

Handoff for **game-state-hook-and-mount** (S-003-01, E-003). Add a React hook/container that holds
the pure `lib/` core state and its active piece, mount it in `app/page.tsx`, and feed the current
board + active-piece view to `Board`.

## Acceptance criterion

> Loading the app renders the live starting board with the spawned active piece overlaid via the
> hook's state — reading from the core API, not a local reimplementation of rules.

**Met.** `app/page.tsx` renders `<GameContainer />`, a client island whose `useGame` hook seeds state
from `createInitialState(DEFAULT_SEED)` and derives the rendered matrix with the pure `overlayPiece`.
`GameContainer.test.tsx` asserts the 4 filled squares of the starting board are **exactly**
`pieceCells(active.type, active.position, active.rotation)` of the core-spawned piece — so the view
is provably sourced from the core, not reinvented in React. The offsets come only from `pieceCells`
(the same accessor collision/lock use); no shape math was added outside `lib/`.

## What changed

**Added**
- `lib/overlay.ts` — pure `overlayPiece(board, piece): Board`. Copies rows (`map(r => r.slice())`),
  paints `piece.type` at each in-bounds cell from `pieceCells`. Copy-on-write, bounds-guarded, total;
  overlay wins over settled cells. Framework-free (obeys the `lib/**` eslint boundary; imports only
  `./types` and `./collision`).
- `lib/overlay.test.ts` — 4 node tests: exact-cell paint, no-mutation of input/rows, settled-cell
  preservation + overlap-wins, off-grid cells skipped without throwing.
- `components/useGame.ts` — `"use client"` hook. `useState(() => createInitialState(seed))` (lazy →
  spawn/bag run once) + `useMemo(() => overlayPiece(state.board, state.active), [state])`. Exports
  `DEFAULT_SEED` (stable, hydration-safe), `GameView`, `useGame(seed = DEFAULT_SEED): { state, view }`.
- `components/GameContainer.tsx` — `"use client"` island: `useGame()` → `<Board board={view} />`.
- `components/GameContainer.test.tsx` — 2 jsdom tests: full `ROWS×COLS` grid; filled `(x,y,type)` set
  equals the core piece's `pieceCells`.

**Modified**
- `app/page.tsx` — replaced the stopgap `<Board board={emptyBoard(COLS, ROWS)} />` with
  `<GameContainer />`; dropped now-unused `Board`/`emptyBoard`/`COLS`/`ROWS` imports; subtitle
  "Scaffold — placeholder board" → "Live board — starting position". Remains a server component.

**Untouched:** `components/Board.tsx`, `components/Cell.tsx`, `lib/game.ts`, and the rest of `lib/`.
The props-driven `Board` from T-003-01-01 needed no change — overlaying is purely "hand it a composed
matrix."

## Design decisions (see design.md)

1. **Overlay as a generic pure primitive** (`overlayPiece(board, piece)`), not a `GameState` selector
   and not inline in React. Keeps `game.ts` focused, is node-testable, reuses `pieceCells`, and will
   serve a future ghost-piece / next-preview.
2. **One client island** (`GameContainer` + `useGame`); `page.tsx` stays server-rendered so the header
   isn't needlessly client-side.
3. **Fixed `DEFAULT_SEED`** for a deterministic, hydration-safe first paint. Confirmed by the build:
   `/` prerenders as **static** with no hydration warning.

## Test coverage

- **Suite:** 15 files / **128 tests** pass (122 prior + 6 new). Gates green: `npm run build`,
  `npm run lint` (`--max-warnings 0`), `npx tsc --noEmit`.
- **Unit (node):** `overlayPiece` fully covered — behavior, immutability, bounds.
- **Integration (jsdom):** `GameContainer` covers mount + overlay-from-core through the real
  `Board`/`Cell` render path.

**Gaps / not covered (by design):**
- No test of `useGame` in isolation — its behavior is observed through the container render (the only
  place it's observable via DOM). Acceptable; the hook is a thin holder.
- No visual/color assertion (jsdom can't compute styles); tests assert the `data-cell` contract, as
  established in T-003-01-01.
- No game-loop / input / gravity tests — none exists yet; that's the next ticket.

## Open concerns / notes for the reviewer & next ticket

1. **Static frame only.** This renders the *starting* position and never advances — there is no
   `requestAnimationFrame` loop or input dispatch (out of scope per the AC). The next ticket adds a
   `setState` to `useGame` and dispatches `step`; `seed` and the returned `state` are the seams left
   for it. No setter is exposed now, deliberately, so the surface reflects what this ticket does.
2. **Seed variety deferred.** `DEFAULT_SEED` is constant, so every load shows the same first piece.
   Per-load randomness must be introduced hydration-safely (e.g. seed after mount via an effect, or
   from a client-only source) by the new-game/loop ticket — not by reintroducing a random seed into
   the initial `useState`, which would reintroduce the hydration mismatch this design avoids.
3. **Overlay vs. settled indistinguishable in markup.** An overlaid active cell renders identically to
   a settled cell of the same type (`data-cell="<type>"`, same fill). Fine for gameplay rendering; if
   a later feature needs to style the active piece differently (e.g. a drop shadow / ghost), overlay
   would need to tag active cells distinctly — a known, deferred extension point.
4. **First client boundary in the project.** `GameContainer`/`useGame` introduce the first
   `"use client"` modules. The build confirms the page still statically prerenders.

## Risk assessment: **Low.**
Small, additive change behind a clean pure primitive and a thin hook. The one framework-specific risk
(hydration) is closed by a deterministic seed and verified by a static-prerender build; the one
correctness risk (board mutation) is closed by an explicit no-mutation test; and the AC's
"reimplementation" trap is closed by asserting the rendered cells equal the core's `pieceCells`.
