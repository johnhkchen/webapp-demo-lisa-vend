import { describe, it, expect } from "vitest";
import { createInitialState, step, type GameState } from "./game";
import { emptyBoard } from "./board";
import { pieceCells } from "./collision";
import { COLS, ROWS } from "./constants";
import type { Board, Piece } from "./types";

/**
 * Fill the center spawn columns (3..6) of the top two rows so any freshly spawned piece — whose
 * spawn cells always land within cols 3..6 at rows 0..1 — collides. Columns 0..2 and 7..9 are
 * left empty on purpose, so these rows are NOT full and survive `clearLines` (a full row would be
 * cleared away and could never block a spawn).
 */
function fillTopCenter(): Board {
  const board = emptyBoard(COLS, ROWS);
  for (let y = 0; y <= 1; y++) {
    for (let x = 3; x <= 6; x++) board[y][x] = "I";
  }
  return board;
}

/** Fill an entire row except the given hole columns, so plugging the hole completes the line. */
function fillRowExcept(board: Board, y: number, holes: number[]): void {
  for (let x = 0; x < COLS; x++) {
    if (!holes.includes(x)) board[y][x] = "I";
  }
}

/** Drive `tick`s until the game ends (or a safety bound trips). */
function tickUntilGameOver(state: GameState, max = 40): GameState {
  let s = state;
  for (let i = 0; i < max && !s.gameOver; i++) s = step(s, "tick");
  return s;
}

describe("createInitialState", () => {
  it("starts on an empty board with a spawned piece and zeroed scalars", () => {
    const s = createInitialState(1);
    expect(s.board.length).toBe(ROWS);
    expect(s.board[0].length).toBe(COLS);
    expect(s.board.every((row) => row.every((cell) => cell === null))).toBe(true);
    expect(s.active).toBeDefined();
    expect(s.score).toBe(0);
    expect(s.lines).toBe(0);
    expect(s.level).toBe(1);
    expect(s.gameOver).toBe(false);
  });

  it("is deterministic: same seed ⇒ same first piece", () => {
    expect(createInitialState(42).active.type).toBe(createInitialState(42).active.type);
  });
});

describe("lateral inputs move only the active piece", () => {
  it("left / right shift x by ∓1 and leave the board reference untouched", () => {
    const s = createInitialState(1); // spawn x ∈ {3,4}, never at a wall
    const left = step(s, "left");
    expect(left.active.position.x).toBe(s.active.position.x - 1);
    expect(left.board).toBe(s.board);

    const right = step(s, "right");
    expect(right.active.position.x).toBe(s.active.position.x + 1);
  });

  it("a wall-blocked move returns the same active reference (no-op contract)", () => {
    const base = createInitialState(1);
    const active: Piece = { ...base.active, position: { x: 0, y: 0 } };
    const s: GameState = { ...base, active };
    // At x:0 a left move is illegal for every piece; active is returned unchanged.
    expect(step(s, "left").active).toBe(active);
  });

  it("rotateCW / rotateCCW change the rotation state", () => {
    const s = createInitialState(1);
    expect(step(s, "rotateCW").active.rotation).toBe(1);
    expect(step(s, "rotateCCW").active.rotation).toBe(3);
  });
});

describe("descent", () => {
  it("a tick with room falls one row, board reference unchanged, not game-over", () => {
    const s = createInitialState(1);
    const next = step(s, "tick");
    expect(next.active.position.y).toBe(s.active.position.y + 1);
    expect(next.board).toBe(s.board);
    expect(next.gameOver).toBe(false);
  });

  it("locking a piece that completes a row clears it and awards score", () => {
    const base = createInitialState(1);
    const board = emptyBoard(COLS, ROWS);
    // Bottom row is full except cols 0,1; an O dropped into cols 0,1 completes it.
    fillRowExcept(board, ROWS - 1, [0, 1]);
    const active: Piece = { type: "O", rotation: 0, position: { x: 0, y: 17 } };
    let s: GameState = { ...base, board, active };

    s = step(s, "tick"); // fall to y:18
    expect(s.gameOver).toBe(false);
    s = step(s, "tick"); // lock at y:18 → row 19 completes → clears

    expect(s.lines).toBe(1);
    expect(s.score).toBe(40); // scoreFor(1, level 1)
    expect(s.gameOver).toBe(false);
  });
});

