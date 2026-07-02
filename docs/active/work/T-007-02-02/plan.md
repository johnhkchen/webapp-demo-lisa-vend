# Plan — T-007-02-02 ghost-render-translucent

Ordered, independently verifiable steps. Leaf-out so each layer compiles against an updated
dependency. One commit per step where it stands alone; steps 1–4 are additive/back-compatible and
could be squashed, but are listed separately for reviewability.

## Step 1 — `Cell`: translucent ghost variant

**Change:** add `ghost?: TetrominoType | null` prop, a literal `GHOST_COLOR` map, and the
three-way render branch (settled wins → ghost-on-empty → empty). Emit `data-ghost={ghost}` only in
the ghost branch. Update the doc comment.

**Verify:** `npx tsc --noEmit` clean; `npm run lint` clean. Behavior covered by Step 5's
`Cell.test.tsx`. Manual reasoning: a `<Cell cell={null} ghost="T" />` yields `data-ghost="T"`,
`data-cell="empty"`, class contains `bg-piece-t/15`; `<Cell cell="T" ghost="T" />` yields solid
`data-cell="T"`, no `data-ghost`.

**Commit:** `feat(cell): add translucent ghost cell variant`.

## Step 2 — `Board`: zip the ghost channel by key

**Change:** add optional `ghost?: Point[]` and `ghostType?: TetrominoType | null` props (defaults
`[]` / `null`). Build `ghostKeys = new Set(ghost.map((p) => p.y * cols + p.x))`. In the existing
`flatMap`, compute `isGhost = ghostType !== null && ghostKeys.has(key)` and pass
`ghost={isGhost ? ghostType : null}` to `Cell`. Import `Point`, `TetrominoType`. Update doc comment.

**Verify:** `tsc`/lint clean. Existing `Board.test.tsx` still green (no ghost props → identical
output). Behavior covered by Step 6.

**Commit:** `feat(board): accept optional ghost channel and mark landing cells`.

## Step 3 — `useGame`: derive the ghost beside the view

**Change:** import `ghostCells` from `@/lib/ghost`, `Point` from `@/lib/types`. Add
`const ghost = useMemo(() => ghostCells(state.board, state.active), [state]);`. Add `ghost: Point[]`
to `GameView` and the return object. Update doc comment.

**Verify:** `tsc`/lint clean. Existing `useGame`/`GameContainer` tests unaffected (new field is
additive).

**Commit:** `feat(usegame): expose ghost landing cells on the view`.

## Step 4 — `GameContainer`: thread ghost props into `Board`

**Change:** destructure `ghost` from `useGame()`; render
`<Board board={view} ghost={ghost} ghostType={state.active.type} />`. Update doc comment.

**Verify:** `tsc`/lint clean. Full existing `GameContainer.test.tsx` still green — ghost squares
keep `data-cell="empty"`, so `filledCoords` and grid-length asserts are unchanged.

**Commit:** `feat(container): render the translucent ghost alongside the active piece`.

## Step 5 — `Cell.test.tsx` (new): cover the ghost variant

**Cases:**
- **empty** — `<Cell cell={null} />`: `data-cell="empty"`, `hasAttribute("data-ghost")` false,
  className has no `bg-piece-`.
- **settled** — `<Cell cell="T" />`: `data-cell="T"`, no `data-ghost`, className includes
  `bg-piece-t` and **not** `bg-piece-t/` (solid, not translucent).
- **ghost on empty** — `<Cell cell={null} ghost="T" />`: `data-ghost="T"`, `data-cell="empty"`,
  className includes `bg-piece-t/15` and a `ring-piece-t/` outline.
- **settled beats ghost** — `<Cell cell="T" ghost="S" />`: `data-cell="T"`, no `data-ghost`,
  solid `bg-piece-t` (the guard: ghost never overrides a settled cell).

**Verify:** these four pass; suite count rises.

**Commit:** `test(cell): cover translucent ghost variant and settled-wins guard`.

## Step 6 — `Board.test.tsx`: extend for the ghost channel

Helper: recover `(x, y)` from row-major index as the existing tests do. Cases in a new
`describe("Board — ghost")`:
- **marks the landing cells** — given a fixed empty board, `ghost=[{x:2,y:GH}, ...]`,
  `ghostType="I"`: exactly those squares have `data-ghost="I"` at the right `(x,y)`; count matches.
- **ghost squares are translucent empties** — those squares are `data-cell="empty"` and their
  className includes `bg-piece-i/15`; a non-ghost empty has no `data-ghost` and no `bg-piece-`.
- **suppression over a filled cell** — put a settled `"O"` at a coordinate also listed in `ghost`:
  that square stays `data-cell="O"` (solid) with **no** `data-ghost`.
- **no ghost props → unchanged** — rendering `<Board board={...} />` with no ghost yields zero
  `[data-ghost]` squares (regression guard).

**Verify:** new cases pass; existing `Board` cases unchanged.

**Commit:** `test(board): cover ghost landing marks and settled-cell suppression`.

## Step 7 — full verification & AC check

Run the whole gate:
- `npm run lint` → clean (`--max-warnings 0`).
- `npx vitest run` → all pass; expect **177 + new cases**, zero regressions.
- `npm run build` (vinext production build) → green. This is the AC's "production build stays
  green" requirement and confirms the literal `GHOST_COLOR` utilities actually ship (Tailwind v4
  emits them because they are source literals).
- Sanity: reason through the running game — on spawn the active piece is at top and 4 translucent
  ghost squares appear at the bottom landing row; after `left`/`right`/`rotateCW` the ghost
  re-derives (new `state` → new memo) and moves with the piece; when the piece is one row above
  rest the ghost coincides and is suppressed (no double-draw).

**No separate commit** (verification only), unless a fix is needed.

## Testing strategy summary

| Layer | Test | What it proves |
|---|---|---|
| `Cell` | `Cell.test.tsx` (new) | the three visual states + settled-wins guard, literal classes ship |
| `Board` | `Board.test.tsx` (extended) | ghost channel zipped to right squares; suppression over filled cells; no-ghost regression |
| Integration | existing `GameContainer.test.tsx` | ghost is invisible to `filledCoords`/grid-length → no regression; move/rotate paths still exact |
| Build | `npm run build` | AC: production build green; ghost utilities present |

Move/rotate tracking is asserted transitively: `ghost` is `useMemo`'d on `state`, and every
`dispatch` (move/rotate) yields a new `state`; the derivation reuse is what the `useGame` memo
guarantees. A dedicated "ghost moves with the piece" integration test is optional (the
`GameContainer` suite already proves each input re-renders the composed board from a fresh state);
the unit tests fix the ghost's *placement* contract directly.

## Rollback

Each step is additive; reverting any single commit leaves the app compiling (ghost props are
optional). Full rollback = revert Steps 1–6; no schema/lib change to unwind.
