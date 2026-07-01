# Progress — T-002-02-01: collision-detection

## Status: complete

All plan steps executed. Implementation + tests committed as `c037339`.

## Steps

- [x] **Step 1 — `lib/collision.ts`.** Wrote the module (doc header + `pieceCells` + `collides`)
      exactly per Structure. Bounds derived from the board; bounds test short-circuits before the
      index via `Array.prototype.some`; no mutation, no default export.
- [x] **Step 2 — `lib/collision.test.ts`.** `pieceCells` describe block (translation + no-mutation)
      and the table-driven `collides` `CASES` array (16 rows) driven by `it.each`, plus a
      board-not-mutated guard. Reused the `keyOf`/`asSet` set-comparison idiom and the
      `board[y][x] = type` settle pattern from the existing suites.
- [x] **Step 3 — lint + full suite.** `npm test` → **5 files, 42 tests passed** (16 collision
      cases + 2 `pieceCells` + 1 no-mutation + existing board/tetromino suites, no regression).
      `npm run lint` → clean (`--max-warnings 0`).
- [x] **Step 4 — commit.** `feat(T-002-02-01): add collision detection ...` → `c037339`.

## Deviations from the plan

- **Case #11 (rotation clip) coordinates corrected during implementation, as the Plan
  anticipated.** The Plan's draft used `I` at `{x:7}, rot:1`, but I state 1 is a vertical bar in
  box-column 2 → absolute column 9, which is *in* bounds (expected would have been wrong). Per
  the Plan's "offset table is authoritative" rule, the row was corrected to `{x:8}, rot:1` so the
  vertical bar lands in column 10 (`>= width`) and genuinely clips the right wall → `true`. The
  row's stated intent (rotation changes which side clips) is preserved.
- No other deviations. All other 15 rows' expected values matched the offset table on first
  cross-check (verified I's row-1 spawn offset for #4/#7/#15, O's 2-wide span for #3/#6).

## Verification snapshot

```
Test Files  5 passed (5)
     Tests  42 passed (42)
```
`npm run lint` exits 0.

## Handoff

Two pure exports in `lib/collision.ts` ready for the movement/rotation/spawn/drop tickets to
consume. `review.md` written next.
