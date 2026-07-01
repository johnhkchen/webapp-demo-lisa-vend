import { describe, it, expect } from "vitest";
import { clearLines } from "./line-clear";
import { emptyBoard } from "./board";
import { COLS, ROWS } from "./constants";
import type { Board, Cell, TetrominoType } from "./types";

/** A fully-settled row of `width` cells, all the given type. */
const fullRow = (width: number, type: TetrominoType): Cell[] =>
  Array.from({ length: width }, (): Cell => type);

/** Count of non-null (settled) cells in a board. */
const filled = (board: Board): number =>
  board.reduce((n, row) => n + row.filter((c) => c !== null).length, 0);

describe("clearLines — counts", () => {
  it("clears nothing on a board with no full rows", () => {
    const board = emptyBoard(COLS, ROWS);
    board[19][0] = "I"; // a partial bottom row — not full
    const { cleared } = clearLines(board);
    expect(cleared).toBe(0);
  });

  it("counts 1, 2, and 4 full rows", () => {
    for (const n of [1, 2, 4]) {
      const board = emptyBoard(COLS, ROWS);
      for (let i = 0; i < n; i++) board[ROWS - 1 - i] = fullRow(COLS, "O");
      expect(clearLines(board).cleared).toBe(n);
    }
  });
});

describe("clearLines — collapse", () => {
  it("drops the rows above a cleared row down by one", () => {
    const board = emptyBoard(COLS, ROWS);
    board[18][3] = "T"; // marker one row above the row we will clear
    board[19] = fullRow(COLS, "O"); // full bottom row → cleared
    const { cleared, board: out } = clearLines(board);

    expect(cleared).toBe(1);
    // marker fell from y=18 to y=19; nothing else settled
    expect(out[19][3]).toBe("T");
    expect(filled(out)).toBe(1);
    // the top row is a fresh empty row
    expect(out[0].every((c) => c === null)).toBe(true);
  });

  it("restacks survivors to the bottom when 4 rows clear (a Tetris)", () => {
    const board = emptyBoard(COLS, ROWS);
    board[10][5] = "L"; // lone marker high up
    for (let i = 0; i < 4; i++) board[ROWS - 1 - i] = fullRow(COLS, "I"); // bottom 4 full
    const { cleared, board: out } = clearLines(board);

    expect(cleared).toBe(4);
    // marker fell from y=10 by 4 rows → y=14; it is the only settled cell
    expect(out[14][5]).toBe("L");
    expect(filled(out)).toBe(1);
  });
});

describe("clearLines — non-adjacent full rows", () => {
  it("clears two non-contiguous rows and preserves the survivor between them", () => {
    const board = emptyBoard(COLS, ROWS);
    board[17] = fullRow(COLS, "S"); // full
    board[18][0] = "Z"; // partial survivor sandwiched between two full rows
    board[19] = fullRow(COLS, "S"); // full
    const { cleared, board: out } = clearLines(board);

    expect(cleared).toBe(2);
    // the sole survivor cell restacks to the very bottom
    expect(out[19][0]).toBe("Z");
    expect(filled(out)).toBe(1);
  });
});

describe("clearLines — dimensions & extremes", () => {
  it("preserves board dimensions", () => {
    const board = emptyBoard(COLS, ROWS);
    board[19] = fullRow(COLS, "O");
    const { board: out } = clearLines(board);
    expect(out).toHaveLength(ROWS);
    expect(out.every((row) => row.length === COLS)).toBe(true);
  });

  it("clears a completely full board to an all-empty board of the same size", () => {
    const board: Board = Array.from({ length: ROWS }, () => fullRow(COLS, "J"));
    const { cleared, board: out } = clearLines(board);
    expect(cleared).toBe(ROWS);
    expect(out).toHaveLength(ROWS);
    expect(filled(out)).toBe(0);
  });
});

describe("clearLines — purity", () => {
  it("does not mutate the input board", () => {
    const board = emptyBoard(COLS, ROWS);
    board[19] = fullRow(COLS, "O");
    board[18][2] = "T";
    const snapshot = JSON.stringify(board);
    clearLines(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("allocates independent empty rows (no aliasing)", () => {
    const board = emptyBoard(COLS, ROWS);
    board[18] = fullRow(COLS, "O");
    board[19] = fullRow(COLS, "O"); // 2 cleared → 2 fresh empty rows prepended
    const { board: out } = clearLines(board);
    out[0][0] = "I"; // mutate one prepended empty row
    expect(out[1][0]).toBeNull(); // the other is untouched
  });
});
