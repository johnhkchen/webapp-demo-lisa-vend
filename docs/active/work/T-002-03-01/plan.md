# Plan — T-002-03-01 line-clear-detection

## Testing strategy

Pure logic, unit-tested with Vitest (colocated `lib/line-clear.test.ts`), run via
`npm run test`. No integration or rendering tests — `clearLines` is framework-free and has
no collaborators to mock. Verification criteria come straight from the AC plus the edge
cases enumerated in Design. Green full suite + clean lint (`--max-warnings 0`) = done.

## Steps

### Step 1 — Implement `lib/line-clear.ts`

- House-style module header: purpose, purity (no React/Next), coordinate convention
  (`board[y][x]`, `y` down), scope boundary (does NOT wire into gravity; no scoring/anim).
- Export `interface LineClearResult { cleared: number; board: Board }`.
- Export `clearLines(board)`:
  - `kept = board.filter(row => row.some(cell => cell === null))`
  - `cleared = board.length - kept.length`
  - `width = board[0].length`
  - `empties = Array.from({length: cleared}, () => Array.from({length: width}, (): Cell => null))`
  - `return { cleared, board: [...empties, ...kept] }`
- **Verify:** `npx tsc --noEmit` clean (or rely on the vitest/next typecheck); reads
  cleanly against the `Board`/`Cell` types.

### Step 2 — Write `lib/line-clear.test.ts`

Cover every Design edge case:

- **counts (AC):** fixtures with 0 / 1 / 2 / 4 full rows → `expect(cleared).toBe(n)`.
- **collapse:** place a single marker cell near the top, fill a row below it, clear →
  assert the marker moved down by exactly the number of cleared rows beneath it and that
  cleared rows are gone.
- **downward stacking:** after clearing, survivors occupy the bottom rows; the top
  `cleared` rows are entirely null.
- **non-adjacent full rows:** rows `r1` and `r2` full with a partial survivor between →
  `cleared === 2`, survivor content preserved and restacked, order intact.
- **dimensions preserved:** `result.board.length === ROWS`; every row length `=== COLS`.
- **all-full:** completely full board → `cleared === ROWS`, `filled(result.board) === 0`.
- **purity:** `JSON.stringify(board)` unchanged after the call; two prepended empty rows
  are distinct (mutate `result.board[0][0]`, assert `result.board[1][0]` still null).
- **Verify:** `npm run test` → all green (new file + existing suites unaffected).

### Step 3 — Lint & final verification

- `npm run lint` → 0 warnings/errors.
- `npm run test` → full suite green.

### Step 4 — Commit

Single atomic commit pairing implementation + tests, matching repo convention:

```
feat(T-002-03-01): add clearLines line-clear detection + collapse with vitest
```

Track progress in `progress.md`; note any deviation from this plan there before acting on
it.

## Risk / watch-list

- **Aliasing:** empty rows must be individually allocated — covered by the purity test
  (mutate-one-check-another). This is the one real footgun (`Array(h).fill(row)` trap).
- **Axis direction:** `y` grows down, so empties prepend at the *front* of the array and
  survivors restack at the *end*. The collapse + marker test pins the direction.
- **Empty-board input** (`ROWS` all-null): `some(...===null)` true for every row → nothing
  cleared, fresh copy returned. Falls out of the general path; covered by the zero-count
  case. `board[0].length` is safe because the board always has ≥1 row (`ROWS = 20`).

## Out of scope (re-stated for the implementer)

No edits to `gravity.ts`; no scoring; no animation; no game-loop wiring. Just the pure
function and its tests.
