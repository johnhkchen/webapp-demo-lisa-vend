/**
 * Shape data for the seven standard tetrominoes (I, O, T, S, Z, J, L) and their four SRS
 * rotation states.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). Every value
 * here is static data or a pure accessor. This module supplies the concrete cell offsets that
 * `lib/types.ts` promises but does not store: `RotationState` indexes the per-piece rotation
 * array, and a `Piece`'s occupied board squares are later derived as `position + cellsFor(...)`.
 *
 * Coordinate convention (matches `types.ts`/`board.ts`): each cell is a `Point { x, y }` offset
 * *within the piece's bounding box*, `x` growing right, `y` growing down, origin top-left — the
 * same axes as `board[y][x]`, so a resolved piece stamps onto the board with no axis flip.
 *
 * Scope boundary: this is *shape* data only. Wall-kick offset tables, spawn board-column /
 * initial position, and piece colors are separate concerns (later tickets). The 7-bag / RNG
 * sequencing is the sibling ticket T-002-01-03 — it consumes `TETROMINO_TYPES` below but owns
 * the bag logic; `TETROMINO_TYPES` here is just the type alphabet expressed as an ordered list.
 */

import type { Point, TetrominoType, RotationState } from "./types";

/** Terse cell constructor, local to this module, to keep the offset tables readable. */
const p = (x: number, y: number): Point => ({ x, y });

/**
 * The seven piece ids in canonical order. The type alphabet as data — handy for enumerating
 * every piece (tests, the `NextPreview`, and the 7-bag in T-002-01-03 all iterate it).
 */
export const TETROMINO_TYPES: readonly TetrominoType[] = [
  "I",
  "O",
  "T",
  "S",
  "Z",
  "J",
  "L",
];

/**
 * Side length of each piece's square bounding box — the `N×N` grid its offsets live in and
 * rotate within. I uses 4×4, the O is a fixed 2×2, and T/S/Z/J/L use 3×3 (the standard SRS
 * boxes). Exposed because rotation math and future wall-kick tables key off the box center.
 */
export const BOUNDING_BOX: Readonly<Record<TetrominoType, number>> = {
  I: 4,
  O: 2,
  T: 3,
  S: 3,
  Z: 3,
  J: 3,
  L: 3,
};

/**
 * The core table: `TETROMINO_CELLS[type][rotation]` is the four occupied cell offsets for that
 * piece in that SRS orientation (rotation ∈ 0..3 = spawn, R, 180, L). Each successive state is
 * the previous one rotated 90° clockwise within the bounding box; O is rotation-invariant (all
 * four states are the same 2×2 square). The `readonly` view guards the shared arrays from
 * accidental in-place mutation by callers.
 */
export const TETROMINO_CELLS: Readonly<
  Record<TetrominoType, readonly (readonly Point[])[]>
> = {
  // I — horizontal bar on row 1 of a 4×4 box; rotates through the vertical bars.
  I: [
    [p(0, 1), p(1, 1), p(2, 1), p(3, 1)],
    [p(2, 0), p(2, 1), p(2, 2), p(2, 3)],
    [p(0, 2), p(1, 2), p(2, 2), p(3, 2)],
    [p(1, 0), p(1, 1), p(1, 2), p(1, 3)],
  ],
  // O — 2×2 square, identical in every state (does not rotate).
  O: [
    [p(0, 0), p(1, 0), p(0, 1), p(1, 1)],
    [p(0, 0), p(1, 0), p(0, 1), p(1, 1)],
    [p(0, 0), p(1, 0), p(0, 1), p(1, 1)],
    [p(0, 0), p(1, 0), p(0, 1), p(1, 1)],
  ],
  // T — up-tab spawn, in a 3×3 box.
  T: [
    [p(1, 0), p(0, 1), p(1, 1), p(2, 1)],
    [p(1, 0), p(1, 1), p(2, 1), p(1, 2)],
    [p(0, 1), p(1, 1), p(2, 1), p(1, 2)],
    [p(1, 0), p(0, 1), p(1, 1), p(1, 2)],
  ],
  // S — right-leaning skew.
  S: [
    [p(1, 0), p(2, 0), p(0, 1), p(1, 1)],
    [p(1, 0), p(1, 1), p(2, 1), p(2, 2)],
    [p(1, 1), p(2, 1), p(0, 2), p(1, 2)],
    [p(0, 0), p(0, 1), p(1, 1), p(1, 2)],
  ],
  // Z — left-leaning skew.
  Z: [
    [p(0, 0), p(1, 0), p(1, 1), p(2, 1)],
    [p(2, 0), p(1, 1), p(2, 1), p(1, 2)],
    [p(0, 1), p(1, 1), p(1, 2), p(2, 2)],
    [p(1, 0), p(0, 1), p(1, 1), p(0, 2)],
  ],
  // J — corner on the left.
  J: [
    [p(0, 0), p(0, 1), p(1, 1), p(2, 1)],
    [p(1, 0), p(2, 0), p(1, 1), p(1, 2)],
    [p(0, 1), p(1, 1), p(2, 1), p(2, 2)],
    [p(1, 0), p(1, 1), p(0, 2), p(1, 2)],
  ],
  // L — corner on the right.
  L: [
    [p(2, 0), p(0, 1), p(1, 1), p(2, 1)],
    [p(1, 0), p(1, 1), p(1, 2), p(2, 2)],
    [p(0, 1), p(1, 1), p(2, 1), p(0, 2)],
    [p(0, 0), p(1, 0), p(1, 1), p(1, 2)],
  ],
};

/**
 * The four cell offsets for a piece in a given rotation state — the ergonomic entry point for
 * "where is this piece right now". Equivalent to `TETROMINO_CELLS[type][rotation]`.
 */
export function cellsFor(
  type: TetrominoType,
  rotation: RotationState,
): readonly Point[] {
  return TETROMINO_CELLS[type][rotation];
}
