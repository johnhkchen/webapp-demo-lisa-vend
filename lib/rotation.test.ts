import { describe, it, expect } from "vitest";
import {
  rotate,
  rotateCW,
  rotateCCW,
  KICKS_JLSTZ,
  KICKS_I,
  KICKS_O,
} from "./rotation";
import { pieceCells } from "./collision";
import { collides } from "./collision";
import { emptyBoard } from "./board";
import type { Board, Point, Piece, TetrominoType } from "./types";

/** Stable string key for a cell, so cell lists compare as unordered sets. */
const keyOf = (c: Point): string => `${c.x},${c.y}`;
const asSet = (cells: readonly Point[]): Set<string> => new Set(cells.map(keyOf));

/** Stamp settled cells of a given type into a fixture board (mutates + returns it). */
const settle = (board: Board, cells: Point[], type: TetrominoType): Board => {
  for (const { x, y } of cells) board[y][x] = type;
  return board;
};

/** Fill every board cell, then clear the given cells (carve a footprint out of a full board). */
const fullBoardExcept = (
  width: number,
  height: number,
  clear: Point[],
): Board => {
  const board: Board = Array.from({ length: height }, () =>
    Array.from({ length: width }, (): TetrominoType => "I"),
  );
  for (const { x, y } of clear) board[y][x] = null;
  return board;
};

const TRANSITIONS = ["0>1", "1>0", "1>2", "2>1", "2>3", "3>2", "3>0", "0>3"];

describe("kick tables", () => {
  it.each([
    ["JLSTZ", KICKS_JLSTZ, 5],
    ["I", KICKS_I, 5],
    ["O", KICKS_O, 1],
  ] as const)("%s table has the 8 transitions, each %d test(s)", (_name, table, len) => {
    expect(Object.keys(table).sort()).toEqual([...TRANSITIONS].sort());
    for (const key of TRANSITIONS) {
      expect(table[key]).toHaveLength(len);
      // Test 1 is always the naive in-place rotation.
      expect(table[key][0]).toEqual({ x: 0, y: 0 });
    }
  });
});

describe("open-space rotation (test 1 always wins)", () => {
  it("rotateCW advances rotation 0→1→2→3→0 with position unchanged", () => {
    const board = emptyBoard(10, 20);
    let piece: Piece = { type: "T", rotation: 0, position: { x: 3, y: 0 } };
    const start = piece;
    for (const expected of [1, 2, 3, 0] as const) {
      const next = rotateCW(board, piece);
      expect(next).not.toBe(piece); // fresh object each success
      expect(next.rotation).toBe(expected);
      expect(next.position).toEqual({ x: 3, y: 0 });
      piece = next;
    }
    expect(piece).toEqual(start); // full cycle returns to the starting state (by value)
  });

  it("rotateCCW advances rotation 0→3→2→1→0", () => {
    const board = emptyBoard(10, 20);
    let piece: Piece = { type: "L", rotation: 0, position: { x: 4, y: 5 } };
    for (const expected of [3, 2, 1, 0] as const) {
      piece = rotateCCW(board, piece);
      expect(piece.rotation).toBe(expected);
      expect(piece.position).toEqual({ x: 4, y: 5 });
    }
  });

  it("rotateCCW inverts rotateCW in open space", () => {
    const board = emptyBoard(10, 20);
    const piece: Piece = { type: "J", rotation: 0, position: { x: 4, y: 5 } };
    expect(rotateCCW(board, rotateCW(board, piece))).toEqual(piece);
  });
});

// --- Canonical SRS kick cases: exact kicked position, and proof a kick (not test 1) happened. ---
interface KickCase {
  name: string;
  board: Board;
  piece: Piece;
  dir: "cw" | "ccw";
  expected: { rotation: number; position: Point };
}

const KICK_CASES: KickCase[] = [
  {
    // T state 1 hugging the left wall, CW→2: naive clips x<0, test 2 (+1,0) kicks right.
    name: "JLSTZ left-wall kick (T 1→2, test 2)",
    board: emptyBoard(10, 20),
    piece: { type: "T", rotation: 1, position: { x: -1, y: 1 } },
    dir: "cw",
    expected: { rotation: 2, position: { x: 0, y: 1 } },
  },
  {
    // T resting on the floor, CW 0→1: naive pokes below floor, test 3 (-1,-1) kicks up-left.
    name: "JLSTZ floor kick (T 0→1, test 3)",
    board: emptyBoard(10, 20),
    piece: { type: "T", rotation: 0, position: { x: 4, y: 18 } },
    dir: "cw",
    expected: { rotation: 1, position: { x: 3, y: 17 } },
  },
  {
    // Vertical I flush to the right wall, CW 1→2: naive clips x>=width, test 2 (-1,0) kicks left.
    name: "I right-wall kick (I 1→2, test 2)",
    board: emptyBoard(10, 20),
    piece: { type: "I", rotation: 1, position: { x: 7, y: 0 } },
    dir: "cw",
    expected: { rotation: 2, position: { x: 6, y: 0 } },
  },
];

