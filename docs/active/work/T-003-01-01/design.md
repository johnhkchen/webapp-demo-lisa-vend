# T-003-01-01 — Design

Decisions for turning Board/Cell into a props-driven, presentational renderer of a settled-board
matrix, grounded in the Research findings.

## D1 — Component API shape

**Chosen:** `Board({ board }: { board: BoardMatrix })` and
`Cell({ cell }: { cell: CellValue })`, where `BoardMatrix = import("@/lib/types").Board` and
`CellValue = import("@/lib/types").Cell`, both imported as **type-only** and **aliased** to dodge
the `Cell` component/type name clash.

- Board maps the 2D matrix in row-major order to a flat list of `<Cell>` children (flatten at the
  component boundary, as `types.ts` prescribes), keyed by `y*cols + x`.
- Cell receives one `CellValue` and decides fill vs. empty from `cell === null`.

**Rejected — Cell takes a `color`/`filled` boolean instead of the raw cell value:** would push the
type→style decision up into Board, spreading presentation logic across two files. Passing the raw
`CellValue` keeps Cell the single owner of "how a square looks," which is the seam its docstring
reserved.

**Rejected — Board takes `cells: CellValue[]` (pre-flattened) + explicit rows/cols:** shifts the
flatten responsibility onto every caller and loses the "paint a board matrix" framing in the AC.
The matrix is the natural unit; Board flattens it.

## D2 — Grid dimensions: derive from the matrix, not constants

**Chosen:** `rows = board.length`, `cols = board[0]?.length ?? COLS` (and `rows` falls back to
`ROWS` when the matrix is empty). The CSS grid template and `aspect-ratio` are built from these.

Rationale: "props-driven" (C2) means the rendered grid reflects the data handed in, so a fixture of
any size renders correctly and the test can assert an ROWS×COLS grid **because the fixture is
ROWS×COLS**, not because the component hard-codes it. Constants remain only as the empty-matrix
fallback so a degenerate `[]` still yields a sane frame.

**Rejected — keep `repeat(COLS)/repeat(ROWS)` from constants:** contradicts "props-driven"; a
mismatched fixture would render a broken grid silently.

## D3 — Per-piece color mapping (the Tailwind v4 constraint)

**Chosen:** a static `Record<TetrominoType, string>` of **literal** class strings, co-located in
`components/Cell.tsx`:

```ts
const CELL_COLOR: Record<TetrominoType, string> = {
  I: "bg-piece-i", O: "bg-piece-o", T: "bg-piece-t", S: "bg-piece-s",
  Z: "bg-piece-z", J: "bg-piece-j", L: "bg-piece-l",
};
```

Every class is a literal, so Tailwind v4's scanner emits each `bg-piece-*` utility (Research C3 —
computed names like `` `bg-piece-${t}` `` would be tree-shaken away). The `--color-piece-*` tokens
already exist (`@theme static`), so these utilities resolve to the intended neon hues.

**Location:** in `components/`, not `lib/`. Even though a string map is framework-free, it is a
pure **presentation** concern and the `lib/**` ESLint boundary (Research) keeps rendering vocab out
of `lib/`. Co-locating in `Cell.tsx` keeps the type→class decision next to the only consumer.

**Rejected — inline `style={{ backgroundColor: "var(--color-piece-i)" }}`:** bypasses the utility
layer, duplicates the token names as strings anyway, and forgoes the ability to later compose
`glow-*`/ring utilities. The utility-class path is the idiom `globals.css` was built for.

**Glow:** out of scope for the AC ("visually distinct" is met by fill color alone). Not added now
to keep the diff minimal and leave the juice to E-004's consumers; noted as a trivial future add
(`glow-{piece}` alongside the bg class).

## D4 — Empty vs. filled visual + testability seam

**Chosen:**
- Empty cell keeps the placeholder look: `bg-white/5 ring-1 ring-inset ring-white/5` (faint well).
- Filled cell: base `rounded-[2px]` + the `CELL_COLOR[cell]` class (opaque neon fill) — clearly
  distinct from the translucent empty well (satisfies AC).
- Each cell renders `data-cell={cell ?? "empty"}` (A2). This is a stable, semantic-ish hook for
  tests (count all `[data-cell]`, assert filled ones carry the color class) and a debugging aid,
  at near-zero cost. Board keeps a stable `aria-label="Tetris board"`.

**Rejected — `role="grid"`/`role="gridcell"`:** ARIA grid role carries keyboard-navigation
semantics a passive game board does not fulfill; misusing it for test convenience is worse than a
neutral `data-*` attribute.

**Rejected — `data-testid`:** more test-coupled and less meaningful than `data-cell`, which also
encodes the piece identity usefully.

## D5 — Test strategy / infrastructure (Research C5, A1)

**Chosen:** add `@testing-library/react` + `jsdom` as devDeps and gate the DOM environment to the
component test file via a **per-file docblock** `// @vitest-environment jsdom`. Vitest v4 reads this
docblock with no global config, so the existing `lib/*.test.ts` suite stays in the fast node
environment untouched, and only `components/Board.test.tsx` runs under jsdom.

Test asserts the AC directly against a fixture matrix:
1. renders `ROWS*COLS` cells for an `emptyBoard(COLS, ROWS)` fixture;
2. a fixture with a few filled squares (e.g. an `I` row segment) shows those cells carrying the
   `bg-piece-*` color class while the rest do not — i.e. filled is visually distinct from empty;
3. grid dimensions track the fixture (D2).

**Rejected — a global `vitest.config.ts` with `environment: "jsdom"`:** would slow every pure lib
test and pull a DOM into node-only suites for no benefit. Per-file docblock is surgical.

**Rejected — no render test; extract a pure `boardToCells()` helper into `lib/` and unit-test
that:** the AC explicitly says "**Rendering** Board with a fixture board matrix shows…"; a pure
helper test would not exercise the actual DOM grid the ticket delivers. A thin render test is the
honest verification. (If the dev-dep install is unavailable in the environment, the fallback is to
still ship the components and document the gap in review — see Plan.)

## D6 — Keeping the app compiling (Research C4)

**Chosen:** `app/page.tsx` passes `board={emptyBoard(COLS, ROWS)}` as a temporary fixture and keeps
the "placeholder board" copy. This is a stopgap so the build stays green; T-003-01-02 replaces it
with the live hook state. The change is a single prop, minimizing churn the next ticket must undo.
