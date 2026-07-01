/**
 * Line-clear detection + collapse — the step that runs after a piece locks: remove every
 * full row and let the rows above fall to fill the gap.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). This is the
 * layer *above* gravity: `applyGravity`/`lockPiece` (`lib/gravity.ts`) merge a landed piece into
 * a fresh board but deliberately do NOT clear lines — their docstring names that "a separate
 * ticket." This is that function. A later game-loop ticket, on seeing `locked: true`, feeds the
 * merged board through `clearLines` to get the shrunk board and the cleared count (which then
 * feeds scoring, a separate story). Wiring is intentionally not done here, to keep the gravity
 * boundary clean.
 *
 * Coordinate convention (matches `types.ts`/`board.ts`): the board is row-major, `board[y][x]`,
 * with `x` growing right and `y` growing DOWN from a top-left origin. So "the bottom of the well"
 * is the END of the outer array, and collapsing downward means surviving rows restack toward
 * higher indices while freshly-emptied rows appear at the top (low indices).
 *
 * Copy-on-write, like every other `lib/` op: the input board is never mutated, the returned board
 * is a new outer array, and each new empty row is independently allocated (never the shared-row
 * `Array(h).fill(row)` alias that `emptyBoard` guards against). Surviving rows are carried by
 * reference — the pure layer never mutates a settled row in place.
 */

import type { Board, Cell } from "./types";

/** Result of a line-clear pass. `cleared` is the number of full rows removed (0..height);
 * `board` is the fresh, compacted board — same dimensions as the input. */
export interface LineClearResult {
  cleared: number;
  board: Board;
}

/**
 * Remove every full row from `board` and collapse the survivors downward.
 *
 * A row is *full* when it has no empty cell; equivalently, a row *survives* when it still contains
 * a `null`. Survivors keep their original relative order and restack to the bottom; that many fresh
 * empty rows are prepended at the top, so height and width are preserved (the stack shrinks, the
 * grid does not). Non-adjacent full rows are handled for free — there is no index bookkeeping, just
 * filter-and-refill.
 */
export function clearLines(board: Board): LineClearResult {
  const kept = board.filter((row) => row.some((cell) => cell === null));
  const cleared = board.length - kept.length;
  const width = board[0].length;
  const empties = Array.from({ length: cleared }, () =>
    Array.from({ length: width }, (): Cell => null),
  );
  return { cleared, board: [...empties, ...kept] };
}
