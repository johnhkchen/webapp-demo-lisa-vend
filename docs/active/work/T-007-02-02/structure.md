# Structure — T-007-02-02 ghost-render-translucent

The shape of the change. Four component files modified, one test file created, one test file
extended. No `lib/` changes. Ordering matters: leaf-out (`Cell` → `Board` → `useGame` →
`GameContainer`) so each layer compiles against an already-updated dependency.

## Files

### MODIFY `components/Cell.tsx`

The leaf. Gains the translucent ghost variant.

- **New prop:** `ghost?: TetrominoType | null` (default `null` / undefined). The tetromino id
  whose hue tints this square as a ghost, or `null`/absent for a normal square.
- **New literal map** beside `CELL_COLOR`:
  ```ts
  const GHOST_COLOR: Record<TetrominoType, string> = {
    I: "bg-piece-i/15 ring-1 ring-inset ring-piece-i/60",
    O: "bg-piece-o/15 ring-1 ring-inset ring-piece-o/60",
    T: "bg-piece-t/15 ring-1 ring-inset ring-piece-t/60",
    S: "bg-piece-s/15 ring-1 ring-inset ring-piece-s/60",
    Z: "bg-piece-z/15 ring-1 ring-inset ring-piece-z/60",
    J: "bg-piece-j/15 ring-1 ring-inset ring-piece-j/60",
    L: "bg-piece-l/15 ring-1 ring-inset ring-piece-l/60",
  };
  ```
  Literal strings on purpose (same Tailwind-v4 tree-shaking reason `CELL_COLOR` documents).
- **Render decision** (three-way, order matters — settled wins over ghost):
  1. `cell !== null` → solid fill `rounded-[2px] {CELL_COLOR[cell]}`, `data-cell={cell}`. (ghost
     ignored — the Decision B guard means it won't be set here anyway, but settled-wins is explicit.)
  2. `cell === null && ghost` → `rounded-[2px] {GHOST_COLOR[ghost]}`, `data-cell="empty"`,
     `data-ghost={ghost}`.
  3. else → empty `rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5`, `data-cell="empty"`,
     no `data-ghost`.
- **Interface:** `CellProps { cell: CellValue; ghost?: TetrominoType | null }`.
- Doc comment updated to describe the third (ghost) state and that it renders only on an empty cell.

### MODIFY `components/Board.tsx`

Zips the separate ghost channel onto the grid by key.

- **New props (both optional, back-compatible):**
  - `ghost?: Point[]` — the landing cells from `ghostCells`. Default `[]`.
  - `ghostType?: TetrominoType | null` — the active piece's id for hue. Default `null`.
- **Derive a lookup set** once per render, keyed identically to the existing `Cell` key:
  ```ts
  const ghostKeys = new Set(ghost.map((p) => p.y * cols + p.x));
  ```
- **Per-cell pass-through** in the existing `flatMap`:
  ```ts
  const key = y * cols + x;
  const isGhost = ghostType !== null && ghostKeys.has(key);
  return <Cell key={key} cell={cell} ghost={isGhost ? ghostType : null} />;
  ```
- `Board` stays presentational: it does no game math, only a set membership test against the
  cells handed in. Doc comment updated to note the optional ghost channel and that the ghost is
  advisory — `Cell` still guards on the underlying cell being empty.
- Imports: add `Point`, `TetrominoType` from `@/lib/types`.

### MODIFY `components/useGame.ts`

Derives the ghost beside the existing composed `view`.

- **New memo:** `const ghost = useMemo(() => ghostCells(state.board, state.active), [state]);`
- **Expose on `GameView`:** add `ghost: Point[]` to the interface and the return object.
  (The type is exposed separately by the container from `state.active.type`; no new field needed
  for it, but for symmetry the container reads `state.active.type` directly.)
- Import `ghostCells` from `@/lib/ghost` and `Point` from `@/lib/types`.
- Doc comment: note that the hook now also derives the ghost landing (same pure-reuse discipline as
  `overlayPiece` — no shape/collision math here).

### MODIFY `components/GameContainer.tsx`

Threads the ghost props into `Board`.

- Destructure `ghost` from `useGame()`: `const { state, view, ghost, dispatch } = useGame();`
- Render: `<Board board={view} ghost={ghost} ghostType={state.active.type} />`.
- Doc comment: one line that the translucent ghost (landing marker) is now passed alongside the
  composed view.

### CREATE `components/Cell.test.tsx`

New file — the AC requires `Cell` coverage of the ghost variant. `// @vitest-environment jsdom`,
`@testing-library/react`, `afterEach(cleanup)`. Cases (see plan for assertions):

- empty cell → `data-cell="empty"`, no `data-ghost`, no `bg-piece-`.
- settled cell → `data-cell="T"`, solid `bg-piece-t`, no `data-ghost`, no `/` opacity fill.
- ghost on empty cell → `data-ghost="T"`, `data-cell="empty"`, translucent `bg-piece-t/15` + ring.
- settled cell **with** a ghost prop → settled wins: `data-cell="T"`, **no** `data-ghost` (guard).

### MODIFY `components/Board.test.tsx`

Extend with a `describe("Board — ghost", ...)` (or add `it`s). Cases:

- Passing `ghost=[{x,y}...]` + `ghostType` renders exactly those squares with `data-ghost={type}`,
  in the right grid positions (recover x,y from row-major index, same idiom as existing tests).
- Ghost squares keep `data-cell="empty"` and carry the translucent hue class; non-ghost empties do
  not (`data-ghost` absent).
- A ghost coordinate that lands on a **filled** cell does not override it: that square stays
  `data-cell={type}` with no `data-ghost` (suppression at the leaf).
- No ghost props → grid identical to today (regression guard; existing tests already cover this).

## Ordering & rationale

1. `Cell` first — leaf, no dependants broken (new prop is optional).
2. `Board` — consumes `Cell`'s new prop; still back-compatible (ghost props optional) so
   `GameContainer` and existing `Board` tests compile before they're touched.
3. `useGame` — additive field on `GameView`.
4. `GameContainer` — wires 2 → 3 together.
5. Tests — `Cell.test.tsx` created, `Board.test.tsx` extended. Run full suite + lint + build.

## Interfaces after the change

```ts
// Cell.tsx
interface CellProps { cell: Cell; ghost?: TetrominoType | null }

// Board.tsx
interface BoardProps { board: Board; ghost?: Point[]; ghostType?: TetrominoType | null }

// useGame.ts
interface GameView { state: GameState; view: Board; ghost: Point[]; dispatch: (i: Input) => void }
```

## Invariants preserved

- `lib/**` purity: untouched; ghost math stays in `lib/ghost.ts`.
- Existing `data-cell` semantics: ghost squares are still `data-cell="empty"` → all current
  assertions (`filledCoords`, grid length, `bg-piece-` fill checks) hold.
- Hydration determinism: ghost derives from `state` only; no time/random introduced.
- `Board` stays logic-free (set membership only); view derivation stays in `useGame`.
