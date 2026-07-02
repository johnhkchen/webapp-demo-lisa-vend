import { describe, expect, it } from "vitest";

import { ghostPiece, ghostCells } from "./ghost";
import { hardDrop } from "./movement";
import { pieceCells } from "./collision";
import { emptyBoard } from "./board";
import { COLS, ROWS } from "./constants";
import type { Board, Piece } from "./types";

/** A T piece near the top-middle, fully in-bounds — the canonical fixture (cf. overlay.test.ts). */
const T_PIECE: Piece = { type: "T", rotation: 0, position: { x: 3, y: 0 } };

/** Max row index occupied by a piece's resolved cells. */
function bottomRow(piece: Piece): number {
  return Math.max(...pieceCells(piece.type, piece.position, piece.rotation).map((c) => c.y));
}

describe("ghostPiece", () => {
  it("coincides exactly with hardDrop's landing", () => {
    const board = emptyBoard(COLS, ROWS);
    // The core invariant: the ghost IS the hard-drop projection, so it can never disagree.
    expect(ghostPiece(board, T_PIECE)).toEqual(hardDrop(board, T_PIECE));
  });

  it("lands on the floor of an empty board", () => {
    const board = emptyBoard(COLS, ROWS);
    const ghost = ghostPiece(board, T_PIECE);
    // Its lowest cells rest on the bottom row.
    expect(bottomRow(ghost)).toBe(ROWS - 1);
  });

  it("lands on top of a settled stack, not inside it", () => {
    const board = emptyBoard(COLS, ROWS);
    // Fill the entire bottom row so any piece must rest above it.
    for (let x = 0; x < COLS; x++) board[ROWS - 1][x] = "I";

    const ghost = ghostPiece(board, T_PIECE);

    // No resolved ghost cell overlaps a settled cell...
    const cells = pieceCells(ghost.type, ghost.position, ghost.rotation);
    expect(cells.every(({ x, y }) => board[y][x] === null)).toBe(true);
    // ...and it rests just above the filled floor, not on the true floor.
    expect(bottomRow(ghost)).toBe(ROWS - 2);
  });

  it("returns the input reference for an already-resting piece (no-op contract)", () => {
    const board = emptyBoard(COLS, ROWS);
    const rested = hardDrop(board, T_PIECE);
    expect(ghostPiece(board, rested)).toBe(rested);
  });

  it("does not mutate the board or the piece", () => {
    const board = emptyBoard(COLS, ROWS);
    const boardSnapshot: Board = board.map((row) => row.slice());
    const pieceSnapshot = JSON.parse(JSON.stringify(T_PIECE)) as Piece;

    ghostPiece(board, T_PIECE);

    expect(board).toEqual(boardSnapshot);
    expect(T_PIECE).toEqual(pieceSnapshot);
  });
});

describe("ghostCells", () => {
  it("returns four cells, none overlapping a settled cell", () => {
    const board = emptyBoard(COLS, ROWS);
    // Settled cells in the piece's drop columns so the invariant is meaningful.
    for (let x = 0; x < COLS; x++) board[ROWS - 1][x] = "Z";

    const cells = ghostCells(board, T_PIECE);

    expect(cells).toHaveLength(4);
    // The "never overlaps settled cells" invariant.
    expect(cells.every(({ x, y }) => board[y][x] === null)).toBe(true);
  });

  it("equals pieceCells of the ghost landing (reuse, no hard-coded coordinates)", () => {
    const board = emptyBoard(COLS, ROWS);
    const landing = ghostPiece(board, T_PIECE);
    expect(ghostCells(board, T_PIECE)).toEqual(
      pieceCells(landing.type, landing.position, landing.rotation),
    );
  });

  it("returns fresh Points that do not alias each other or the shape tables", () => {
    const board = emptyBoard(COLS, ROWS);
    const first = ghostCells(board, T_PIECE);
    first[0].x = 999; // mutate the caller's copy...

    const second = ghostCells(board, T_PIECE);
    expect(second[0].x).not.toBe(999); // ...a fresh call is unaffected.
  });
});