describe("hard-drop instantly drops and locks the active piece", () => {
  it("locks the piece into the settled board and spawns a fresh one above the stack", () => {
    const s = createInitialState(1);
    const spawnedType = s.active.type;
    const dropped = step(s, "hardDrop");

    // Exactly the four cells of the dropped piece are now settled.
    const settled = dropped.board
      .flatMap((row, y) => row.map((c, x) => ({ c, x, y })))
      .filter(({ c }) => c !== null);
    expect(settled).toHaveLength(4);
    // They carry the dropped piece's type and sit at the very bottom of the board.
    expect(settled.every((cell) => cell.c === spawnedType)).toBe(true);
    expect(Math.max(...settled.map((cell) => cell.y))).toBe(ROWS - 1);

    // A fresh piece spawned back at the top, above the settled stack.
    const activeCells = pieceCells(
      dropped.active.type,
      dropped.active.position,
      dropped.active.rotation,
    );
    const maxActiveY = Math.max(...activeCells.map((c) => c.y));
    const minSettledY = Math.min(...settled.map((cell) => cell.y));
    expect(maxActiveY).toBeLessThan(minSettledY);
    expect(dropped.gameOver).toBe(false);
  });

  it("reaches the same state as ticking until the piece locks (shortcut, not a divergent path)", () => {
    // Two independent games from the same seed — the 7-bag is a shared mutable object, so the
    // hard-drop and tick paths must NOT share one `GameState` (they'd drain the same bag).
    const settledCount = (state: GameState) =>
      state.board.flat().filter((c) => c !== null).length;

    // Ground truth: tick until the first piece locks (settled-cell count goes 0 → 4).
    let ticked = createInitialState(1);
    for (let i = 0; i < 40 && settledCount(ticked) === 0; i++) ticked = step(ticked, "tick");

    const dropped = step(createInitialState(1), "hardDrop");
    expect(dropped.board).toEqual(ticked.board);
    expect(dropped.score).toBe(ticked.score);
    expect(dropped.lines).toBe(ticked.lines);
    expect(dropped.active).toEqual(ticked.active);
  });

  it("clears a row it completes on landing and awards the line score", () => {
    const base = createInitialState(1);
    const board = emptyBoard(COLS, ROWS);
    // Bottom row full except cols 0,1; an O hard-dropped into cols 0,1 completes it.
    fillRowExcept(board, ROWS - 1, [0, 1]);
    const active: Piece = { type: "O", rotation: 0, position: { x: 0, y: 0 } };
    const s: GameState = { ...base, board, active };

    const dropped = step(s, "hardDrop");
    expect(dropped.lines).toBe(1);
    expect(dropped.score).toBe(40); // scoreFor(1, level 1)
    expect(dropped.gameOver).toBe(false);
  });

  it("is a no-op once game-over is set", () => {
    const ended = tickUntilGameOver({
      ...createInitialState(7),
      board: fillTopCenter(),
      active: { type: "O", rotation: 0, position: { x: 0, y: 17 } },
    });
    expect(ended.gameOver).toBe(true);
    expect(step(ended, "hardDrop")).toBe(ended);
  });
});

describe("game-over on spawn into an occupied top row (AC)", () => {
  it("tops out when the next spawn collides with the settled stack", () => {
    const base = createInitialState(7);
    const board = fillTopCenter();
    // Active O in the empty left columns: it locks after two ticks without touching the
    // filled center, then the reducer spawns the next piece into the occupied top → top-out.
    const active: Piece = { type: "O", rotation: 0, position: { x: 0, y: 17 } };
    const start: GameState = { ...base, board, active };

    const ended = tickUntilGameOver(start);

    expect(ended.gameOver).toBe(true);
    // The pre-filled center rows were never full, so they were not cleared away.
    expect(ended.board[0][3]).toBe("I");
    expect(ended.board[1][6]).toBe("I");
    expect(ended.lines).toBe(0);
  });

  it("once game-over is set, further input is a no-op", () => {
    const ended = tickUntilGameOver({
      ...createInitialState(7),
      board: fillTopCenter(),
      active: { type: "O", rotation: 0, position: { x: 0, y: 17 } },
    });
    expect(ended.gameOver).toBe(true);
    expect(step(ended, "left")).toBe(ended);
    expect(step(ended, "tick")).toBe(ended);
  });
});
