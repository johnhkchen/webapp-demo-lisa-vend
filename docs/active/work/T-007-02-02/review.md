# Review — T-007-02-02 ghost-render-translucent

## Summary

Threaded the pure ghost projection (`lib/ghost.ts`, T-007-02-01) through the React view so the
running game now shows a **translucent landing marker** in the active piece's hue, tracking it on
every move and rotate. The ghost travels as a *separate channel* alongside the composed board
matrix (which can only hold a piece id or `null`) and is painted **only on empty squares**, so it
is suppressed wherever it coincides with the active piece or the settled stack. No `lib/` change —
`ghostCells` is consumed as-is. Commit `78cc0d6`.

## Files changed

### Modified

- **`components/Cell.tsx`** — added `ghost?: TetrominoType | null` prop and a literal
  `GHOST_COLOR` map (`bg-piece-*/15` translucent wash + `ring-1 ring-inset ring-piece-*/60`
  hairline, one per piece). Render is now three-way: settled (solid `CELL_COLOR`, `data-cell=id`)
  → ghost-on-empty (`GHOST_COLOR`, `data-cell="empty"` + `data-ghost=id`) → empty. **Settled
  always wins** — a ghost is drawn only when `cell === null`, which is the suppression guard.
- **`components/Board.tsx`** — added optional `ghost?: Point[]` and `ghostType?: TetrominoType |
  null` props (defaults `[]` / `null`, so back-compatible). Builds `ghostKeys` (a `Set` of
  `y*cols+x`, the same key the grid already assigns) and hands each `Cell` `ghost={isGhost ?
  ghostType : null}`. Stays presentational — a set-membership test, no game math.
- **`components/useGame.ts`** — memoized `ghost = ghostCells(state.board, state.active)` beside the
  existing `view`, and exposed `ghost: Point[]` on `GameView`. Re-derives on every `dispatch`
  (each yields a new `state`), which is what makes the marker track move/rotate. No shape/collision
  math reimplemented — reuses the pure core, mirroring `overlayPiece`.
- **`components/GameContainer.tsx`** — destructures `ghost` and passes `ghost` + `state.active.type`
  to `Board`.

### Created

- **`components/Cell.test.tsx`** — 4 cases (empty / settled / ghost-on-empty / settled-beats-ghost).
- (Extended) **`components/Board.test.tsx`** — `describe("Board — ghost")`, 5 cases.

### Deleted

None.

## Acceptance criteria

> In the running game a translucent ghost renders at the landing position and updates on every
> move/rotate; Board/Cell tests cover the ghost cell variant and the production build stays green.

- ✅ **Translucent ghost at the landing position** — `useGame` derives `ghostCells(board, active)`
  (the exact `hardDrop` landing) and `Cell` paints those squares with a translucent per-piece fill
  + ring. Verified the utilities actually ship: `dist/**/*.css` contains `.bg-piece-t\/15`,
  `.bg-piece-z\/15`, … (literal classes survived Tailwind v4 tree-shaking).
- ✅ **Updates on every move/rotate** — `ghost` is `useMemo`'d on `state`; every move/rotate
  `dispatch` produces a fresh `state`, re-deriving the landing. The existing `GameContainer` suite
  already proves each input re-renders from a fresh core state.
- ✅ **Board/Cell tests cover the ghost variant** — new `Cell.test.tsx` + extended `Board.test.tsx`.
- ✅ **Production build stays green** — `npm run build` (vinext) succeeds.

## Test coverage

| Concern | Test |
|---|---|
| Ghost renders translucent on an empty square | `Cell` › renders a translucent ghost marker |
| Settled wins over a ghost prop (suppression) | `Cell` › lets a settled cell win over a ghost prop |
| Empty / settled base states unaffected | `Cell` › empty; › settled solid fill |
| Ghost channel zips to the right squares | `Board — ghost` › marks exactly the given landing cells |
| Ghost = translucent empty, ≠ plain empty | `Board — ghost` › draws ghost squares as translucent empties |
| Suppression over a settled cell | `Board — ghost` › suppresses a ghost that lands on a settled cell |
| No-ghost regression / `ghostType=null` | `Board — ghost` › no ghost channel; › ghostType null |
| No integration regression | existing `GameContainer.test.tsx` (unchanged, green) |

- Full suite: **20 files / 195 passed** (was 177; +18). Lint clean (`--max-warnings 0`); vinext
  build green.
- No existing test changed. Ghost squares keep `data-cell="empty"`, so `filledCoords` and the
  ROWS×COLS grid-length assertions in `GameContainer.test.tsx` are untouched by design.

## Design notes for the reviewer

- **Why a separate channel, not a richer matrix:** the composed `Board` is
  `(TetrominoType | null)[][]` and can't encode a third "ghost" kind. Baking one in (a
  `RenderCell` union) would have changed `Cell`/`Board`/`useGame` types and broken every existing
  `data-cell` assertion. The separate-channel approach is purely additive. (See `design.md`,
  Decision A.)
- **Why suppression lives at the leaf:** `Cell` draws the ghost only when `cell === null`. Because
  `overlayPiece` marks active/settled cells non-`null`, this one guard covers both the
  already-resting piece (ghost coincides with the active piece → not drawn, no double-draw — the
  case T-007-02-01's review flagged as the renderer's job) and any settled overlap. No coordinate
  subtraction upstream. (See `design.md`, Decision B.)
- **Game over:** no special-casing. A topped-out piece's landing is its own colliding position,
  whose cells are non-empty in `view`, so the ghost is suppressed automatically.

## Open concerns / limitations

- **None blocking.** All gates green, no regressions, no `lib/` change.
- **Manual visual confirmation not performed in a browser** — verification was via jsdom component
  tests + confirming the translucent classes are present in the built CSS. The hue/opacity values
  (`/15` fill, `/60` ring) are a reasonable "ghost piece" look but are a taste call; a later juice
  ticket may retune them (the `.motion` vocabulary in globals.css is available if a fade is wanted).
- **No dedicated "ghost moves with the piece" integration test** — deliberately omitted; the
  placement contract is fixed by the unit tests and the `useMemo(..., [state])` derivation, and the
  `GameContainer` suite already proves each input re-renders from a fresh state. Could be added if a
  reviewer wants belt-and-suspenders coverage.
- **`ghostType` is passed even at game over** — harmless (suppressed at the leaf), and kept
  unconditional rather than special-cased for honesty/simplicity.