describe("SRS wall/floor/I kicks resolve to the correct position", () => {
  it.each(KICK_CASES)("$name", ({ board, piece, dir, expected }) => {
    // The naive in-place rotation (test 1) must genuinely collide, so this proves a *kick*.
    const to = ((dir === "cw" ? piece.rotation + 1 : piece.rotation + 3) & 3) as
      | 0
      | 1
      | 2
      | 3;
    expect(collides(board, piece.type, piece.position, to)).toBe(true);

    const result = rotate(board, piece, dir);
    expect(result.rotation).toBe(expected.rotation);
    expect(result.position).toEqual(expected.position);
    // The resolved placement is actually legal.
    expect(collides(board, result.type, result.position, result.rotation)).toBe(
      false,
    );
  });
});

describe("T-spin corner kick (T-spin double, test 5)", () => {
  it("a T rotates into a slot using the deepest kick", () => {
    // Blocks (5,7) and (4,5) make kick tests 1–4 all collide; only test 5 (-1,+2) fits.
    const board = settle(
      emptyBoard(10, 20),
      [
        { x: 5, y: 7 },
        { x: 4, y: 5 },
      ],
      "I",
    );
    const piece: Piece = { type: "T", rotation: 0, position: { x: 4, y: 5 } };

    // The starting piece is a legal placement.
    expect(collides(board, "T", piece.position, piece.rotation)).toBe(false);
    // Tests 1–4 for the 0→1 transition each collide; only the last kick survives.
    const t = KICKS_JLSTZ["0>1"];
    for (const idx of [0, 1, 2, 3]) {
      const pos = { x: 4 + t[idx].x, y: 5 + t[idx].y };
      expect(collides(board, "T", pos, 1)).toBe(true);
    }
    expect(collides(board, "T", { x: 4 + t[4].x, y: 5 + t[4].y }, 1)).toBe(false);

    const result = rotateCW(board, piece);
    expect(result.rotation).toBe(1);
    expect(result.position).toEqual({ x: 3, y: 7 }); // (4-1, 5+2)
  });
});

describe("fully-blocked rotation is rejected (no-op contract)", () => {
  it("returns the input reference when every kick collides", () => {
    // Full board except the T's current footprint → every candidate overlaps a filled cell.
    const piece: Piece = { type: "T", rotation: 0, position: { x: 4, y: 10 } };
    const footprint = pieceCells(piece.type, piece.position, piece.rotation);
    const board = fullBoardExcept(10, 20, footprint);

    const cw = rotate(board, piece, "cw");
    const ccw = rotate(board, piece, "ccw");
    expect(cw).toBe(piece); // same reference
    expect(ccw).toBe(piece);
    expect(cw.position).toEqual({ x: 4, y: 10 });
  });
});

describe("O piece", () => {
  it("advances rotation with identical cells (rotation-invariant)", () => {
    const board = emptyBoard(10, 20);
    const piece: Piece = { type: "O", rotation: 0, position: { x: 4, y: 0 } };
    const before = asSet(pieceCells("O", piece.position, piece.rotation));

    const r1 = rotateCW(board, piece);
    expect(r1.rotation).toBe(1);
    expect(r1.position).toEqual(piece.position);
    expect(asSet(pieceCells("O", r1.position, r1.rotation))).toEqual(before);
  });
});

describe("purity", () => {
  it("does not mutate board or piece on a successful kick", () => {
    const board = emptyBoard(10, 20);
    const piece: Piece = { type: "T", rotation: 1, position: { x: -1, y: 1 } };
    const boardSnap = JSON.stringify(board);
    const pieceSnap = JSON.stringify(piece);
    rotateCW(board, piece);
    expect(JSON.stringify(board)).toBe(boardSnap);
    expect(JSON.stringify(piece)).toBe(pieceSnap);
  });

  it("does not mutate board or piece on a no-op", () => {
    const piece: Piece = { type: "T", rotation: 0, position: { x: 4, y: 10 } };
    const board = fullBoardExcept(
      10,
      20,
      pieceCells(piece.type, piece.position, piece.rotation),
    );
    const boardSnap = JSON.stringify(board);
    const pieceSnap = JSON.stringify(piece);
    rotateCW(board, piece);
    expect(JSON.stringify(board)).toBe(boardSnap);
    expect(JSON.stringify(piece)).toBe(pieceSnap);
  });
});
