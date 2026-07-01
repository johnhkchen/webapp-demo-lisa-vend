import { describe, it, expect } from "vitest";
import { emptyBoard } from "./board";

describe("emptyBoard", () => {
  it("has `height` rows, each with `width` columns", () => {
    const board = emptyBoard(10, 20);
    expect(board).toHaveLength(20);
    expect(board.every((row) => row.length === 10)).toBe(true);
  });

  it("is entirely empty (every cell is null)", () => {
    const board = emptyBoard(10, 20);
    expect(board.flat().every((cell) => cell === null)).toBe(true);
  });

  it("does not alias rows — writing one cell leaves the rest untouched", () => {
    const board = emptyBoard(10, 20);
    board[0][0] = "I";
    expect(board[1][0]).toBeNull();
    // Exactly one cell changed.
    expect(board.flat().filter((cell) => cell !== null)).toEqual(["I"]);
  });

  it("respects (width, height) argument order for non-square boards", () => {
    const board = emptyBoard(3, 5);
    expect(board).toHaveLength(5); // height → rows
    expect(board[0]).toHaveLength(3); // width → columns
  });
});
