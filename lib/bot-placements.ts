/**
 * Candidate-placement enumeration — the pure evaluator seam the CPU bot drives.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). Given a settled
 * board and a piece identity, this enumerates every legal (rotation, column) hard-drop of that
 * piece and returns, per candidate, where it lands and the board that results from locking it —
 * so a bot (S-008-01) can score its options without advancing the bag, the score, or any live
 * `GameState`.
 *
 * Reuse, not reimplementation — the same contract `ghost.ts` keeps: the landing comes only from
 * `hardDrop` (`lib/movement.ts`), the resolved cells only from `pieceCells` (`lib/collision.ts`),
 * the settled board only from `lockPiece` (`lib/gravity.ts`), and the offset geometry only from
 * `cellsFor` (`lib/tetrominoes.ts`). No shape or collision math lives here, so a candidate can
 * never disagree with an actual drop.
 *
 * Coordinate convention (matches `types.ts`/`board.ts`): row-major `board[y][x]`, `x` right,
 * `y` down from a top-left origin.
 *
 * Two boundaries, both deliberate:
 *  - *Reachability = spawn-column hard-drop only.* Each candidate is the piece spawned at the top
 *    (`y = 0`) at a given rotation + anchor column and dropped straight down. A column is
 *    reachable iff that spawn does not `collide` (the stack does not already reach the top there).
 *    Sliding under overhangs (tucks/spins) is a richer BFS left to a later ticket; the AC ties
 *    each result to "a hardDrop of that piece at that rotation/column", which this satisfies.
 *  - *Settle = lock only, NOT line clear.* `board` is `lockPiece`'s output; full rows are left
 *    intact so each candidate's occupied cells still match its hard-drop. Applying `clearLines`
 *    (and any cleared-line credit) is the evaluator's call — the same altitude `gravity.ts` draws.
 *
 * This module takes `(board, type)` — never a `GameState` or `SevenBag` — so "no bag mutated" is
 * structural, not a promise. Copy-on-write throughout: the input board and the shared shape
 * tables are only read; fresh Points and boards go out.
 */

import type { Board, Piece, Point, RotationState, TetrominoType } from "./types";
import { collides, pieceCells } from "./collision";
import { hardDrop } from "./movement";
import { lockPiece } from "./gravity";
import { cellsFor } from "./tetrominoes";

/**
 * One enumerated placement: how the piece was dropped (`rotation` + spawn anchor `column`), where
 * it came to rest (`piece` + its absolute `cells`), and the fresh settled `board` after locking it
 * (no line clear). `rotation`/`column` are retained so a planner can map the choice back to an
 * input sequence (rotate ×k, shift to column, hard-drop) and so the drop is reconstructable.
 */
export interface PlacementCandidate {
  /** The rotation state the piece was spawned/dropped in. */
  rotation: RotationState;
  /** The spawn anchor column (box-local offsets mean this can be negative). */
  column: number;
  /** The landing piece (post-hardDrop): identity, rotation, and resting position. */
  piece: Piece;
  /** The four absolute occupied cells of the landing (fresh Points). */
  cells: Point[];
  /** A fresh board with the landing merged in via `lockPiece` — dimensions match the input. */
  board: Board;
}

/** Canonical signature of a cell set, order-independent, for deduping identical landings. */
function cellKey(cells: readonly Point[]): string {
  return cells
    .map(({ x, y }) => `${x},${y}`)
    .sort()
    .join("|");
}

/**
 * Enumerate every legal (rotation, column) hard-drop of `type` onto `board`.
 *
 * Iterates all four rotation states × every horizontally-legal anchor column, skips columns whose
 * top-of-field spawn already collides (unreachable — the stack reaches the top there), hard-drops
 * the rest, and emits one `PlacementCandidate` per landing — deduplicated by the landed cells, so
 * redundant orientations collapse (O's four identical states → one; horizontal-I rotations 0 and 2
 * land on the same floor cells → one; S/Z's shape-equivalent states collapse when their landings
 * coincide). The anchor range `[-minOffX, width-1-maxOffX]` is exactly the set of columns where
 * all four cells are horizontally in bounds, derived per rotation from the shape offsets.
 *
 * Pure: reads `board` and the shape tables, mutates neither; every `cells`/`board` is freshly
 * allocated. Returns `[]` for a degenerate zero-width board; otherwise non-empty for any board
 * with room at the top.
 */
export function enumeratePlacements(
  board: Board,
  type: TetrominoType,
): PlacementCandidate[] {
  const width = board[0]?.length ?? 0;
  const candidates: PlacementCandidate[] = [];
  const seen = new Set<string>();

  for (let r = 0; r < 4; r++) {
    const rotation = r as RotationState;
    const offsets = cellsFor(type, rotation);
    const minOffX = Math.min(...offsets.map((o) => o.x));
    const maxOffX = Math.max(...offsets.map((o) => o.x));

    for (let column = -minOffX; column <= width - 1 - maxOffX; column++) {
      const spawn: Piece = { type, rotation, position: { x: column, y: 0 } };
      // Horizontally in-bounds by construction, so this only rejects a spawn buried by the stack.
      if (collides(board, type, spawn.position, rotation)) continue;

      const landing = hardDrop(board, spawn);
      const cells = pieceCells(landing.type, landing.position, landing.rotation);
      const key = cellKey(cells);
      if (seen.has(key)) continue;
      seen.add(key);

      candidates.push({
        rotation,
        column,
        piece: landing,
        cells,
        board: lockPiece(board, landing),
      });
    }
  }

  return candidates;
}
