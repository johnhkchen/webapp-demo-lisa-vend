# Design — T-002-03-01 line-clear-detection

## Goal

A pure function that, given a post-lock board, removes every full row, collapses the
survivors downward, and reports how many rows it cleared — copy-on-write, input untouched,
grid dimensions preserved.

## Decision summary

- **New file `lib/line-clear.ts`** exporting **`clearLines(board): LineClearResult`**.
- Return an **object** `{ cleared: number; board: Board }` (named result, matching
  `gravity.ts` house style), plus an exported `LineClearResult` interface.
- **Algorithm: filter-then-refill.** Keep non-full rows in order, count the rest, prepend
  that many freshly-allocated empty rows at the top.
- **Do not** touch `gravity.ts` / `applyGravity`. Wiring is a later game-loop ticket.

## Approach options considered

### A. Filter survivors, prepend fresh empty rows  ✅ chosen

```
const kept = board.filter(row => row.some(cell => cell === null)); // survivors, in order
const cleared = board.length - kept.length;
const width = board[0].length;
const empties = Array.from({ length: cleared }, () => Array.from({ length: width }, () => null));
return { cleared, board: [...empties, ...kept] };
```

- **Full row** ⇔ *not* `row.some(cell => cell === null)`, i.e. every cell non-null. Using
  `some(...=== null)` as the *survivor* predicate reads directly as "row still has a gap."
- Survivors keep relative order and land at the bottom because they follow the prepended
  empties in the row array (`y` grows down ⇒ later indices = lower on screen). Handles
  **non-adjacent** full rows for free — no index bookkeeping.
- Height preserved: `cleared` removed, `cleared` empties added.
- Copy-on-write: output is a brand-new outer array. Survivor rows are carried by reference
  (safe — the pure layer never mutates settled rows in place), and each empty row is
  **freshly allocated** (dodges the shared-row aliasing trap `emptyBoard` guards against).
- Matches existing idioms: `Array.from` row construction (from `board.ts`), reduce/filter
  over rows (from `gravity.test.ts`'s `filled`).

### B. In-place write-pointer compaction (bottom-up two-pointer)

Walk from the bottom, copying survivor rows down over a write cursor, then null out the
top. Classic and allocation-frugal, but: more imperative index math, easy off-by-one on
the `y`-grows-down axis, and still needs fresh top rows. No measurable benefit at a 10×20
board. **Rejected** — more surface area for bugs, less readable, no upside at this scale.

### C. Mutate and return only the count

Mutate `board` in place, return just `cleared`. **Rejected outright** — violates the
copy-on-write contract every `lib/` module upholds (`lockPiece`, `pieceCells`,
`emptyBoard`) and the AC explicitly asks for "a compacted board" as a return value.

## Return-shape decision: object over tuple

| | Tuple `[count, board]` | Object `{ cleared, board }` ✅ |
|---|---|---|
| Precedent | none in `lib/` | `GravityResult`, `Fell`, `Locked` in `gravity.ts` |
| Call site | positional, order-sensitive | self-documenting destructure |
| Extensibility | painful | can add `clearedRows: number[]` later without breaking callers |

Chosen: `interface LineClearResult { cleared: number; board: Board }`. Field name
`cleared` (a count) reads naturally at call sites: `const { cleared, board } =
clearLines(locked.board)`. Downstream scoring (separate story) keys off `cleared`
(0/1/2/3/4) — an object leaves room to expose *which* rows cleared later without a
breaking signature change, should an animation ticket need it.

## File & naming decision

`lib/line-clear.ts` (kebab). Existing files are single lowercase words; this concept is
two words, and kebab-case matches the ticket/story/artifact naming already in the repo
(`docs/active/work/T-002-03-01`). Export `clearLines` (verb-first, like `emptyBoard`,
`lockPiece`, `spawnPiece`, `applyGravity`). Test colocated at `lib/line-clear.test.ts`.

## Edge cases and how the design handles them

- **Zero full rows** → `filter` keeps all rows, `cleared = 0`, zero empties prepended;
  returns a fresh board equal to input (input untouched). Explicit test.
- **All rows full** (full-board clear) → every row dropped, `cleared = height`, board
  becomes all-empty of the same dimensions. Test asserts an empty board back.
- **1 / 2 / 4 rows** (the AC case) → count + collapse verified against expected cell
  positions; 4 = the "Tetris" max simultaneous clear.
- **Non-adjacent full rows** → survivors between/around them restack correctly by
  construction. Explicit test (this is where naive index math tends to break).
- **Purity** → assert the input board is deep-unchanged (JSON snapshot, as
  `gravity.test.ts` does) and that returned empty rows don't alias each other.

## What is explicitly out of scope

- Wiring `clearLines` into `applyGravity` / the game loop (later ticket; keeps the gravity
  boundary clean and avoids two tickets editing `gravity.ts`).
- Scoring from the cleared count (separate E-002 story).
- Clear **animations** / row-flash timing (a rendering/feel concern, not pure logic).
- Gravity variants (sticky/cascade clearing) — classic "naive" gravity only, per AC.
