import { describe, expect, it } from "vitest";

import { enumeratePlacements } from "./bot-placements";
import { hardDrop } from "./movement";
import { lockPiece } from "./gravity";
import { pieceCells, collides } from "./collision";
import { emptyBoard } from "./board";
import { COLS, ROWS } from "./constants";
import type { Board, Piece, PieceType } from "./types";

/** Reconstruct the landing a candidate claims, from its `(rotation, column)` alone. */
function drop(board: Board, type: PieceType, rotation: 0 | 1 | 2 | 3, column: number): Piece {
  return hardDrop(board, { type, rotation, position: { x: column, y: 0 } });
}

/** A board with a jagged settled floor, so drops land at varied heights (not all on the floor). */
function jaggedBoard(): Board {
  const board = emptyBoard(COLS, ROWS);
  // Bottom row full except a 2-wide notch at x=4,5; a tower at x=0 two cells tall.
  for (let x = 0; x < COLS; x++) board[ROWS - 1][x] = "I";
  board[ROWS - 1][4] = null;
  board[ROWS - 1][5] = null;
  board[ROWS - 2][0] = "I";
  board[ROWS - 3][0] = "I";
  return board;
}

describe("enumeratePlacements — acceptance", () => {
  it("every candidate's cells and board match a hardDrop at its rotation/column", () => {
    const board = jaggedBoard();
    for (const type of ["T", "L", "S", "I", "O"] as PieceType[]) {
      const candidates = enumeratePlacements(board, type);
      expect(candidates.length).toBeGreaterThan(0);
      for (const c of candidates) {
        const landing = drop(board, type, c.rotation, c.column);
        // The candidate landing IS the hard-drop of that piece at that rotation/column.
        expect(c.piece).toEqual(landing);
        expect(c.cells).toEqual(
          pieceCells(landing.type, landing.position, landing.rotation),
        );
        // The settled board IS lockPiece of that same landing (no line clear applied).
        expect(c.board).toEqual(lockPiece(board, landing));
      }
    }
  });

  it("does not mutate the input board (and takes no bag, so bag-immutability is structural)", () => {
    const board = jaggedBoard();
    const snapshot: Board = board.map((row) => row.slice());
    enumeratePlacements(board, "T");
    expect(board).toEqual(snapshot);
  });
});

describe("enumeratePlacements — settled board is lock-only", () => {
  it("each candidate board carries the four landing cells colored by the piece type", () => {
    const board = emptyBoard(COLS, ROWS);
    const candidates = enumeratePlacements(board, "L");
    for (const c of candidates) {
      for (const { x, y } of c.cells) {
        expect(c.board[y][x]).toBe("L");
      }
      // Board = settled floor (empty) + exactly the 4 piece cells; no line clear removed a row.
      const filled = c.board.flat().filter((cell) => cell !== null).length;
      expect(filled).toBe(4);
    }
  });
});

describe("enumeratePlacements — distinct-orientation dedup", () => {
  it("O collapses its 4 identical states to one per column (COLS-1 on a 10-wide board)", () => {
    const candidates = enumeratePlacements(emptyBoard(COLS, ROWS), "O");
    // O is 2 wide, so anchors 0..8 → 9 columns; the 4 identical rotations dedup away.
    expect(candidates).toHaveLength(COLS - 1);
    expect(candidates.every((c) => c.rotation === 0)).toBe(true);
  });

  it("I yields the horizontal + vertical placements, with mirror rotations deduped", () => {
    const candidates = enumeratePlacements(emptyBoard(COLS, ROWS), "I");
    // 10 vertical (one per column) + 7 horizontal (leftmost anchor 0..6); rot2≡rot0, rot3≡rot1.
    expect(candidates).toHaveLength(10 + 7);
  });
});

describe("enumeratePlacements — reachability", () => {
  it("never emits a spawn that collides at the top of the field", () => {
    const board = jaggedBoard();
    const candidates = enumeratePlacements(board, "T");
    for (const c of candidates) {
      expect(collides(board, "T", { x: c.column, y: 0 }, c.rotation)).toBe(false);
    }
  });

  it("drops nothing into a column whose stack already reaches the top", () => {
    const board = emptyBoard(COLS, ROWS);
    // Fill column 0 top-to-bottom: any placement spanning x=0 is unreachable from the top.
    for (let y = 0; y < ROWS; y++) board[y][0] = "Z";
    const candidates = enumeratePlacements(board, "O");
    // No candidate occupies column 0 (it is buried from the very top).
    expect(candidates.every((c) => c.cells.every(({ x }) => x !== 0))).toBe(true);
  });
});

describe("enumeratePlacements — purity & shape", () => {
  it("returns fresh Points that do not alias across calls", () => {
    const board = emptyBoard(COLS, ROWS);
    const first = enumeratePlacements(board, "T");
    first[0].cells[0].x = 999;
    const second = enumeratePlacements(board, "T");
    expect(second[0].cells[0].x).not.toBe(999);
  });

  it("every candidate board has the input dimensions", () => {
    const board = emptyBoard(COLS, ROWS);
    for (const c of enumeratePlacements(board, "J")) {
      expect(c.board).toHaveLength(ROWS);
      expect(c.board.every((row) => row.length === COLS)).toBe(true);
    }
  });
});
