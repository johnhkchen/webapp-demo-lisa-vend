# Structure — T-001-03-01: render-placeholder-board-css-grid

The blueprint: file-level changes, boundaries, and interfaces. Not code — the shape of it.

## Change set at a glance

| File | Action | Summary |
|---|---|---|
| `components/Cell.tsx` | **create** | Presentational, props-less empty placeholder cell. |
| `components/Board.tsx` | **modify** | Render `<Cell />` per grid position instead of an inline `div`; move cell-level classes out to `Cell`. |
| `app/page.tsx` | unchanged | Already mounts `<Board />` under the header. |
| `lib/constants.ts` | unchanged | Remains the `COLS`/`ROWS` source of truth. |
| `docs/active/work/T-001-03-01/*.md` | **create** | RDSPI artifacts. |
| `package.json` / lockfile | unchanged | No new dependency. |

No files are deleted. No config (`eslint.config.mjs`, `tsconfig.json`, `next.config.ts`,
`postcss.config.mjs`, `globals.css`, `layout.tsx`) is touched.

## New file: `components/Cell.tsx`

- **Public interface:** `export default function Cell(): JSX.Element` — **no props**.
- **Responsibility:** render exactly one empty placeholder cell `div` with the cell-level
  visual classes: `rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5` (moved verbatim
  from Board's current inline cell).
- **Boundary:** presentational only. No state, no hooks, no `"use client"` (Server
  Component). No import from `lib/` (dimensions are Board's concern, not the cell's). No game
  semantics (fill/color/piece) — those belong to the Playability epic, which will add the
  first prop here.
- **Doc comment:** one short block stating it is the atomic placeholder unit of the board
  grid (CLAUDE.md's named `Cell`), stateless by design, and the seam where per-cell
  fill/color state lands later.

## Modified file: `components/Board.tsx`

- **Unchanged responsibilities / interface:** still `export default function Board()`, no
  props; still owns the CSS-grid *container* — `gridTemplateColumns/Rows` from `COLS`/`ROWS`,
  `width`/`aspectRatio` sizing, chrome classes (`grid gap-px rounded-lg border …`), and
  `aria-label="Tetris board (placeholder)"`.
- **Unchanged data:** `const cells = Array.from({ length: COLS * ROWS })` stays — the
  200-entry array driving the map, preserving the DOM contract.
- **The single change:** inside `cells.map((_, i) => …)`, replace the inline
  `<div key={i} className="rounded-[2px] …" />` with `<Cell key={i} />`.
- **New import:** `import Cell from "@/components/Cell";` (alongside the existing
  `import { COLS, ROWS } from "@/lib/constants";`).
- **Doc comment:** update the existing block minimally to note the grid is now composed of
  `Cell` components (still a static placeholder; real state arrives later).

## Module boundaries after the change

```
app/page.tsx ──renders──> components/Board ──renders N×──> components/Cell
                               │
                               └──imports COLS/ROWS──> lib/constants   (pure)
```

- **app → components** (page mounts Board): unchanged.
- **components → components** (Board composes Cell): new, intra-track edge; allowed, no lint
  restriction on `components/`.
- **components → lib** (Board reads `COLS`/`ROWS`): unchanged; the only cross-track edge, and
  it points the allowed direction (framework may read pure constants; the T-001-02-02 rule
  only forbids the reverse).
- **Cell → (nothing):** Cell is a leaf; imports neither `lib/` nor other components.

## Invariants preserved (the AC contract)

1. Exactly `COLS*ROWS` (= 200) cell `div`s render — the `Array.from({length: COLS*ROWS})`
   map is untouched; `<Cell>` renders one `div`.
2. They sit inside one CSS-grid container with `repeat(COLS,…)` / `repeat(ROWS,…)` templates
   derived from `lib/constants` — Board's container is untouched.
3. Dimensions have a single source of truth (`lib/constants`); no `10`/`20` literal enters
   JSX or class strings.
4. `/` remains a static, prerenderable Server Component route (no client runtime added).

## Ordering of changes

1. Create `components/Cell.tsx` first (no dependents yet — compiles standalone).
2. Then modify `components/Board.tsx` to import and use it. (Doing Board first would leave a
   dangling import and a broken intermediate build.)
3. Verify (lint + build + dev), then commit code + artifacts together.

## Explicitly out of structure (declined in Design)

- No `components/Cell.tsx` props; no `lib/board.ts`; no theme tokens; no test files / runner;
  no change to the grid-template mechanism or to `app/page.tsx`.
