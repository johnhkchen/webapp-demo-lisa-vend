import { describe, expect, it } from "vitest";

import { boardFeatures, evaluate, WEIGHTS } from "./bot-heuristic";
import { emptyBoard } from "./board";
import { COLS, ROWS } from "./constants";
import type { Board } from "./types";

/** A hole-free board with the bottom row completely full (one completed line) and nothing above. */
function flatClearingBoard(): Board {
  const board = emptyBoard(COLS, ROWS);
  for (let x = 0; x < COLS; x++) board[ROWS - 1][x] = "I";
  return board;
}

/** A tall, jagged stack riddled with buried holes and no completed row. The undesirable board. */
function holeyTowerBoard(): Board {
  const board = emptyBoard(COLS, ROWS);
  // Tall filled columns on the left with gaps punched under their tops, leaving col 0 open so no
  // row is ever full — pure penalty: high aggregate height, many holes, high bumpiness.
  for (let x = 1; x < COLS; x++) {
    for (let y = 4; y < ROWS; y++) board[y][x] = "Z";
    // Punch a buried hole two cells below the top of every other column.
    if (x % 2 === 0) board[6][x] = null;
  }
  return board;
}

/** Fill column `x` solid for `k` cells up from the floor. */
function fillColumn(board: Board, x: number, k: number): void {
  for (let i = 0; i < k; i++) board[ROWS - 1 - i][x] = "T";
}

describe("bot-heuristic — acceptance", () => {
  it("a holey, high stack scores strictly worse than a flat, hole-free, line-completing board", () => {
    expect(evaluate(holeyTowerBoard())).toBeLessThan(evaluate(flatClearingBoard()));
  });

  it("is deterministic: same board yields the same score, and the ordering is stable", () => {
    const flat = flatClearingBoard();
    expect(evaluate(flat)).toBe(evaluate(flat));
    // Freshly rebuilt pair (no shared state) preserves the ordering.
    expect(evaluate(holeyTowerBoard())).toBeLessThan(evaluate(flatClearingBoard()));
  });
});

describe("bot-heuristic — boardFeatures per feature", () => {
  it("an empty board has all-zero features and scores 0", () => {
    const f = boardFeatures(emptyBoard(COLS, ROWS));
    expect(f).toEqual({
      aggregateHeight: 0,
      holes: 0,
      bumpiness: 0,
      completedLines: 0,
    });
    expect(evaluate(emptyBoard(COLS, ROWS))).toBe(0);
  });

  it("aggregateHeight sums column heights measured from the floor", () => {
    const board = emptyBoard(COLS, ROWS);
    fillColumn(board, 3, 5);
    expect(boardFeatures(board).aggregateHeight).toBe(5);
  });

  it("counts a buried empty cell as a hole; height is measured from the top cell, not the gap", () => {
    const board = emptyBoard(COLS, ROWS);
    // Column 2: filled at the top of a 3-tall span with a gap under it → 1 hole, height spans gap.
    board[ROWS - 3][2] = "T"; // top
    board[ROWS - 2][2] = null; // the hole
    board[ROWS - 1][2] = "T"; // floor
    const f = boardFeatures(board);
    expect(f.holes).toBe(1);
    expect(f.aggregateHeight).toBe(3); // floor up to the top cell, gap included
  });

  it("bumpiness is the absolute height difference between adjacent columns", () => {
    const board = emptyBoard(COLS, ROWS);
    fillColumn(board, 0, 5);
    fillColumn(board, 1, 2);
    // |5-2| = 3, then |2-0| = 2 for the drop to the empty col 2; rest are 0.
    expect(boardFeatures(board).bumpiness).toBe(3 + 2);
  });

  it("completedLines counts full rows present on the lock-only board", () => {
    const board = emptyBoard(COLS, ROWS);
    for (let x = 0; x < COLS; x++) {
      board[ROWS - 1][x] = "I";
      board[ROWS - 2][x] = "I";
    }
    expect(boardFeatures(board).completedLines).toBe(2);
  });
});

describe("bot-heuristic — evaluate weighting & purity", () => {
  it("adding a buried hole lowers the score", () => {
    const board = emptyBoard(COLS, ROWS);
    fillColumn(board, 4, 3);
    const before = evaluate(board);
    board[ROWS - 2][4] = null; // punch a hole under the column top
    expect(evaluate(board)).toBeLessThan(before);
  });

  it("completing a line raises the score relative to the same stack one cell short", () => {
    const short = emptyBoard(COLS, ROWS);
    for (let x = 0; x < COLS - 1; x++) short[ROWS - 1][x] = "I"; // one cell shy of a full row
    const full = short.map((row) => row.slice());
    full[ROWS - 1][COLS - 1] = "I"; // complete the row
    expect(evaluate(full)).toBeGreaterThan(evaluate(short));
  });

  it("does not mutate the input board", () => {
    const board = holeyTowerBoard();
    const snapshot = board.map((row) => row.slice());
    evaluate(board);
    expect(board).toEqual(snapshot);
  });

  it("WEIGHTS penalizes height/holes/bumpiness and rewards completed lines", () => {
    expect(Object.keys(WEIGHTS).sort()).toEqual(
      ["aggregateHeight", "bumpiness", "completedLines", "holes"].sort(),
    );
    expect(WEIGHTS.completedLines).toBeGreaterThan(0);
    expect(WEIGHTS.aggregateHeight).toBeLessThan(0);
    expect(WEIGHTS.holes).toBeLessThan(0);
    expect(WEIGHTS.bumpiness).toBeLessThan(0);
  });
});
