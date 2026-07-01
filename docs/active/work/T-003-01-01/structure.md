# T-003-01-01 — Structure

File-level blueprint. Shape of the code, not the code.

## Files

### MODIFIED — `components/Cell.tsx`

Presentational square driven by one stored cell value.

- **Imports:** `import type { Cell as CellValue, TetrominoType } from "@/lib/types";`
- **Module constant:** `CELL_COLOR: Record<TetrominoType, string>` — literal `bg-piece-*` classes
  for all seven ids (D3). Not exported.
- **Props:** `interface CellProps { cell: CellValue }`.
- **Default export:** `function Cell({ cell }: CellProps)`.
  - `const filled = cell !== null;`
  - className: base `rounded-[2px]` always; when empty →
    `bg-white/5 ring-1 ring-inset ring-white/5`; when filled → `CELL_COLOR[cell]`.
  - Renders a single `<div>` with the computed className and `data-cell={cell ?? "empty"}`.
- **Docstring:** update — no longer "placeholder/no props"; now "presentational, driven by a stored
  `Cell` value; owns the empty-vs-filled look and the per-piece color map; no game logic."

### MODIFIED — `components/Board.tsx`

Presentational CSS-grid container that paints a board matrix.

- **Imports:** `Cell` (component), `type { Board as BoardMatrix } from "@/lib/types"`,
  `{ COLS, ROWS } from "@/lib/constants"` (empty-matrix fallback only).
- **Props:** `interface BoardProps { board: BoardMatrix }`.
- **Default export:** `function Board({ board }: BoardProps)`.
  - `const rows = board.length || ROWS;`
  - `const cols = board[0]?.length ?? COLS;`
  - container `<div>`: same neon/glass chrome as today
    (`grid gap-px rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl`), `aria-label="Tetris
    board"`, inline style `gridTemplateColumns/Rows` from `cols`/`rows`, `width: min(90vw, 300px)`,
    `aspectRatio: \`${cols} / ${rows}\``.
  - body: `board.flatMap((row, y) => row.map((cell, x) => <Cell key={y * cols + x} cell={cell} />))`.
- **Docstring:** update — no longer "placeholder/no props"; now "props-driven; flattens the
  row-major matrix at the render boundary; owns the grid container; delegates per-square look to
  `Cell`; no game logic."

### MODIFIED — `app/page.tsx`

- Import `{ emptyBoard } from "@/lib/board"` and `{ COLS, ROWS } from "@/lib/constants"`.
- Render `<Board board={emptyBoard(COLS, ROWS)} />` (D6 stopgap; hook lands in T-003-01-02).
- Header copy may stay "Scaffold — placeholder board" (still true: no live state yet).

### NEW — `components/Board.test.tsx`

Rendered-DOM verification of the AC (D5).

- First line docblock: `// @vitest-environment jsdom`.
- **Imports:** `render`, `cleanup` from `@testing-library/react`; `afterEach`, `describe`, `expect`,
  `it` from `vitest`; `Board` from `@/components/Board`; `emptyBoard` from `@/lib/board`;
  `{ COLS, ROWS }` from `@/lib/constants`; `type { Board as BoardMatrix }` from `@/lib/types`.
- `afterEach(cleanup)`.
- **Tests:**
  1. `renders ROWS*COLS cells for an empty board` — render `emptyBoard(COLS, ROWS)`; assert
     `container.querySelectorAll("[data-cell]").length === COLS * ROWS`; assert every one is
     `data-cell="empty"`.
  2. `filled cells are visually distinct from empty ones` — build a fixture from `emptyBoard`, set
     e.g. `board[19][0..3] = "I"` and `board[18][5] = "T"`; render; assert the `"I"`/`"T"` cells
     carry `data-cell="I"`/`"T"` and their className includes `bg-piece-i`/`bg-piece-t`, while an
     untouched cell has `data-cell="empty"` and no `bg-piece-` class.
  3. `grid dimensions track the matrix` — render a small non-standard fixture (e.g. 3×2) and assert
     cell count equals `w*h` (D2 — dimensions come from the matrix, not constants).

### MODIFIED — `package.json`

Add devDependencies: `@testing-library/react`, `jsdom` (and `@testing-library/dom` if npm does not
pull it transitively). No script changes — `npm test` (`vitest run`) picks up `*.test.tsx`
automatically and honors the per-file jsdom docblock.

## Module boundaries & interfaces

- **Public interface of this ticket:** `Board` now requires `board: Board` (lib type); `Cell` now
  requires `cell: Cell` (lib type). These are the props T-003-01-02's hook will feed.
- **Presentation lives in `components/`** (color map, class strings); **data model in `lib/`**
  (`Board`, `Cell`, `TetrominoType`, `emptyBoard`, `COLS/ROWS`). No new `lib/` code; no React in
  `lib/` (ESLint boundary preserved).
- **No game logic** crosses into the components — they read `cell === null` and index a static
  color map; nothing computes Tetris rules.

## Ordering of changes

1. `components/Cell.tsx` (leaf — no dependents change signature-wise until Board passes `cell`).
2. `components/Board.tsx` (consumes new `Cell`).
3. `app/page.tsx` (consumes new `Board`; keeps build green).
4. `package.json` devDeps + `npm install`.
5. `components/Board.test.tsx` (needs the tooling from step 4).

Steps 1–3 are one coherent source change (compiles together); 4–5 add verification.
