/**
 * Movement policy — spawn a piece and translate it left/right/down, gated by collision.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). This is the
 * *policy* layer that sits on top of the collision *predicate* (`lib/collision.ts`): every move
 * proposes a shifted placement and asks `collides` whether it is legal before committing. Nothing
 * here mutates the board or the piece — a legal move returns a fresh `Piece`, and a blocked move
 * returns the input `Piece` reference unchanged (the no-op contract, so callers can detect "did
 * not move" with `next === prev`).
 *
 * Coordinate convention (matches `types.ts`/`board.ts`): the board is row-major, `board[y][x]`,
 * with `x` growing right and `y` growing down from a top-left origin.
 *
 * Scope boundary: translation + spawn only. Rotation (with SRS wall kicks) is T-002-02-03;
 * automatic gravity and lock-on-landing are T-002-02-04 — soft-drop here is a *player-initiated*
 * single downward step and does NOT merge/lock a landed piece. The 7-bag (`lib/bag.ts`) is the
 * *source* of the id handed to `spawnPiece`; this module never touches the bag or any queue.
 */

import type { Board, Piece, TetrominoType } from "./types";
import { BOUNDING_BOX } from "./tetrominoes";
import { collides } from "./collision";

/**
 * Construct the active falling piece for `type` at the top of a `width`-wide field: rotation 0,
 * anchored at `y = 0`, and horizontally centered via the piece's bounding box
 * (`x = floor((width - BOUNDING_BOX[type]) / 2)`). This reproduces the canonical SRS spawn
 * columns on a 10-wide board (I→3, O→4, T/S/Z/J/L→3) and centers correctly on any width.
 *
 * Anchoring at `y = 0` keeps every derived cell at `y >= 0` — this model has no buffer rows above
 * the visible field. Spawn is pure *placement*: it does not read board contents or decide
 * top-out/game-over (a spawn-policy concern for a later ticket); a caller can `collides` the
 * result against the board if it needs to detect a blocked spawn.
 */
export function spawnPiece(type: TetrominoType, width: number): Piece {
  const x = Math.floor((width - BOUNDING_BOX[type]) / 2);
  return { type, rotation: 0, position: { x, y: 0 } };
}

/**
 * Translate `piece` by `(dx, dy)` if the destination is legal. Returns a fresh `Piece` at the
 * shifted position when the move does not `collide`; otherwise returns the **input `piece`
 * reference unchanged** — the no-op contract. Rotation is passed through untouched (this layer
 * never rotates). Never mutates `board` or `piece`.
 */
export function tryMove(
  board: Board,
  piece: Piece,
  dx: number,
  dy: number,
): Piece {
  const next = { x: piece.position.x + dx, y: piece.position.y + dy };
  if (collides(board, piece.type, next, piece.rotation)) return piece;
  return { ...piece, position: next };
}

/** Move one column left; no-op (returns the input reference) if that would collide. */
export function moveLeft(board: Board, piece: Piece): Piece {
  return tryMove(board, piece, -1, 0);
}

/** Move one column right; no-op (returns the input reference) if that would collide. */
export function moveRight(board: Board, piece: Piece): Piece {
  return tryMove(board, piece, 1, 0);
}

/**
 * Soft-drop: a player-initiated one-row descent. No-op if the cell below is blocked. This does
 * NOT lock or merge the piece into the board — landing/lock is T-002-02-04.
 */
export function softDrop(board: Board, piece: Piece): Piece {
  return tryMove(board, piece, 0, 1);
}
