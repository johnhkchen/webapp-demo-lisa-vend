import { describe, expect, it } from "vitest";

import { overlayPiece } from "./overlay";
import { pieceCells } from "./collision";
import { emptyBoard } from "./board";
import { COLS, ROWS } from "./constants";
import type { Board, Piece } from "./types";

/** A T piece near the top-middle, fully in-bounds. */
const T_PIECE: Piece = { type: "T", rotation: 0, position: { x: 3, y: 0 } };

describe("overlayPiece", () => {
  it("paints exactly the piece's cells with its type", () => {
    const out = overlayPiece(emptyBoard(COLS, ROWS), T_PIECE);

    const expected = pieceCells(T_PIECE.type, T_PIECE.position, T_PIECE.rotation);
    // Every derived cell carries the piece type...
    for (const { x, y } of expected) {
      expect(out[y][x]).toBe("T");
    }
    // ...and nothing else is filled (4 cells total for a piece).
    const filled = out.flat().filter((c) => c !== null);
    expect(filled).toHaveLength(4);
    expect(filled.every((c) => c === "T")).toBe(true);
  });

  it("does not mutate the input board", () => {
    const input = emptyBoard(COLS, ROWS);
    const snapshot: Board = input.map((row) => row.slice());

    const out = overlayPiece(input, T_PIECE);

    expect(input).toEqual(snapshot); // unchanged
    expect(out).not.toBe(input); // fresh matrix
    expect(out[0]).not.toBe(input[0]); // fresh rows
  });

  it("preserves settled cells and lets the piece win on overlap", () => {
    const board = emptyBoard(COLS, ROWS);
    board[ROWS - 1][0] = "I"; // settled, far from the piece
    const cells = pieceCells(T_PIECE.type, T_PIECE.position, T_PIECE.rotation);
    const { x, y } = cells[0];
    board[y][x] = "S"; // settled cell the piece will cover

    const out = overlayPiece(board, T_PIECE);

    expect(out[ROWS - 1][0]).toBe("I"); // untouched settled cell survives
    expect(out[y][x]).toBe("T"); // overlay wins over the settled "S"
  });

  it("skips out-of-bounds piece cells without throwing", () => {
    // Anchor the piece so part of it sits left of column 0.
    const offGrid: Piece = { type: "T", rotation: 0, position: { x: -1, y: 0 } };
    const all = pieceCells(offGrid.type, offGrid.position, offGrid.rotation);
    const inBounds = all.filter(({ x, y }) => x >= 0 && x < COLS && y >= 0 && y < ROWS);

    const out = overlayPiece(emptyBoard(COLS, ROWS), offGrid);

    const filled = out.flat().filter((c) => c !== null);
    expect(filled).toHaveLength(inBounds.length);
    expect(inBounds.length).toBeLessThan(all.length); // some really were dropped
  });
});
