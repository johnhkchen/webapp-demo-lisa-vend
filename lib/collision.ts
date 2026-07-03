/**
 * Collision detection — the gate every move consults before it commits.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). Given a board
 * and a *candidate* placement (piece shape + position + rotation), it answers the single
 * geometric question the whole movement layer is built on: does this placement overlap a wall,
 * the floor, or a settled cell? Later movement, rotation (with wall-kicks), spawn, and hard-drop
 * code all propose a placement and call `collides` before mutating any `Piece`.
 *
 * Coordinate convention (matches `types.ts`/`board.ts`): the board is row-major, addressed
 * `board[y][x]`, with `x` growing right and `y` growing down from a top-left origin. A piece's
 * occupied cells are *derived*, not stored — `pieceCells` resolves them as `position + offset`
 * from the shape table in `pieces.ts`, mirroring the normalization in `Piece`.
 *
 * Signature note: the acceptance criterion writes `collides(board, piece, pos, rot)`; here
 * `piece` is the `PieceType`, since only the shape identity is intrinsic — `pos` and `rot`
 * are passed separately precisely so a *hypothetical* placement can be tested without mutating a
 * `Piece`. Boundary note: a cell above the top of the field (`y < 0`) counts as out of bounds;
 * whether spawn tolerates a buffer above the visible field is a spawn-policy decision for a later
 * ticket, kept out of this pure geometric primitive.
 */

import type { Board, Point, PieceType, RotationState } from "./types";
import { cellsFor } from "./pieces";

/**
 * The absolute board cells a piece would occupy at `pos`/`rot` — its shape offsets translated by
 * the anchor. Returns a fresh array of fresh `Point`s, so callers never alias (or mutate) the
 * shared `PIECE_CELLS` data. Reused by collision here, and available to the renderer and
 * lock/merge in later tickets. Cell order follows `cellsFor` and is not part of the contract.
 */
export function pieceCells(
  type: PieceType,
  pos: Point,
  rot: RotationState,
): Point[] {
  return cellsFor(type, rot).map((offset) => ({
    x: pos.x + offset.x,
    y: pos.y + offset.y,
  }));
}

/**
 * True iff placing `type` at `pos`/`rot` would collide — i.e. any occupied cell is out of bounds
 * (past a wall, below the floor, or above the top) or overlaps a settled (non-null) cell.
 *
 * Dimensions are read from the board argument (`board.length` rows × `board[0].length` columns),
 * not from `COLS`/`ROWS`, so odd-sized boards behave. The bounds test runs *before* the array
 * index, so an out-of-range `pos` returns `true` rather than reading `undefined` — the function
 * never throws on well-typed input, and never mutates the board or the shape tables.
 */
export function collides(
  board: Board,
  type: PieceType,
  pos: Point,
  rot: RotationState,
): boolean {
  const height = board.length;
  const width = height > 0 ? board[0].length : 0;

  return pieceCells(type, pos, rot).some(
    ({ x, y }) =>
      x < 0 || x >= width || y < 0 || y >= height || board[y][x] !== null,
  );
}
