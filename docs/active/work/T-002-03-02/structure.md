# Structure — T-002-03-02 line-based-scoring

## Files

| File | Action | Purpose |
|---|---|---|
| `lib/scoring.ts` | **create** | `LINE_CLEAR_BASE` constant + `scoreFor(lines, level)` |
| `lib/scoring.test.ts` | **create** | Vitest coverage: tiers, no-clear, level scaling, guard |

No existing files are modified or deleted. In particular `lib/line-clear.ts`,
`lib/gravity.ts`, and any reducer are **untouched** — the caller (T-002-03-03 reducer)
does the wiring, per Design.

## `lib/scoring.ts` — shape

Module docstring (house style: purpose + purity boundary + where it sits in the stack):
- Pure, framework-free line-clear scoring; consumes the `cleared` count from
  `clearLines` (`lib/line-clear.ts`); consumed by the `step` reducer (T-002-03-03), not
  wired here.
- Note the classic base table and its super-linear shape (tetris pays 1200, not 4×40).

Public surface:

```ts
/** Base line-clear award indexed by number of lines cleared (index 0 = no clear = 0).
 *  Standard single/double/triple/tetris = 40/100/300/1200; multiplied by the level factor. */
export const LINE_CLEAR_BASE = [0, 40, 100, 300, 1200] as const;

/**
 * Score delta for clearing `lines` rows at the given `level`.
 *
 * Returns `LINE_CLEAR_BASE[lines] * level`. `level` is 1-based and defaults to 1, so
 * `scoreFor(lines)` yields the standard base table. (NES uses base × (level+1) with a
 * 0-based level; our `level` = NES level + 1.) Any `lines` outside 1..4 — including 0
 * (a no-clear lock), negatives, and non-integers — scores 0.
 */
export function scoreFor(lines: number, level?: number): number;
```

Implementation (total, guarded):

```ts
export function scoreFor(lines: number, level: number = 1): number {
  if (!Number.isInteger(lines) || lines < 1 || lines >= LINE_CLEAR_BASE.length) {
    return 0;
  }
  return LINE_CLEAR_BASE[lines] * level;
}
```

Notes:
- Guard first → single return path for the valid case; no `undefined`/`NaN` can escape.
- `LINE_CLEAR_BASE.length` (5) is the upper bound, so the table stays the single source of
  truth for the valid range — adding a hypothetical 5-line tier would need no guard edit.
- No imports required (self-contained). Types are inferred; the `as const` gives
  `LINE_CLEAR_BASE` a readonly tuple type.

## `lib/scoring.test.ts` — shape

Imports: `describe, it, expect` from `vitest`; `scoreFor, LINE_CLEAR_BASE` from `./scoring`.

`describe` groups mirroring `line-clear.test.ts` style:

1. **`scoreFor — base tiers`**
   - `scoreFor(0)` → `0` (no-clear lock scores nothing — the AC's zero case).
   - `scoreFor(1)` → `40`, `scoreFor(2)` → `100`, `scoreFor(3)` → `300`,
     `scoreFor(4)` → `1200` (each AC tier). Table-driven over `[[1,40],[2,100],...]`.

2. **`scoreFor — level factor`**
   - Default level is 1: `scoreFor(2)` === `scoreFor(2, 1)`.
   - Linear in level: `scoreFor(1, 2)` → `80`, `scoreFor(4, 3)` → `3600`,
     `scoreFor(3, 10)` → `3000`.
   - `level = 0` → `0` for any tier (proportional, not clamped).

3. **`scoreFor — out-of-range lines`**
   - `scoreFor(5)`, `scoreFor(-1)`, `scoreFor(2.5)` → `0` (defensive totality; never
     `NaN`/`undefined`).

4. **`LINE_CLEAR_BASE — constant`**
   - Equals `[0, 40, 100, 300, 1200]` (guards against an accidental table edit; this is
     the payout curve other layers/UI will reference).

## Ordering

Single logical unit — `scoring.ts` then `scoring.test.ts`, one commit. No dependency
ordering within the ticket; nothing else in the tree references these files yet.

## Interfaces exposed to later tickets

- `scoreFor(cleared, level)` — T-002-03-03's reducer calls this with `clearLines(...).cleared`
  and the current level, adding the result to the running score.
- `LINE_CLEAR_BASE` — available if a Scoreboard/NextPreview UI wants to show the payout
  table, or if T-002-03-04's determinism harness wants to reference expected score math.
