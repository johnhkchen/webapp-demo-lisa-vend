/**
 * Board + active-piece composition for rendering.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). The game core
 * (`lib/game.ts`) deliberately keeps the falling `active` piece *separate* from the settled
 * `board` and notes that "a renderer overlays the active piece on top of the board." This module
 * is that overlay — the single pure step that turns a `GameState`'s two parts into one renderable
 * matrix, so the React layer never has to know the shape rules.
 *
 * Reuse, not reimplementation: the piece's occupied cells come only from `pieceCells`
 * (`lib/collision.ts`), the same core accessor collision/lock use — no shape math lives here.
 *
 * Coordinate convention (matches `types.ts`/`board.ts`): row-major `board[y][x]`, `x` right,
 * `y` down from a top-left origin.
 */

import type { Board, Piece } from "./types";
import { pieceCells } from "./collision";

/**
 * Return a copy of `board` with `piece` painted over it: every cell the piece occupies is set to
 * `piece.type`. Copy-on-write — the input `board` (and the shared shape tables) are never mutated;
 * each row is freshly `slice`d, mirroring the independent-row discipline in `board.ts`.
 *
 * The overlay *wins* over any settled cell it covers (correct for rendering; at spawn there is no
 * overlap). Piece cells outside the matrix are skipped, so the function is total and never throws
 * on a piece that sits partly off-grid. Returns a fresh matrix of the same dimensions.
 */
export function overlayPiece(board: Board, piece: Piece): Board {
  const next = board.map((row) => row.slice());
  const height = next.length;
  const width = height > 0 ? next[0].length : 0;

  for (const { x, y } of pieceCells(piece.type, piece.position, piece.rotation)) {
    if (y >= 0 && y < height && x >= 0 && x < width) {
      next[y][x] = piece.type;
    }
  }

  return next;
}
