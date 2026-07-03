import { describe, expect, it } from "vitest";

import { chooseMove } from "./bot";
import { enumeratePlacements, type PlacementCandidate } from "./bot-placements";
import { boardFeatures, evaluate } from "./bot-heuristic";
import { createInitialState, step, type GameState, type Input } from "./game";
import { spawnPiece } from "./movement";
import { clearLines } from "./line-clear";
import { emptyBoard } from "./board";
import { COLS, ROWS } from "./constants";
import type { Board, PieceType } from "./types";

/**
 * A controllable game state: a fixed settled `board` and a freshly-spawned active piece of `type`
 * (rotation 0, canonical spawn column — mirrors a real spawn). Reuses a real seeded bag from
 * `createInitialState` so `step` has a bag to draw the next piece from when the bot's move locks.
 */
function stateWith(board: Board, type: PieceType): GameState {
  const base = createInitialState(1);
  return { ...base, board, active: spawnPiece(type, COLS) };
}

/** Fold a sequence of inputs through `step`. */
function play(state: GameState, inputs: Input[]): GameState {
  return inputs.reduce(step, state);
}

/** Independent argmax oracle: the highest-`evaluate` candidate, keep-first on ties. */
function expectedBest(board: Board, type: PieceType): PlacementCandidate {
  const candidates = enumeratePlacements(board, type);
  let best = candidates[0];
  let bestScore = evaluate(best.board);
  for (const c of candidates) {
    const score = evaluate(c.board);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

/** Bottom row full except a 2-wide notch at x=4,5, plus a short tower at x=0 — clear top rows. */
function jaggedBoard(): Board {
  const board = emptyBoard(COLS, ROWS);
  for (let x = 0; x < COLS; x++) board[ROWS - 1][x] = "I";
  board[ROWS - 1][4] = null;
  board[ROWS - 1][5] = null;
  board[ROWS - 2][0] = "I";
  board[ROWS - 3][0] = "I";
  return board;
}

const BOT_INPUTS = new Set<Input>(["rotateCW", "rotateCCW", "left", "right", "hardDrop"]);

describe("chooseMove — acceptance: enactment & legality", () => {
  it("folds through step to land the active piece at the highest-heuristic placement", () => {
    const board = jaggedBoard();
    for (const type of ["T", "L", "S", "I", "O", "J", "Z"] as PieceType[]) {
      const inputs = chooseMove(stateWith(board, type));

      // A move always ends by committing the drop, and uses only bot-legal tokens.
      expect(inputs.at(-1)).toBe("hardDrop");
      expect(inputs.every((i) => BOT_INPUTS.has(i))).toBe(true);

      // Folding the sequence through step must reproduce the chosen candidate's board, after the
      // engine's line clear (candidate boards are lock-only, so we clear the expected side to match).
      const final = play(stateWith(board, type), inputs);
      const expected = clearLines(expectedBest(board, type).board).board;
      expect(final.board).toEqual(expected);
    }
  });
});

describe("chooseMove — acceptance: sane choices", () => {
  it("completes a near-complete row (a line clears)", () => {
    // Bottom row full except a single 1-wide well at x=9, only fillable by a vertical I here.
    const board = emptyBoard(COLS, ROWS);
    for (let x = 0; x < COLS - 1; x++) board[ROWS - 1][x] = "I";

    const start = stateWith(board, "I");
    const final = play(start, chooseMove(start));

    expect(final.lines).toBeGreaterThan(start.lines);
    expect(final.lines).toBe(1);
  });

  it("avoids creating a hole when a clean placement exists", () => {
    // A flat floor one row up on the left half; the right half is open floor. Every clean landing
    // on the flat surface adds no hole. The greedy pick must not bury a gap.
    const board = emptyBoard(COLS, ROWS);
    for (let x = 0; x < 6; x++) board[ROWS - 1][x] = "I";

    const type: PieceType = "O";
    const chosen = expectedBest(board, type);

    // Oracle sanity: chosen is genuinely the max over all candidates.
    const scores = enumeratePlacements(board, type).map((c) => evaluate(c.board));
    expect(evaluate(chosen.board)).toBe(Math.max(...scores));

    // The greedy choice introduces no new holes vs. the input board.
    expect(boardFeatures(chosen.board).holes).toBe(boardFeatures(board).holes);

    // And chooseMove actually enacts that no-hole choice.
    const final = play(stateWith(board, type), chooseMove(stateWith(board, type)));
    expect(final.board).toEqual(clearLines(chosen.board).board);
  });
});

describe("chooseMove — determinism & purity", () => {
  it("is deterministic: same state yields the same inputs", () => {
    const state = stateWith(jaggedBoard(), "T");
    expect(chooseMove(state)).toEqual(chooseMove(state));
  });

  it("does not mutate the input state's board or active piece", () => {
    const state = stateWith(jaggedBoard(), "T");
    const boardSnapshot = state.board.map((row) => row.slice());
    const activeSnapshot = { ...state.active, position: { ...state.active.position } };

    chooseMove(state);

    expect(state.board).toEqual(boardSnapshot);
    expect(state.active).toEqual(activeSnapshot);
  });
});

describe("chooseMove — no legal placement", () => {
  it("returns [] when the board is topped out (no candidates)", () => {
    const board = emptyBoard(COLS, ROWS);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) board[y][x] = "Z";
    }
    expect(enumeratePlacements(board, "T")).toHaveLength(0);
    expect(chooseMove(stateWith(board, "T"))).toEqual([]);
  });
});
