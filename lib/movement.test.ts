import { describe, it, expect } from "vitest";
import { spawnPiece, tryMove, moveLeft, moveRight, softDrop, hardDrop } from "./movement";
import { pieceCells } from "./collision";
import { collides } from "./collision";
import { emptyBoard } from "./board";
import { BOUNDING_BOX } from "./pieces";
import type { Board, Point, Piece, PieceType } from "./types";

/** Stable string key for a cell, so cell lists compare as unordered sets. */
const keyOf = (c: Point): string => `${c.x},${c.y}`;
const asSet = (cells: readonly Point[]): Set<string> => new Set(cells.map(keyOf));

/** Stamp settled cells of a given type into a fixture board (mutates + returns it). */
const settle = (board: Board, cells: Point[], type: PieceType): Board => {
  for (const { x, y } of cells) board[y][x] = type;
  return board;
};

describe("spawnPiece", () => {
  // Canonical SRS spawn columns on a 10-wide board.
  const SPAWN_X: Record<PieceType, number> = {
    I: 3,
    O: 4,
    T: 3,
    S: 3,
    Z: 3,
    J: 3,
    L: 3,
  };

  it.each(Object.keys(SPAWN_X) as PieceType[])(
    "%s spawns centered at rotation 0, y=0",
    (type) => {
      const piece = spawnPiece(type, 10);
      expect(piece).toEqual({
        type,
        rotation: 0,
        position: { x: SPAWN_X[type], y: 0 },
      });
      // sanity: centering equals the bounding-box formula
      expect(piece.position.x).toBe(Math.floor((10 - BOUNDING_BOX[type]) / 2));
    },
  );

  it.each(Object.keys(SPAWN_X) as PieceType[])(
    "%s spawns fully in bounds on a standard board",
    (type) => {
      const board = emptyBoard(10, 20);
      const piece = spawnPiece(type, 10);
      for (const { x, y } of pieceCells(type, piece.position, piece.rotation)) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(10);
      }
      // an empty board never collides with a fresh spawn
      expect(collides(board, type, piece.position, piece.rotation)).toBe(false);
    },
  );

  it("centers on a narrower board", () => {
    // O has box 2 → floor((6 - 2) / 2) = 2
    expect(spawnPiece("O", 6).position.x).toBe(2);
  });
});

describe("tryMove and the moveLeft/moveRight/softDrop wrappers", () => {
  it("legal left/right/down update position and return a fresh piece", () => {
    const board = emptyBoard(10, 20);
    const start = spawnPiece("T", 10); // x=3, y=0

    const right = moveRight(board, start);
    expect(right).not.toBe(start);
    expect(right.position).toEqual({ x: 4, y: 0 });

    const left = moveLeft(board, start);
    expect(left.position).toEqual({ x: 2, y: 0 });

    const down = softDrop(board, start);
    expect(down.position).toEqual({ x: 3, y: 1 });

    // rotation and type carry through untouched
    expect(right.rotation).toBe(start.rotation);
    expect(right.type).toBe(start.type);
  });

  it("blocked move at the LEFT wall is a no-op (same reference)", () => {
    const board = emptyBoard(10, 20);
    // O at x=0 occupies columns 0,1 — a further left move crosses x<0.
    const piece: Piece = { type: "O", rotation: 0, position: { x: 0, y: 0 } };
    const result = moveLeft(board, piece);
    expect(result).toBe(piece);
    expect(result.position).toEqual({ x: 0, y: 0 });
  });

  it("blocked move at the RIGHT wall is a no-op (same reference)", () => {
    const board = emptyBoard(10, 20);
    // O at x=8 occupies columns 8,9 — a further right move crosses x>=width.
    const piece: Piece = { type: "O", rotation: 0, position: { x: 8, y: 0 } };
    const result = moveRight(board, piece);
    expect(result).toBe(piece);
    expect(result.position).toEqual({ x: 8, y: 0 });
  });

  it("blocked soft-drop at the FLOOR is a no-op (same reference)", () => {
    const board = emptyBoard(10, 20);
    // O at y=18 occupies rows 18,19 (19 is the last row) — dropping crosses y>=height.
    const piece: Piece = { type: "O", rotation: 0, position: { x: 0, y: 18 } };
    const result = softDrop(board, piece);
    expect(result).toBe(piece);
    expect(result.position).toEqual({ x: 0, y: 18 });
  });

  it("blocked move into a SETTLED cell is a no-op (same reference)", () => {
    // O at (0,0) occupies cols 0,1 rows 0,1. Settle a cell at (2,0) so moveRight collides.
    const board = settle(emptyBoard(10, 20), [{ x: 2, y: 0 }], "I");
    const piece: Piece = { type: "O", rotation: 0, position: { x: 0, y: 0 } };
    const result = moveRight(board, piece);
    expect(result).toBe(piece);
    expect(result.position).toEqual({ x: 0, y: 0 });
  });

  // --- Acceptance criterion: spawn, then legal moves update and collisions no-op. ---
  it("AC: drives spawn then left/right/down with updates on legal moves and no-op on collision", () => {
    const board = emptyBoard(10, 20);
    let piece = spawnPiece("T", 10); // x=3, y=0
    const spawned = piece;

    // legal: right, right, down
    piece = moveRight(board, piece);
    expect(piece.position).toEqual({ x: 4, y: 0 });
    piece = moveRight(board, piece);
    expect(piece.position).toEqual({ x: 5, y: 0 });
    piece = softDrop(board, piece);
    expect(piece.position).toEqual({ x: 5, y: 1 });
    expect(piece).not.toBe(spawned); // moved: new objects

    // legal: left back to x=4
    piece = moveLeft(board, piece);
    expect(piece.position).toEqual({ x: 4, y: 1 });

    // now block the way: settle a wall of cells directly to the right of the piece.
    // T at (4,1) rot0 occupies (5,1),(4,2),(5,2),(6,2). Put a settled cell at (7,2) so
    // a right move (which would need (6,2)→(7,2)) collides.
    settle(board, [{ x: 7, y: 2 }], "I");
    const before = piece;
    const blocked = moveRight(board, piece);
    expect(blocked).toBe(before); // no-op: unchanged reference
    expect(blocked.position).toEqual({ x: 4, y: 1 });
  });

  it("tryMove composes additively", () => {
    const board = emptyBoard(10, 20);
    let piece = spawnPiece("T", 10); // x=3, y=0
    piece = tryMove(board, piece, 2, 3);
    expect(piece.position).toEqual({ x: 5, y: 3 });
  });

  it("does not mutate the input piece or board on a legal move", () => {
    const board = emptyBoard(10, 20);
    const piece = spawnPiece("T", 10);
    const pieceSnap = JSON.stringify(piece);
    const boardSnap = JSON.stringify(board);
    moveRight(board, piece);
    softDrop(board, piece);
    expect(JSON.stringify(piece)).toBe(pieceSnap);
    expect(JSON.stringify(board)).toBe(boardSnap);
  });

  it("does not mutate the input piece or board on a no-op", () => {
    const board = emptyBoard(10, 20);
    const piece: Piece = { type: "O", rotation: 0, position: { x: 0, y: 0 } };
    const pieceSnap = JSON.stringify(piece);
    const boardSnap = JSON.stringify(board);
    moveLeft(board, piece); // blocked by left wall
    expect(JSON.stringify(piece)).toBe(pieceSnap);
    expect(JSON.stringify(board)).toBe(boardSnap);
  });

  it("uses the shape set correctly (no aliasing of shape tables across moves)", () => {
    const board = emptyBoard(10, 20);
    const a = spawnPiece("S", 10);
    const b = moveRight(board, a);
    // the two pieces occupy the same shape shifted by one column
    const shifted = asSet(
      pieceCells("S", a.position, a.rotation).map((c) => ({ x: c.x + 1, y: c.y })),
    );
    expect(asSet(pieceCells("S", b.position, b.rotation))).toEqual(shifted);
  });
});

