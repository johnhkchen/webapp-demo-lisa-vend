/**
 * Rotation policy — turn the active piece CW/CCW using the Super Rotation System (SRS) wall kicks.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). This is the
 * rotation sibling of `lib/movement.ts`: it proposes a candidate placement and gates it through
 * the collision *predicate* (`lib/collision.ts`) before committing. Nothing here mutates the board,
 * the piece, or the kick tables — a legal rotation returns a fresh `Piece`, and a fully-blocked
 * rotation returns the **input `Piece` reference unchanged** (the no-op contract, so callers detect
 * "did not rotate" with `next === prev`), exactly mirroring `tryMove`.
 *
 * How SRS works: swapping the piece's shape to the next orientation (`cellsFor(type, to)`) may push
 * cells into a wall, the floor, or the stack. SRS defines, per rotation *transition* (from-state →
 * to-state), an ordered list of candidate translations ("kick tests"). We try the rotated shape at
 * `position + test[i]` in order; the first that does not `collide` wins. Test 1 is always `(0,0)`
 * (the naive in-place rotation). If all tests fail, the rotation is rejected.
 *
 * Coordinate convention (matches `types.ts`/`board.ts`): the board is row-major, `board[y][x]`,
 * with `x` growing right and `y` growing **down** from a top-left origin — the same CW rotation the
 * `tetrominoes.ts` shape chain uses (state 0→1→2→3 is 90° CW).
 *
 * CRITICAL — y-down negation: the canonical SRS kick tables are published in a y-**up** frame
 * (Tetris Guideline / Tetris Wiki). Every offset's y component is therefore **negated** in the
 * constants below to match this engine's y-down frame; each row carries its published y-up source
 * in a trailing comment so the flip can be audited. Only the `(x, y)` sign convention differs — the
 * spawn orientations and CW chain in `tetrominoes.ts` are standard SRS, so the tables apply directly.
 *
 * Scope boundary: rotation only. Automatic gravity and lock-on-landing are a later ticket; so is
 * T-spin *scoring* — the "T-spin corner kick" here is the kick *geometry* (test 5) that lets a T
 * rotate into a slot, not spin detection.
 */

import type { Board, Piece, Point, RotationState, TetrominoType } from "./types";
import { collides } from "./collision";

/** Direction of a single 90° rotation step. */
export type RotationDir = "cw" | "ccw";

/** Terse cell constructor, local to this module, to keep the kick tables readable. */
const p = (x: number, y: number): Point => ({ x, y });

/**
 * Kick tests for J, L, S, T, Z (the shared 3×3 table), keyed by `"from>to"`. Only the eight ±90°
 * transitions the game performs are present (no same-state or 180° entries). Values are y-down;
 * the trailing comment is the published y-up source (y negated to get the stored value).
 */
export const KICKS_JLSTZ: Readonly<Record<string, readonly Point[]>> = {
  "0>1": [p(0, 0), p(-1, 0), p(-1, -1), p(0, 2), p(-1, 2)], // y-up: (0,0)(-1,0)(-1,+1)(0,-2)(-1,-2)
  "1>0": [p(0, 0), p(1, 0), p(1, 1), p(0, -2), p(1, -2)], //   y-up: (0,0)(+1,0)(+1,-1)(0,+2)(+1,+2)
  "1>2": [p(0, 0), p(1, 0), p(1, 1), p(0, -2), p(1, -2)], //   y-up: (0,0)(+1,0)(+1,-1)(0,+2)(+1,+2)
  "2>1": [p(0, 0), p(-1, 0), p(-1, -1), p(0, 2), p(-1, 2)], // y-up: (0,0)(-1,0)(-1,+1)(0,-2)(-1,-2)
  "2>3": [p(0, 0), p(1, 0), p(1, -1), p(0, 2), p(1, 2)], //    y-up: (0,0)(+1,0)(+1,+1)(0,-2)(+1,-2)
  "3>2": [p(0, 0), p(-1, 0), p(-1, 1), p(0, -2), p(-1, -2)], //y-up: (0,0)(-1,0)(-1,-1)(0,+2)(-1,+2)
  "3>0": [p(0, 0), p(-1, 0), p(-1, 1), p(0, -2), p(-1, -2)], //y-up: (0,0)(-1,0)(-1,-1)(0,+2)(-1,+2)
  "0>3": [p(0, 0), p(1, 0), p(1, -1), p(0, 2), p(1, 2)], //    y-up: (0,0)(+1,0)(+1,+1)(0,-2)(+1,-2)
};

