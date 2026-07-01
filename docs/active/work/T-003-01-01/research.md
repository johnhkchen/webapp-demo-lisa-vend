# T-003-01-01 — Research

_Ticket: replace the placeholder Board with a props-driven Board/Cell pair that paints a board
matrix to a DOM/CSS grid, distinguishing empty vs. filled cells. No game logic in the component._

## Scope boundary (what this ticket is and is NOT)

This is the **first** ticket of story S-003-01 (`render-live-board`). Its sibling
T-003-01-02 (`game-state-hook-and-mount`, depends on this one) owns the React hook, the mount
wiring, and **overlaying the active piece**. So this ticket is strictly:

- Board/Cell become **props-driven** and purely presentational.
- Board accepts a settled-board matrix and paints an ROWS×COLS grid.
- Filled cells are visually distinct from empty ones.
- **No** active-piece overlay, **no** hook/state, **no** game logic in the components.

The dependency `T-002-03-03` (the `step`/`GameState` reducer) is what produces the board matrix
this component will eventually consume; `T-001-03-01` produced the placeholder Board/Cell being
replaced. Both are complete on `main`.

## Current state of the components (what gets replaced)

- `components/Board.tsx` — placeholder. No props, no state. Builds a flat
  `Array(COLS*ROWS)` and renders one propless `<Cell />` per position inside a CSS-grid `<div>`.
  Grid template is `repeat(COLS,…) / repeat(ROWS,…)`, `aspect-ratio: COLS/ROWS`,
  `width: min(90vw, 300px)`, with neon/glass container chrome
  (`rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl`). `aria-label="Tetris board
  (placeholder)"`.
- `components/Cell.tsx` — placeholder. No props. Renders one empty square:
  `rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5`. The docstring explicitly reserves
  "the first prop here (fill / color for a settled or active piece)" for this epic — this ticket
  is exactly that seam.
- `app/page.tsx` — renders `<Board />` with no props inside a centered `<main>`; header reads
  "Scaffold — placeholder board". Because Board is about to require a `board` prop, page.tsx must
  be updated to keep the build green (the live hook that feeds it lands in T-003-01-02).

## The data model this must render (`lib/`)

- `lib/types.ts`:
  - `Cell = TetrominoType | null` — one stored square; `null` = empty, else the settling piece id.
    **Name clash**: the React component is also `Cell`; the value type must be imported under an
    alias in component code.
  - `Board = Cell[][]` — **row-major**, `board[y][x]`, outer = rows (height), inner = cols (width).
  - `TetrominoType = "I"|"O"|"T"|"S"|"Z"|"J"|"L"`.
  - `Point`, `Piece`, `RotationState` — not needed here (active piece is next ticket).
- `lib/constants.ts`: `COLS = 10`, `ROWS = 20`.
- `lib/board.ts`: `emptyBoard(width, height): Board` — every cell `null`. Useful as the temporary
  fixture for `page.tsx` until the hook lands, and for tests.
- `lib/game.ts`: `GameState.board` holds **only settled cells**; the `active` piece is kept
  separate ("a renderer overlays the active piece on top of the board"). Confirms this component
  renders the settled matrix only; overlay is T-003-01-02.

Note the intentional divergence (documented in `types.ts`): the model is 2D `board[y][x]`, whereas
the placeholder renderer used a flat array. This component flattens the 2D matrix **at its
boundary** (row-major → single pass) to fill the CSS grid.

## Styling vocabulary already available (`app/globals.css`)

E-004 pre-provisioned a full neon vocabulary ahead of any consumer — this ticket is a natural
first consumer of the color tokens:

- **Per-piece color utilities**: `@theme static` emits `--color-piece-{i,o,t,s,z,j,l}` (oklch,
  one hue per piece), which generates the `bg-piece-*`, `text-piece-*`, `border-piece-*`,
  `ring-piece-*` utility families. `@theme static` forces the **CSS variables** into the build
  unconditionally, but the **utility classes** are still emitted on-demand by Tailwind v4's source
  scanner — so a class must appear as a **literal string** in scanned source to be generated.
- **Glow**: `.glow-{piece}` radiate a neon halo in the piece hue (single class). Optional wow;
  the AC only requires "visually distinct."
- **Glass / flash / motion**: panel material, row-clear flash, compositor-only transitions —
  all later-epic juice, out of scope here.

### Tailwind v4 dynamic-class constraint (critical)

Tailwind v4 scans source for **literal** class strings. A computed name like
`` `bg-piece-${type.toLowerCase()}` `` will **not** be generated. Any per-piece class must be a
full literal, so the color mapping must be a static `Record<TetrominoType, string>` of literal
class names (e.g. `I: "bg-piece-i"`). This is the single most important implementation constraint.

## Build / test / lint infrastructure

- `package.json` scripts: `dev`/`build`/`start` (Next 16.2.9), `lint`
  (`eslint --max-warnings 0`), `test` (`vitest run`, vitest ^4). React 19.2.4.
- **No vitest config file** exists — vitest runs with defaults (**node** environment). All current
  tests are pure `lib/*.test.ts` (bag, board, collision, determinism, game, gravity, line-clear,
  movement, rng, rotation, scoring, tetrominoes). None render React.
- **No component-test infra**: `@testing-library/react` and `jsdom` are **not** installed. Testing
  a rendered component (as the AC implies — "Rendering Board with a fixture board matrix shows an
  ROWS×COLS grid…") requires a DOM environment + a render helper.
- **ESLint boundary** (`eslint.config.mjs`): `lib/**` may not import react/react-dom/next. So any
  render-specific mapping (Tailwind class strings) must live in `components/`, not `lib/` — even
  though a string map is technically framework-free, it is a presentation concern and the lint
  rule keeps `lib/` clean.
- `tsconfig.json`: path alias `@/* → ./*` (e.g. `@/lib/types`, `@/components/Cell`).

## Constraints & assumptions

- **C1** No game logic in the components (AC + CLAUDE.md). Board/Cell are pure presentation of a
  passed matrix; they compute nothing about Tetris rules.
- **C2** Component must be driven by the passed matrix's dimensions, not hard-coded, to honor
  "props-driven" — grid rows/cols should derive from `board.length` / `board[0].length` (falling
  back to ROWS/COLS only for an empty matrix).
- **C3** Per-piece colors must be literal Tailwind classes (see above).
- **C4** Must keep `app/page.tsx` compiling once Board requires a prop; the real state source is
  T-003-01-02, so page.tsx passes a temporary `emptyBoard(COLS, ROWS)` fixture.
- **C5** Verifying the AC needs a rendered-DOM assertion, which needs new dev tooling (jsdom +
  a React render helper) — a genuine infra decision for the Design phase.
- **A1** (assumption) It is acceptable to add `@testing-library/react` + `jsdom` as devDeps and to
  scope the DOM environment to component test files only (leaving lib tests in node), rather than
  skipping a render test. This matches the AC's "Rendering Board…" wording.
- **A2** (assumption) A small `data-*` attribute on each cell is an acceptable, low-cost
  testability/debug seam in production markup (used to assert filled vs. empty and count cells).
