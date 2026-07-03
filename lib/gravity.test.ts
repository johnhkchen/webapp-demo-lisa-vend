import { describe, it, expect } from "vitest";
import { lockPiece, applyGravity } from "./gravity";
import { pieceCells } from "./collision";
import { emptyBoard } from "./board";
import { spawnPiece } from "./movement";
import type { Board, Point, Piece, PieceType } from "./types";

/** Stable string key for a cell, so cell lists compare as unordered sets. */
const keyOf = (c: Point): string => `${c.x},${c.y}`;
const asSet = (cells: readonly Point[]): Set<string> => new Set(cells.map(keyOf));

/** Stamp settled cells of a given type into a fixture board (mutates + returns it). */
const settle = (board: Board, cells: Point[], type: PieceType): Board => {
  for (const { x, y } of cells) board[y][x] = type;
  return board;
};

/** Count of non-null (settled) cells in a board. */
const filled = (board: Board): number =>
  board.reduce((n, row) => n + row.filter((c) => c !== null).length, 0);

describe("lockPiece", () => {
  it("stamps exactly the piece's 4 resolved cells with its type", () => {
    const board = emptyBoard(10, 20);
    const piece: Piece = { type: "T", rotation: 0, position: { x: 4, y: 5 } };
    const merged = lockPiece(board, piece);

    const cells = pieceCells(piece.type, piece.position, piece.rotation);
    for (const { x, y } of cells) expect(merged[y][x]).toBe("T");
    // exactly four cells filled, nothing else touched
    expect(filled(merged)).toBe(4);
    // a cell that is not part of the piece stays empty
    expect(merged[0][0]).toBeNull();
  });

  it("merges on top of already-settled cells without disturbing them", () => {
    const board = settle(emptyBoard(10, 20), [{ x: 0, y: 0 }], "I");
    const piece: Piece = { type: "O", rotation: 0, position: { x: 4, y: 4 } };
    const merged = lockPiece(board, piece);

    expect(merged[0][0]).toBe("I"); // pre-existing cell preserved
    expect(filled(merged)).toBe(1 + 4); // one settled + four from the O
  });

  it("returns a fresh board and never mutates the input", () => {
    const board = emptyBoard(10, 20);
    const snapshot = JSON.stringify(board);
    const piece: Piece = { type: "O", rotation: 0, position: { x: 0, y: 0 } };
    const merged = lockPiece(board, piece);

    expect(merged).not.toBe(board);
    expect(merged[0]).not.toBe(board[0]); // rows are copied, not aliased
    expect(JSON.stringify(board)).toBe(snapshot); // input untouched
  });
});

describe("applyGravity — falling", () => {
  it("moves the piece down one row on an empty board (board ref unchanged)", () => {
    const board = emptyBoard(10, 20);
    const piece = spawnPiece("T", 10); // x=3, y=0
    const result = applyGravity(board, piece);

    expect(result.locked).toBe(false);
    if (!result.locked) {
      expect(result.piece).not.toBe(piece); // fresh fallen piece
      expect(result.piece.position).toEqual({ x: 3, y: 1 });
      expect(result.board).toBe(board); // no merge → same reference
    }
  });

  it("descends one row per successive step", () => {
    const board = emptyBoard(10, 20);
    let piece = spawnPiece("O", 10);
    for (let expectedY = 1; expectedY <= 3; expectedY++) {
      const r = applyGravity(board, piece);
      expect(r.locked).toBe(false);
      if (!r.locked) {
        expect(r.piece.position.y).toBe(expectedY);
        piece = r.piece;
      }
    }
  });
});

describe("applyGravity — landing", () => {
  it("locks a piece resting on the floor: board gains 4 cells, active piece cleared", () => {
    const board = emptyBoard(10, 20);
    // O at y=18 occupies rows 18,19 (19 is the last row) — it can fall no further.
    const piece: Piece = { type: "O", rotation: 0, position: { x: 0, y: 18 } };
    const result = applyGravity(board, piece);

    expect(result.locked).toBe(true);
    expect(result.piece).toBeNull(); // cleared for respawn
    const cells = pieceCells(piece.type, piece.position, piece.rotation);
    for (const { x, y } of cells) expect(result.board[y][x]).toBe("O");
    expect(filled(result.board)).toBe(4);
  });

  it("locks when the settled stack blocks the drop, not just the floor", () => {
    // O at (0,0) occupies cols 0,1 rows 0,1. Settle cells at row 2 directly beneath it so the
    // down-step is blocked well above the floor.
    const board = settle(
      emptyBoard(10, 20),
      [{ x: 0, y: 2 }, { x: 1, y: 2 }],
      "I",
    );
    const piece: Piece = { type: "O", rotation: 0, position: { x: 0, y: 0 } };
    const result = applyGravity(board, piece);

    expect(result.locked).toBe(true);
    expect(result.piece).toBeNull();
    expect(result.board[0][0]).toBe("O");
    expect(result.board[1][0]).toBe("O");
    expect(filled(result.board)).toBe(2 /* settled */ + 4 /* locked O */);
  });

  it("does not mutate the input board on a lock (only the returned copy differs)", () => {
    const board = emptyBoard(10, 20);
    const snapshot = JSON.stringify(board);
    const piece: Piece = { type: "O", rotation: 0, position: { x: 0, y: 18 } };
    const result = applyGravity(board, piece);

    expect(result.locked).toBe(true);
    expect(result.board).not.toBe(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("applyGravity — acceptance drive", () => {
  it("drops a piece to the floor; the landing step locks it (+4 cells) and clears the piece", () => {
    const board = emptyBoard(10, 20);
    let currentBoard: Board = board;
    let piece: Piece | null = spawnPiece("T", 10);

    // Step gravity until the piece locks. Cap iterations (≤ ROWS) so a logic bug fails fast
    // instead of looping forever.
    let result = applyGravity(currentBoard, piece);
    for (let i = 0; i < 20 && !result.locked; i++) {
      currentBoard = result.board;
      piece = result.piece; // narrowed to Piece on the !locked branch
      result = applyGravity(currentBoard, piece);
    }

    // Landed.
    expect(result.locked).toBe(true);
    expect(result.piece).toBeNull(); // active piece cleared for respawn

    // The board gained exactly the piece's 4 cells, colored by its type. `piece` here is the last
    // still-active piece (the one that locked at its resting position).
    expect(piece).not.toBeNull();
    const landed = piece as Piece;
    const cells = pieceCells(landed.type, landed.position, landed.rotation);
    expect(asSet(cells).size).toBe(4);
    for (const { x, y } of cells) expect(result.board[y][x]).toBe("T");
    expect(filled(result.board)).toBe(4);

    // The piece is resting on the floor: its lowest cell is on the last row.
    const maxY = Math.max(...cells.map((c) => c.y));
    expect(maxY).toBe(19);
  });
});
