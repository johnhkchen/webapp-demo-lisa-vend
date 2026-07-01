# Design — T-002-03-02 line-based-scoring

## Goal

A pure function mapping a line-clear count (0..4) plus a level to the standard line-clear
score delta — `40 / 100 / 300 / 1200` base for 1/2/3/4 lines, `0` for a no-clear lock,
scaled by a level factor.

## Decision summary

- **New file `lib/scoring.ts`** exporting **`scoreFor(lines, level = 1): number`**.
- **Base table as a named constant** `LINE_CLEAR_BASE = [0, 40, 100, 300, 1200]`, indexed
  by line count, so index `i` reads as "score for `i` lines" (index 0 = 0, the no-clear
  case, falls out for free).
- **Level factor = `level`, 1-based, default 1.** `scoreFor(lines) = base × level`; the
  bare `scoreFor(lines)` call returns exactly the base table. Documented mapping to the
  NES `base × (level + 1)` convention (their 0-based `L` = our `level - 1`).
- **Total function:** guard `lines` outside `0..4` → return `0` (defensive; `clearLines`
  never emits it, but a scoring primitive should not throw on a bad count).
- **Do not** wire into any reducer — the `step` reducer (T-002-03-03) is the caller.

## Signature decision: `scoreFor(lines, level = 1)`

The AC writes `scoreFor(lines)` yet also says "times level factor", so `level` must be a
parameter. Defaulting it to **1** reconciles both: `scoreFor(3)` returns `300` (the AC's
"standard values"), while `scoreFor(3, 5)` returns `1500` (scaled). The default keeps the
AC's one-arg call site valid and keeps every base-tier test one-argument and obvious.

```ts
export function scoreFor(lines: number, level: number = 1): number
```

Alternatives considered:

- **`scoreFor(lines)` only, no level** — rejected: the AC explicitly says "times level
  factor", and T-002-03-03 accumulates a running score that must scale with level. Baking
  level in later would be a breaking signature change.
- **`scoreFor(lines, levelFactor)` where caller pre-computes the factor** — rejected:
  pushes the `level → factor` mapping (the `+1` question) onto every call site, inviting
  inconsistency. Owning the convention in one place is safer.

## Level-factor convention: 1-based `level`, `base × level`

| | NES `base × (level+1)`, 0-based | **Ours: `base × level`, 1-based ✅** |
|---|---|---|
| Base table at | `level = 0` | `level = 1` (the default) |
| `scoreFor(1)` | needs explicit `0` | `40` from the default — matches AC |
| Mapping | — | NES level `L` ⇔ our `level = L + 1` |

Chosen because the AC's phrase "the standard 40/100/300/1200 values (times level factor)"
reads most naturally as *base × factor* where the **default factor is 1**. A 1-based
`level` makes the default (`level = 1`) yield the base table with no `+1` arithmetic in the
call, which is exactly the one-argument AC case. The docstring records the NES equivalence
so T-002-03-03 can pick a level origin without ambiguity.

`level` is **not** clamped: a caller passing `level ≤ 0` gets a proportionally small/zero
score. Clamping is a game-rules concern (levels start at 1) that belongs to the reducer/
level-progression ticket, not this scoring primitive. Documented as out of scope.

## Out-of-range `lines`: guard to 0

`clearLines` only ever produces `0..4`, but `scoreFor` is a standalone total function.
Indexing `LINE_CLEAR_BASE[5]` yields `undefined`, and `undefined × level = NaN` — a silent
poison value that would corrupt an accumulated score. So:

```ts
if (lines < 1 || lines >= LINE_CLEAR_BASE.length) return 0;
return LINE_CLEAR_BASE[lines] * level;
```

`lines = 0` (and any out-of-range/negative/non-integer-below-1) returns `0` — the
"no-clear lock scores nothing" AC, generalized. Chosen over throwing: a scoring helper
returning `0` for "no lines" is more composable in an accumulator than one that can throw;
the reducer never feeds it garbage anyway. A fractional `lines` (e.g. `2.5`) falls through
the guard to `undefined`-index territory only if ≥1 and < length — `LINE_CLEAR_BASE[2.5]`
is `undefined` → we should also reject non-integers. Design adds `!Number.isInteger(lines)`
to the guard for full totality.

## Base table as a lookup constant

`export const LINE_CLEAR_BASE = [0, 40, 100, 300, 1200] as const;` — index = line count.

- Index 0 holding `0` makes the no-clear case a natural lookup, not a special branch.
- `as const` freezes the tuple (readonly), matching the "named constants, not magic
  numbers" house style (`COLS`/`ROWS`).
- Exported so tests (and any future UI showing the payout table) reference the single
  source of truth rather than re-hardcoding `1200`.

Rejected: a `switch (lines)` over 0..4. Works, but four near-identical arms are noisier than
a table, and the table doubles as documentation of the payout curve.

## File & naming decision

`lib/scoring.ts` — single lowercase word, matching `gravity.ts`/`collision.ts`/`board.ts`
(the concept is one word, so no kebab needed, unlike two-word `line-clear.ts`). Export
`scoreFor` (verb-ish, matching the AC and the `emptyBoard`/`clearLines` verb-first family).
Test colocated at `lib/scoring.test.ts`.

## Edge cases and how the design handles them

- **No clear (`lines = 0`)** → guard returns `0`. Explicit AC test.
- **Each tier 1/2/3/4** → `40/100/300/1200` at default level. Explicit AC tests.
- **Level scaling** → `scoreFor(1, 2) = 80`, `scoreFor(4, 3) = 3600`. Test asserts the
  multiplier is linear in `level`.
- **Out-of-range / negative / non-integer `lines`** → `0` (defensive totality). Test.
- **Purity/determinism** → no state, no imports beyond nothing (self-contained); same
  inputs → same output. Underpins T-002-03-04's determinism assertion on `score`.

## What is explicitly out of scope

- Soft-drop / hard-drop point bonuses, combo/back-to-back multipliers, T-spin scoring —
  not "line-based scoring"; separate concerns if ever ticketed.
- Level progression (how `level` increments from cleared lines) — belongs to the reducer /
  a level ticket, not this primitive.
- Accumulating a running total — the `step` reducer (T-002-03-03) owns game state.
- Clamping `level` to the legal range — a game-rules concern, not this pure helper.
