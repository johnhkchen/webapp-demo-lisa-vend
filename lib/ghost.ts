/**
 * Ghost projection — where the active piece would land on a hard drop.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). Sibling of
 * `overlay.ts`: another single pure "view-prep" step that turns a `GameState`'s parts into
 * render-ready data, so the React layer never re-derives shape or collision math. Where
 * `overlay.ts` paints the *active* piece onto the board, this module resolves the *ghost* —
 * the translucent landing marker that shows where the active piece will come to rest.
 *
 * Reuse, not reimplementation: the landing comes only from `hardDrop` (`lib/movement.ts`) —
 * the very same projection the reducer runs for the `"hardDrop"` input — and the resolved
 * cells come only from `pieceCells` (`lib/collision.ts`). No shape or collision math lives
 * here, so the ghost can never disagree with an actual drop.
 *
 * Coordinate convention (matches `types.ts`/`board.ts`): row-major `board[y][x]`, `x` right,
 * `y` down from a top-left origin.
 *
 * Scope boundary: pure *placement* only. Like `hardDrop`, this does NOT lock/merge the piece
 * into the board. Painting the ghost as a translucent cell variant, and suppressing it when
 * it coincides with the active piece, are rendering concerns handled in the components
 * (T-007-02-02), not here.
 */

import type { Board, Piece, Point } from "./types";
import { hardDrop } from "./movement";
import { pieceCells } from "./collision";

/**
 * The active `piece` translated straight down to its resting placement — where it would land
 * on a hard drop. Delegates to `hardDrop`, so the ghost's position is, by construction, the
 * same landing an actual drop produces. An already-resting piece returns the **input `piece`
 * reference unchanged** (inherited from `hardDrop`'s no-op contract). Never mutates `board`
 * or `piece`.
 */
export function ghostPiece(board: Board, piece: Piece): Piece {
  return hardDrop(board, piece);
}

/**
 * The four absolute board cells the ghost occupies at its landing — the "resting cells" the
 * renderer marks translucent. Composed from `ghostPiece` + `pieceCells`, so no coordinates
 * are computed here. Every returned cell is a legal (null-on-board) square, because
 * `hardDrop`'s resting placement does not collide with a wall, the floor, or a settled cell.
 * Returns fresh `Point`s (via `pieceCells`), so callers never alias the shared shape tables.
 */
export function ghostCells(board: Board, piece: Piece): Point[] {
  const landing = ghostPiece(board, piece);
  return pieceCells(landing.type, landing.position, landing.rotation);
}
