# Review — T-002-03-01 line-clear-detection

## What changed

Pure, additive change — one new logic module and its tests. No existing files modified.

| File | Action | Notes |
|---|---|---|
| `lib/line-clear.ts` | created (~50 lines) | `clearLines(board)` + `LineClearResult` |
| `lib/line-clear.test.ts` | created (~110 lines) | 8 tests across 5 `describe` groups |
| `docs/active/work/T-002-03-01/*` | created | RDSPI artifacts (research→review) |

Commit: `42cd048 feat(T-002-03-01): add clearLines line-clear detection + collapse with vitest`.

## Behaviour delivered

`clearLines(board): { cleared, board }`:
- **`cleared`** = number of full rows (rows with no empty cell) removed.
- **`board`** = fresh, compacted board — survivors kept in original order and restacked to
  the bottom, with `cleared` freshly-allocated empty rows prepended at the top. Grid
  dimensions (height × width) are preserved; the *stack* shrinks, the *grid* does not.

Algorithm is filter-then-refill: `board.filter(row has a null)` for survivors, prepend
`cleared` fresh empty rows. No index bookkeeping, so non-adjacent full rows fall out
correctly for free.

## Acceptance criteria

- [x] `clearLines(board)` returns the cleared-row **count** and a **compacted board** —
  returned as `{ cleared, board }` (object, matching `gravity.ts`'s named-result style).
- [x] Test with **1 / 2 / 4** pre-filled rows asserts the right count — `counts` group
  loops `[1, 2, 4]` and checks `cleared`.
- [x] Correct **downward collapse** — `collapse` group uses marker cells: a cell at `y=18`
  lands at `y=19` after one clear; a cell at `y=10` lands at `y=14` after a 4-row Tetris.

## Test coverage

`npm run test` → **9 files, 99 tests, all green** (8 new). `npm run lint` → clean
(`--max-warnings 0`).

Covered: 0/1/2/4-row counts; drop-by-one and 4-row restack collapse; non-adjacent full
rows with a sandwiched survivor; dimensions preserved; completely-full board → all-empty;
purity (input unchanged via JSON snapshot); no-aliasing of prepended empty rows.

Gaps / not covered (deliberate):
- **Non-square board widths** — `clearLines` derives `width` from `board[0].length` and
  never imports `COLS`, so it is width-agnostic, but every test uses `COLS`. Low risk; the
  logic has no width-specific branch. Could add one `emptyBoard(3, 5)` case if desired.
- **Empty (zero-row) board** — not handled: `board[0].length` would throw. The game board
  is always `ROWS = 20`, so this input cannot occur; guarding it would be dead code.

## Open concerns / notes for a human reviewer

1. **Not wired into the game loop — by design.** `clearLines` is a standalone pure
   function; `applyGravity`/`lockPiece` were left untouched. Their docstrings already
   carve line-clear out as a separate ticket. A later game-loop ticket must call
   `clearLines(locked.board)` after `applyGravity` reports `locked: true`. Until then this
   function has no runtime caller — expected at this stage of E-002.
2. **Return-shape contract.** Chose `{ cleared, board }` over a tuple for self-documenting
   call sites and forward-compat (a future animation ticket could add `clearedRows:
   number[]` without breaking callers). Downstream scoring keys off `cleared` (0–4).
3. **Survivor rows carried by reference.** The returned board reuses survivor row arrays
   from the input (only the outer array and the new empty rows are fresh). This is safe
   under the pure-layer contract (settled rows are never mutated in place) and matches how
   the rest of `lib/` treats immutability, but a reviewer should know output survivor rows
   are `===` to input rows. Empty rows are independently allocated (tested).
4. **No scoring / animation / gravity-variant** logic — all explicitly out of scope per
   the ticket and Design.

## Verdict

AC fully met, suite green, lint clean, house style (purity, coordinate convention, named
result, copy-on-write) followed. Ready for handoff.
