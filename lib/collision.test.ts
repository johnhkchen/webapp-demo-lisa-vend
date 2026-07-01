import { describe, it, expect } from "vitest";
import { collides, pieceCells } from "./collision";
import { cellsFor } from "./tetrominoes";
import { emptyBoard } from "./board";
import type { Board, Point, TetrominoType, RotationState } from "./types";

/** Stable string key for a cell, so cell lists can be compared as unordered sets. */
const keyOf = (c: Point): string => `${c.x},${c.y}`;
const asSet = (cells: readonly Point[]): Set<string> => new Set(cells.map(keyOf));

/** Stamp settled cells of a given type into a fixture board (mutates + returns it). */
const settle = (board: Board, cells: Point[], type: TetrominoType): Board => {
  for (const { x, y } of cells) board[y][x] = type;
  return board;
};

describe("pieceCells", () => {
  it("translates shape offsets by the anchor position", () => {
    // O spawn offsets are (0,0),(1,0),(0,1),(1,1); anchored at (4,0).
    expect(asSet(pieceCells("O", { x: 4, y: 0 }, 0))).toEqual(
      asSet([
        { x: 4, y: 0 },
        { x: 5, y: 0 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ]),
    );
  });

  it("does not mutate or alias the shared shape table", () => {
    const before = asSet(cellsFor("T", 1));
    const cells = pieceCells("T", { x: 3, y: 5 }, 1);
    cells[0].x = 999; // mutating the result must not touch the source table
    expect(asSet(cellsFor("T", 1))).toEqual(before);
  });
});

interface Case {
  name: string;
  board: Board;
  type: TetrominoType;
  pos: Point;
  rot: RotationState;
  expected: boolean;
}

const CASES: Case[] = [
  // --- legal placements → false ---
  { name: "legal placement on empty board", board: emptyBoard(10, 20), type: "T", pos: { x: 4, y: 0 }, rot: 0, expected: false },
  { name: "legal flush against left wall", board: emptyBoard(10, 20), type: "O", pos: { x: 0, y: 0 }, rot: 0, expected: false },
  { name: "legal flush against right wall", board: emptyBoard(10, 20), type: "O", pos: { x: 8, y: 0 }, rot: 0, expected: false },
  { name: "legal resting on the floor", board: emptyBoard(10, 20), type: "O", pos: { x: 0, y: 18 }, rot: 0, expected: false },
  // --- out of bounds → true ---
  { name: "off the left wall (x<0)", board: emptyBoard(10, 20), type: "O", pos: { x: -1, y: 0 }, rot: 0, expected: true },
  { name: "off the right wall (x>=width)", board: emptyBoard(10, 20), type: "O", pos: { x: 9, y: 0 }, rot: 0, expected: true },
  { name: "below the floor (y>=height)", board: emptyBoard(10, 20), type: "O", pos: { x: 0, y: 19 }, rot: 0, expected: true },
  { name: "above the top (y<0)", board: emptyBoard(10, 20), type: "O", pos: { x: 0, y: -1 }, rot: 0, expected: true },
  // --- overlap with settled cells ---
  { name: "overlaps a settled cell", board: settle(emptyBoard(10, 20), [{ x: 1, y: 1 }], "I"), type: "O", pos: { x: 0, y: 0 }, rot: 0, expected: true },
  { name: "adjacent to a settled cell, no overlap", board: settle(emptyBoard(10, 20), [{ x: 2, y: 0 }], "I"), type: "O", pos: { x: 0, y: 0 }, rot: 0, expected: false },
  // --- rotation actually feeds cellsFor ---
  { name: "I vertical clips the right wall", board: emptyBoard(10, 20), type: "I", pos: { x: 8, y: 0 }, rot: 1, expected: true },
  { name: "I horizontal fits mid-board", board: emptyBoard(10, 20), type: "I", pos: { x: 3, y: 0 }, rot: 0, expected: false },
  // --- odd-sized boards: dimensions read from the board, not COLS/ROWS ---
  { name: "small 2x2 board, exact fit", board: emptyBoard(2, 2), type: "O", pos: { x: 0, y: 0 }, rot: 0, expected: false },
  { name: "small 2x2 board, one past the floor", board: emptyBoard(2, 2), type: "O", pos: { x: 0, y: 1 }, rot: 0, expected: true },
  // --- per-type sanity beyond O ---
  { name: "I flush on the floor (row-1 spawn offset)", board: emptyBoard(10, 20), type: "I", pos: { x: 0, y: 18 }, rot: 0, expected: false },
  { name: "L legal mid-board", board: emptyBoard(10, 20), type: "L", pos: { x: 3, y: 5 }, rot: 0, expected: false },
];

describe("collides", () => {
  it.each(CASES)("$name → $expected", ({ board, type, pos, rot, expected }) => {
    expect(collides(board, type, pos, rot)).toBe(expected);
  });

  it("does not mutate the board it inspects", () => {
    const board = emptyBoard(10, 20);
    const snapshot = JSON.stringify(board);
    collides(board, "T", { x: 4, y: 0 }, 0);
    collides(board, "O", { x: -5, y: 30 }, 0); // wildly out of range
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
