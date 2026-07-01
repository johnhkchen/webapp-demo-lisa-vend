/**
 * Gravity + lock-on-landing — advance the active piece down one row, and commit it to the settled
 * board when it can fall no further.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). This is the
 * layer *above* movement: it reuses `softDrop` (`lib/movement.ts`) as the single definition of
 * "can this piece fall one row?" and `pieceCells` (`lib/collision.ts`) to resolve the four squares
 * a landed piece occupies. It introduces the engine's first board-*writing* operation, done
 * copy-on-write so the input board is never mutated (matching every other `lib/` op).
 *
 * Coordinate convention (matches `types.ts`/`board.ts`): the board is row-major, `board[y][x]`,
 * with `x` growing right and `y` growing down from a top-left origin.
 *
 * Scope boundary: one gravity *step* + the merge, nothing more. Detecting and clearing full rows
 * after a lock is a separate ticket — `lockPiece` does NOT clear lines. Choosing/spawning the next
 * piece from the 7-bag is never touched here (a locked step reports `piece: null` — the "cleared
 * for respawn" signal — and a higher layer decides what to spawn). No lock-delay timer (a
 * feel/timing concern, not pure logic) and no hard-drop (a later ticket, which can reuse
 * `lockPiece`).
 */

import type { Board, Piece } from "./types";
import { pieceCells } from "./collision";
import { softDrop } from "./movement";

/** One gravity step where the piece fell: `board` is unchanged (same ref), `piece` still active. */
export interface Fell {
  locked: false;
  board: Board;
  piece: Piece;
}

/** One gravity step where the piece landed and locked: `board` is a fresh merged copy, active
 * piece cleared (`null`) so a caller can respawn. */
export interface Locked {
  locked: true;
  board: Board;
  piece: null;
}

/** Outcome of one gravity step: still falling (`Fell`) or landed-and-locked (`Locked`). The
 * `locked` flag is the discriminant — it narrows `piece` to `Piece` vs `null` with no assertions. */
export type GravityResult = Fell | Locked;

/**
 * Merge `piece`'s four resolved cells into a **fresh** copy of `board`, colored by `piece.type`.
 *
 * Copy-on-write: rows are `slice`d (they are independent, per `emptyBoard`), so neither the input
 * board nor the piece is mutated. Assumes the piece is legally in-bounds — an active piece always
 * is, and `applyGravity` only locks a piece already resting on the board — so no bounds re-check.
 * Does NOT clear full lines; that is a separate ticket.
 */
export function lockPiece(board: Board, piece: Piece): Board {
  const next = board.map((row) => row.slice());
  for (const { x, y } of pieceCells(piece.type, piece.position, piece.rotation)) {
    next[y][x] = piece.type;
  }
  return next;
}

/**
 * Apply one gravity step to the active `piece`.
 *
 * Delegates the down-step to `softDrop`, whose no-op contract returns the **same reference** when
 * the row below is blocked. So a *different* object means the piece fell → `{ locked: false }`
 * with the board unchanged (same ref) and the fallen piece. The same reference means it can fall
 * no further → lock it: `{ locked: true }` with a fresh merged board and `piece: null`. Landing on
 * the floor and landing on the settled stack are therefore handled identically (both flow through
 * `softDrop`/`collides`), with no duplicated collision logic. Never mutates the input board or
 * piece.
 */
export function applyGravity(board: Board, piece: Piece): GravityResult {
  const dropped = softDrop(board, piece);
  if (dropped !== piece) {
    return { locked: false, board, piece: dropped };
  }
  return { locked: true, board: lockPiece(board, piece), piece: null };
}