/**
 * Kick tests for the I piece (its own 4×4 table with the characteristic ±2 horizontal offsets),
 * keyed by `"from>to"`. Values are y-down; trailing comment is the published y-up source.
 */
export const KICKS_I: Readonly<Record<string, readonly Point[]>> = {
  "0>1": [p(0, 0), p(-2, 0), p(1, 0), p(-2, 1), p(1, -2)], //  y-up: (0,0)(-2,0)(+1,0)(-2,-1)(+1,+2)
  "1>0": [p(0, 0), p(2, 0), p(-1, 0), p(2, -1), p(-1, 2)], //  y-up: (0,0)(+2,0)(-1,0)(+2,+1)(-1,-2)
  "1>2": [p(0, 0), p(-1, 0), p(2, 0), p(-1, -2), p(2, 1)], //  y-up: (0,0)(-1,0)(+2,0)(-1,+2)(+2,-1)
  "2>1": [p(0, 0), p(1, 0), p(-2, 0), p(1, 2), p(-2, -1)], //  y-up: (0,0)(+1,0)(-2,0)(+1,-2)(-2,+1)
  "2>3": [p(0, 0), p(2, 0), p(-1, 0), p(2, -1), p(-1, 2)], //  y-up: (0,0)(+2,0)(-1,0)(+2,+1)(-1,-2)
  "3>2": [p(0, 0), p(-2, 0), p(1, 0), p(-2, 1), p(1, -2)], //  y-up: (0,0)(-2,0)(+1,0)(-2,-1)(+1,+2)
  "3>0": [p(0, 0), p(1, 0), p(-2, 0), p(1, 2), p(-2, -1)], //  y-up: (0,0)(+1,0)(-2,0)(+1,-2)(-2,+1)
  "0>3": [p(0, 0), p(-1, 0), p(2, 0), p(-1, -2), p(2, 1)], //  y-up: (0,0)(-1,0)(+2,0)(-1,+2)(+2,-1)
};

/**
 * Kick tests for the O piece. O is rotation-invariant (its four states are the same 2×2 cells), so
 * SRS gives it only the `(0,0)` test: a rotate flips the `rotation` field but never shifts, and is
 * still gated by `collides` (a fully buried O correctly no-ops).
 */
export const KICKS_O: Readonly<Record<string, readonly Point[]>> = {
  "0>1": [p(0, 0)],
  "1>0": [p(0, 0)],
  "1>2": [p(0, 0)],
  "2>1": [p(0, 0)],
  "2>3": [p(0, 0)],
  "3>2": [p(0, 0)],
  "3>0": [p(0, 0)],
  "0>3": [p(0, 0)],
};

/** Select the kick table for a piece type: O and I have their own; J/L/S/T/Z share one. */
function kickTableFor(
  type: TetrominoType,
): Readonly<Record<string, readonly Point[]>> {
  if (type === "O") return KICKS_O;
  if (type === "I") return KICKS_I;
  return KICKS_JLSTZ;
}

/** The `"from>to"` lookup key for a rotation transition. */
const transitionKey = (from: RotationState, to: RotationState): string =>
  `${from}>${to}`;

/**
 * Rotate `piece` one 90° step in `dir`, applying SRS wall kicks. Tries each kick offset for the
 * transition in order and returns a fresh `Piece` (advanced `rotation`, kicked `position`) at the
 * first offset that does not `collide`. If every offset collides, the rotation is rejected and the
 * **input `piece` reference** is returned unchanged (no-op contract). Never mutates `board`,
 * `piece`, or the kick tables.
 */
export function rotate(board: Board, piece: Piece, dir: RotationDir): Piece {
  const from = piece.rotation;
  // CW advances +1, CCW advances +3 (== -1), both mod 4. Provably in 0..3, so the cast is safe.
  const to = ((dir === "cw" ? from + 1 : from + 3) & 3) as RotationState;

  const tests = kickTableFor(piece.type)[transitionKey(from, to)];
  for (const t of tests) {
    const pos = { x: piece.position.x + t.x, y: piece.position.y + t.y };
    if (!collides(board, piece.type, pos, to)) {
      return { ...piece, rotation: to, position: pos };
    }
  }
  return piece;
}

/** Rotate 90° clockwise (`0→1→2→3`); no-op (input reference) if fully blocked. */
export function rotateCW(board: Board, piece: Piece): Piece {
  return rotate(board, piece, "cw");
}

/** Rotate 90° counter-clockwise (`0→3→2→1`); no-op (input reference) if fully blocked. */
export function rotateCCW(board: Board, piece: Piece): Piece {
  return rotate(board, piece, "ccw");
}
