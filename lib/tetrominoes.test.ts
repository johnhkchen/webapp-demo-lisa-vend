import { describe, it, expect } from "vitest";
import type { Point, RotationState } from "./types";
import {
  TETROMINO_TYPES,
  BOUNDING_BOX,
  TETROMINO_CELLS,
  cellsFor,
} from "./tetrominoes";

/** Stable string key for a cell, so states can be compared as unordered sets. */
const keyOf = (c: Point): string => `${c.x},${c.y}`;
const asSet = (cells: readonly Point[]): Set<string> => new Set(cells.map(keyOf));

/**
 * Independent SRS oracle: rotate a state 90° clockwise within an `n×n` box via
 * `(x, y) → (n-1-y, x)`. The test derives states 1–3 from state 0 and compares to the stored
 * table, so a mistranscribed coordinate fails rather than being silently mirrored.
 */
const rotateCW = (cells: readonly Point[], n: number): Point[] =>
  cells.map((c) => ({ x: n - 1 - c.y, y: c.x }));

const ROTATIONS: RotationState[] = [0, 1, 2, 3];

/** Known SRS spawn (state 0) shapes — anchors the rotation chain to a correct orientation. */
const KNOWN_SPAWN: Record<string, [number, number][]> = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};

describe("tetrominoes", () => {
  it("defines all seven pieces, each with four rotation states", () => {
    expect([...TETROMINO_TYPES].sort()).toEqual(
      ["I", "J", "L", "O", "S", "T", "Z"].sort(),
    );
    expect(TETROMINO_TYPES).toHaveLength(7);
    for (const type of TETROMINO_TYPES) {
      expect(TETROMINO_CELLS[type]).toHaveLength(4);
    }
  });

  it("every one of the 28 states occupies exactly four cells", () => {
    for (const type of TETROMINO_TYPES) {
      for (const r of ROTATIONS) {
        expect(TETROMINO_CELLS[type][r], `${type} state ${r}`).toHaveLength(4);
      }
    }
  });

  it("every state's four cells are distinct", () => {
    for (const type of TETROMINO_TYPES) {
      for (const r of ROTATIONS) {
        const cells = TETROMINO_CELLS[type][r];
        expect(asSet(cells).size, `${type} state ${r} has a duplicate cell`).toBe(4);
      }
    }
  });

  it("every offset lies within the piece's bounding box", () => {
    for (const type of TETROMINO_TYPES) {
      const n = BOUNDING_BOX[type];
      for (const r of ROTATIONS) {
        for (const c of TETROMINO_CELLS[type][r]) {
          expect(c.x, `${type} state ${r} x out of box`).toBeGreaterThanOrEqual(0);
          expect(c.y, `${type} state ${r} y out of box`).toBeGreaterThanOrEqual(0);
          expect(c.x, `${type} state ${r} x out of box`).toBeLessThan(n);
          expect(c.y, `${type} state ${r} y out of box`).toBeLessThan(n);
        }
      }
    }
  });

  it("each non-O state is the previous state rotated 90° CW within the box (full cycle)", () => {
    for (const type of TETROMINO_TYPES) {
      if (type === "O") continue;
      const n = BOUNDING_BOX[type];
      for (const r of ROTATIONS) {
        const next = ((r + 1) % 4) as RotationState;
        const derived = asSet(rotateCW(TETROMINO_CELLS[type][r], n));
        const stored = asSet(TETROMINO_CELLS[type][next]);
        expect(
          [...derived].sort(),
          `${type}: rotateCW(state ${r}) should equal state ${next}`,
        ).toEqual([...stored].sort());
      }
    }
  });

  it("O is rotation-invariant (all four states are the same square)", () => {
    const spawn = asSet(TETROMINO_CELLS.O[0]);
    for (const r of ROTATIONS) {
      expect([...asSet(TETROMINO_CELLS.O[r])].sort()).toEqual([...spawn].sort());
    }
  });

  it("spawn states match the known SRS offsets", () => {
    for (const type of TETROMINO_TYPES) {
      const expected = new Set(KNOWN_SPAWN[type].map(([x, y]) => `${x},${y}`));
      expect([...asSet(TETROMINO_CELLS[type][0])].sort(), `${type} spawn`).toEqual(
        [...expected].sort(),
      );
    }
  });

  it("cellsFor returns the same array as the table", () => {
    for (const type of TETROMINO_TYPES) {
      for (const r of ROTATIONS) {
        expect(cellsFor(type, r)).toBe(TETROMINO_CELLS[type][r]);
      }
    }
  });
});