describe("hardDrop", () => {
  it("drops a spawned piece to the floor on an empty board", () => {
    const board = emptyBoard(10, 20);
    const piece = spawnPiece("O", 10); // box 2 → occupies two rows
    const dropped = hardDrop(board, piece);
    const maxY = Math.max(
      ...pieceCells(dropped.type, dropped.position, dropped.rotation).map((c) => c.y),
    );
    expect(maxY).toBe(20 - 1); // lowest cell rests on the last row
    // column and rotation are untouched — hard-drop only translates down
    expect(dropped.position.x).toBe(piece.position.x);
    expect(dropped.rotation).toBe(piece.rotation);
  });

  it("rests directly on top of a settled stack", () => {
    // Settle a floor of cells across cols 0,1 at rows 18,19; an O at x=0 must rest above them.
    const board = settle(
      emptyBoard(10, 20),
      [
        { x: 0, y: 18 },
        { x: 1, y: 18 },
        { x: 0, y: 19 },
        { x: 1, y: 19 },
      ],
      "I",
    );
    const piece: Piece = { type: "O", rotation: 0, position: { x: 0, y: 0 } };
    const dropped = hardDrop(board, piece);
    // O occupies rows y,y+1; resting on top of row 18 means y+1 === 17 → y === 16
    expect(dropped.position).toEqual({ x: 0, y: 16 });
  });

  it("is a no-op (same reference) when the piece is already resting", () => {
    const board = emptyBoard(10, 20);
    // O at y=18 already rests on the floor (rows 18,19).
    const piece: Piece = { type: "O", rotation: 0, position: { x: 0, y: 18 } };
    const dropped = hardDrop(board, piece);
    expect(dropped).toBe(piece);
  });

  it("does not mutate the input piece or board", () => {
    const board = emptyBoard(10, 20);
    const piece = spawnPiece("T", 10);
    const pieceSnap = JSON.stringify(piece);
    const boardSnap = JSON.stringify(board);
    hardDrop(board, piece);
    expect(JSON.stringify(piece)).toBe(pieceSnap);
    expect(JSON.stringify(board)).toBe(boardSnap);
  });

  it("agrees with iterated softDrop until it can fall no further", () => {
    const board = emptyBoard(10, 20);
    const piece = spawnPiece("J", 10);
    // Independently drive softDrop to exhaustion; hardDrop must reach the same placement.
    let cur = piece;
    for (let next = softDrop(board, cur); next !== cur; next = softDrop(board, cur)) cur = next;
    expect(hardDrop(board, piece)).toEqual(cur);
  });
});
