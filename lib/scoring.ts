/**
 * Line-based scoring — the award for clearing rows when a piece locks.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). This is a
 * scalar → scalar primitive: it consumes only the `cleared` count produced by `clearLines`
 * (`lib/line-clear.ts`) and a level, and returns the score delta. It holds no state and does
 * not accumulate a running total — the `step(state, input)` reducer (T-002-03-03) is what
 * calls `clearLines` then feeds the count here and adds the result to the game score. Wiring
 * is intentionally not done here, to keep this a standalone, trivially-testable rule.
 *
 * The base table is the classic single/double/triple/quad award: 40 / 100 / 300 / 1200.
 * It is deliberately super-linear — a quad pays 1200, far more than four singles (4×40 =
 * 160) — the standard incentive to clear four rows at once.
 */

/**
 * Base line-clear award indexed by the number of lines cleared: index 0 is the no-clear
 * case (0 points), then single/double/triple/quad = 40/100/300/1200. The value returned
 * by `scoreFor` is this base times the level factor. Frozen (`as const`) as the single
 * source of truth for the payout curve.
 */
export const LINE_CLEAR_BASE = [0, 40, 100, 300, 1200] as const;

/**
 * Score delta for clearing `lines` rows at the given `level`.
 *
 * Returns `LINE_CLEAR_BASE[lines] * level`. `level` is 1-based and defaults to 1, so the
 * bare `scoreFor(lines)` yields the standard base table (40/100/300/1200). Classic NES scoring uses
 * `base × (level + 1)` with a 0-based level; our `level` corresponds to their level + 1.
 *
 * Total by construction: any `lines` outside 1..4 — including 0 (a no-clear lock),
 * negatives, and non-integers — scores 0, so a bad count can never leak `NaN`/`undefined`
 * into an accumulated score. `level` is not clamped: legal-range enforcement is a
 * game-rules concern for the reducer, not this primitive.
 */
export function scoreFor(lines: number, level: number = 1): number {
  if (!Number.isInteger(lines) || lines < 1 || lines >= LINE_CLEAR_BASE.length) {
    return 0;
  }
  return LINE_CLEAR_BASE[lines] * level;
}
