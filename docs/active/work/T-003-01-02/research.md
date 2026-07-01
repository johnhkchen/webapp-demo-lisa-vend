# T-003-01-02 — Research

Ticket: **game-state-hook-and-mount** (story S-003-01, epic E-003, advances P1).
Add a React hook/container that holds the pure `lib/` core state and its active piece, mounted in
`app/page.tsx`, feeding the current **board + active-piece** view to `Board`.

AC: *Loading the app renders the live starting board with the spawned active piece overlaid via the
hook's state — reading from the core API, not a local reimplementation of rules.*

This is a **descriptive** map of what exists and how it connects. No solutions here.

## The core API (`lib/`, pure, framework-free)

The game core is complete and tested (E-002). Everything the hook needs already exists:

- **`lib/game.ts`** — the composition root.
  - `interface GameState { board, active, bag, score, lines, level, gameOver }`. `board` holds only
    **settled** cells; `active: Piece` is the falling piece, always present, kept **separate** from
    the board. The docstring is explicit: *"a renderer overlays the active piece on top of the
    board."* That overlay does not exist yet — it is the heart of this ticket.
  - `createInitialState(seed: number): GameState` — builds an empty `COLS×ROWS` board, a seeded
    7-bag, and spawns the first piece from the bag. Deterministic in `seed`. The first spawn is onto
    an empty board so it never tops out; `gameOver` starts `false`.
  - `step(state, input): GameState` — the reducer (`left | right | rotateCW | rotateCCW | softDrop |
    tick`). **Not needed for this ticket** (no loop/input yet) but is the seam the next ticket wires.
- **`lib/types.ts`** — `Board = Cell[][]` (row-major `board[y][x]`), `Cell = TetrominoType | null`,
  `Piece { type, rotation, position }`, `Point`, `RotationState`.
- **`lib/collision.ts`** — exports **`pieceCells(type, pos, rot): Point[]`**: the absolute board
  cells a piece occupies = shape offsets translated by the anchor. Returns fresh points, never
  aliases the shared shape tables. Its docstring already advertises reuse "by the renderer and
  lock/merge in later tickets" — this is the ticket that consumes it for rendering.
- **`lib/tetrominoes.ts`** — `cellsFor(type, rotation)` / `TETROMINO_CELLS`, the shape offset tables
  behind `pieceCells`. Not called directly by the hook (go through `pieceCells`).
- **`lib/movement.ts`** — `spawnPiece(type, width)` centers a piece at `y = 0`. Used inside
  `createInitialState`; the hook does not call it directly.
- **`lib/board.ts`** — `emptyBoard(width, height)`; **`lib/constants.ts`** — `COLS = 10`, `ROWS = 20`.

**Key finding:** there is *no* existing function that merges `active` into `board` to produce a
renderable matrix. A repo grep for `overlay|mergeActive|composeBoard|renderBoard` finds only prose
in docstrings. This composition is the new pure logic this ticket must add (in `lib/`, per the
boundary below).

## The rendering layer (`components/`, `app/`)

- **`components/Board.tsx`** — props-driven (`board: BoardMatrix`), delivered by the dependency
  ticket **T-003-01-01**. Flattens the row-major matrix into one `<Cell>` per square; grid
  dimensions derive from the matrix. Holds **no state, no logic**. It paints whatever matrix it is
  handed — so overlaying the active piece is purely a matter of handing it a *composed* matrix. No
  change to `Board` is required.
- **`components/Cell.tsx`** — presentational; `null` → translucent well, else per-piece neon fill via
  a static literal `CELL_COLOR` map (`bg-piece-*`). Emits `data-cell={cell ?? "empty"}` — the test
  seam. An overlaid active cell painted with its `TetrominoType` will render with the piece's fill
  and `data-cell="<type>"`, indistinguishable in markup from a settled cell (fine for this ticket).
- **`app/page.tsx`** — currently a **server component** that renders a *stopgap* static board:
  `<Board board={emptyBoard(COLS, ROWS)} />`. T-003-01-01's review flags this precisely: *"T-003-01-02
  must replace this with the live `GameState.board` from the state hook and add the active-piece
  overlay."* The header (`<h1>TETRIS</h1>` + subtitle) is presentational and can stay server-rendered.
- **`app/layout.tsx`** — root layout; body is a flex column. No change needed.
- No component currently carries `'use client'` — the app is entirely server-rendered so far. A hook
  that calls `useState`/`useMemo` forces the first client boundary in the project.

## Constraints & boundaries

- **`lib/**` eslint boundary** (`eslint.config.mjs`): `no-restricted-imports` forbids `react`,
  `react-dom`, `next` (and subpaths) anywhere under `lib/`. Therefore the **hook cannot live in
  `lib/`** — it must live in `components/` (the documented layout is `app/ components/ lib/`; there is
  no `hooks/` dir). Conversely, the pure **overlay/composition logic belongs in `lib/`** so it stays
  testable and framework-free.
- **Purity / reuse (AC):** "reading from the core API, not a local reimplementation of rules." The
  hook must obtain the piece's occupied cells via `pieceCells` (or a lib helper built on it), **not**
  re-derive shape offsets in React. `createInitialState` must be the source of the starting state.
- **Hydration:** a `'use client'` component still server-renders its initial HTML. If the initial
  `GameState` is seeded from a non-deterministic value (`Date.now()`, `Math.random()`), server and
  client will spawn different first pieces → React hydration mismatch. The seed for the initial
  render must be **stable** across server and client. `createInitialState` is deterministic given the
  seed, so a fixed/default seed avoids the problem.
- **Immutability:** `GameState.board` and the shape tables must not be mutated. `pieceCells` already
  returns fresh points; the overlay must write into a **copy** of the board, not the settled board.

## Testing landscape

- **Runner:** vitest 4. Default environment **node** (fast) for pure `lib/*.test.ts`; component tests
  opt into **jsdom** per-file via a `// @vitest-environment jsdom` docblock (see `Board.test.tsx`).
- **`vitest.config.ts`** resolves the `@/*` alias only — no global jsdom. `@testing-library/react` +
  `jsdom` are already dev deps (added by T-003-01-01). `render`/`cleanup` are the established pattern;
  tests query `[data-cell]` and assert `dataset.cell` / fill classes.
- **Suite baseline:** 13 files / 122 tests green. Gates: `npm run build`, `npm run lint`
  (`--max-warnings 0`), `tsc --noEmit`.

## Scope read (in vs. out)

- **In:** pure board+active composition in `lib/`; a client hook holding `createInitialState` state;
  a client container that renders `Board` from the composed view; mounting it in `page.tsx`.
- **Out (later tickets):** the `requestAnimationFrame` gravity loop, keyboard input → `step`, score/
  next-piece/game-over UI. The AC only requires the *starting* board with the spawned piece overlaid.

## Open questions carried into Design

1. Where does the overlay live and what is its signature — a generic `overlayPiece(board, piece)`
   primitive, or a `GameState → Board` selector? (Reuse vs. GameState-coupling.)
2. Client-boundary shape: make `page.tsx` a client component, or keep it server and add a client
   `GameContainer`? (Minimize the client surface; keep the header server-rendered.)
3. Seed policy for a deterministic, hydration-safe first render.
