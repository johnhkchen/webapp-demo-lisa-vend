/**
 * Board evaluation heuristic — the pure scoring function the CPU bot ranks placements by.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). Given a single
 * *settled* board, `evaluate` returns one number: the higher, the more desirable. It is the second
 * seam of the pure-bot track (S-008-01) — the planner (T-008-01-03) scores every candidate from
 * `enumeratePlacements` (`lib/bot-placements.ts`) with this and picks the argmax.
 *
 * Altitude — this scores a **lock-only, pre-collapse** board, matching the seam that feeds it.
 * `enumeratePlacements` hands back boards that are `lockPiece`'d but NOT line-cleared (its
 * docstring: "*Settle = lock only, NOT line clear* ... Applying `clearLines` ... is the
 * evaluator's call"). So a placement that completes a row shows here as a row still present with no
 * `null` — and the "completed lines" feature is exactly the count of such full rows, read directly
 * off the board. We deliberately do NOT call `clearLines`: the height/holes/bumpiness features are
 * defined (and the reference weights were tuned) over the pre-collapse surface, and the positive
 * completed-lines weight is what rewards clearing.
 *
 * The classic 4-feature model (Dellacherie lineage): aggregate height, completed lines, holes, and
 * bumpiness, combined by the GA-tuned reference weights in `WEIGHTS`. Higher score = better board.
 *
 * Coordinate convention (matches `types.ts`/`board.ts`): row-major `board[y][x]`, `x` right, `y`
 * down from a top-left origin — so a column's "top" is its smallest `y` holding a filled cell, and
 * its height is the distance from the floor up to that cell.
 *
 * Pure and read-only: the input board is only inspected, never mutated; every result is freshly
 * computed. Takes a `Board` — never a `GameState` or bag — so it is structurally state-free.
 */

import type { Board } from "./types";

/**
 * The four scored features of a settled board. All are `>= 0`. Higher `aggregateHeight`, `holes`,
 * and `bumpiness` make a board worse; higher `completedLines` makes it better — the signs live in
 * `WEIGHTS`, not here.
 */
export interface BoardFeatures {
  /** Sum of every column's height (floor to its topmost filled cell). */
  aggregateHeight: number;
  /** Empty cells lying below the top filled cell of their column (buried gaps). */
  holes: number;
  /** Sum of absolute height differences between horizontally adjacent columns. */
  bumpiness: number;
  /** Number of full rows present (board is lock-only, so completed rows are still here). */
  completedLines: number;
}

/**
 * Reference weights for the 4-feature model (Yiyuan Lee's GA-tuned set — the de-facto standard for
 * this feature set, which yields a strong player). Score = Σ weightᵢ · featureᵢ, so height/holes/
 * bumpiness are penalties (negative) and a completed line is a reward (positive). Higher = better.
 */
export const WEIGHTS: { readonly [K in keyof BoardFeatures]: number } = {
  aggregateHeight: -0.510066,
  completedLines: 0.760666,
  holes: -0.35663,
  bumpiness: -0.184483,
};

/**
 * Extract the four features from a settled (lock-only, pre-collapse) board.
 *
 * One pass per column, top→bottom: the first filled cell fixes the column's top (height = distance
 * from the floor to it), and every empty cell below that top is a hole. Bumpiness sums the absolute
 * differences of adjacent column heights; completed lines counts rows with no empty cell.
 *
 * Pure: reads `board` only. A zero-width board yields all-zero features (guarded, never throws).
 */
export function boardFeatures(board: Board): BoardFeatures {
  const height = board.length;
  const width = board[0]?.length ?? 0;

  const heights: number[] = new Array(width).fill(0);
  let holes = 0;

  for (let x = 0; x < width; x++) {
    let top = -1;
    for (let y = 0; y < height; y++) {
      const filled = board[y][x] !== null;
      if (top === -1) {
        if (filled) top = y;
      } else if (!filled) {
        holes++;
      }
    }
    heights[x] = top === -1 ? 0 : height - top;
  }

  let aggregateHeight = 0;
  for (const h of heights) aggregateHeight += h;

  let bumpiness = 0;
  for (let x = 0; x < width - 1; x++) {
    bumpiness += Math.abs(heights[x] - heights[x + 1]);
  }

  let completedLines = 0;
  for (const row of board) {
    if (row.every((cell) => cell !== null)) completedLines++;
  }

  return { aggregateHeight, holes, bumpiness, completedLines };
}

/**
 * Score a settled board: the weighted sum of its four features (see `WEIGHTS`). Higher is better.
 * Deterministic and pure — same board in, same number out; the input is never mutated. An empty
 * board scores `0` (every feature is `0`).
 */
export function evaluate(board: Board): number {
  const f = boardFeatures(board);
  return (
    WEIGHTS.aggregateHeight * f.aggregateHeight +
    WEIGHTS.completedLines * f.completedLines +
    WEIGHTS.holes * f.holes +
    WEIGHTS.bumpiness * f.bumpiness
  );
}
