import { describe, it, expect } from "vitest";
import { createInitialState, step, upcomingPieces, type GameState } from "./game";
import { emptyBoard } from "./board";
import { createSevenBag } from "./bag";
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

describe("hold slot (AC)", () => {
  it("first hold on an empty slot stashes the active identity and re-spawns fresh from the bag", () => {
    const s = createInitialState(1);
    const activeType = s.active.type;
    const h = step(s, "hold");

    // The active piece's identity moved into the (previously empty) hold slot.
    expect(s.hold).toBeNull();
    expect(h.hold).toBe(activeType);
    // A fresh piece re-spawned at the top (spawn rotation/row), and the allowance is spent.
    expect(h.active.rotation).toBe(0);
    expect(h.active.position.y).toBe(0);
    expect(h.canHold).toBe(false);
    // The empty-slot path draws from the bag: the new active is the id the bag would deal next.
    expect(h.active.type).toBe(createSevenBag(1).peek(2)[1]);
  });

  it("hold on an occupied slot swaps active↔hold and re-spawns the held piece fresh", () => {
    const base = createInitialState(1);
    // A mid-board L with a T already stashed; the swap must bring T back at spawn, not here.
    const active: Piece = { type: "L", rotation: 2, position: { x: 5, y: 8 } };
    const s: GameState = { ...base, active, hold: "T", canHold: true };

    const h = step(s, "hold");
    expect(h.active.type).toBe("T"); // held piece returns as the new active
    expect(h.active.rotation).toBe(0); // ...fresh, not the stashed orientation
    expect(h.active.position.y).toBe(0);
    expect(h.hold).toBe("L"); // the active identity goes into the slot
    expect(h.canHold).toBe(false);
  });

  it("a swap with an occupied slot does not consume a bag draw", () => {
    // Two sibling games from one seed: swapping on A must not advance A's queue relative to B.
    const a: GameState = { ...createInitialState(1), hold: "T", canHold: true };
    const b: GameState = { ...createInitialState(1), hold: "T", canHold: true };
    const swapped = step(a, "hold");
    expect(swapped.bag.peek(3)).toEqual(b.bag.peek(3));
  });

  it("a second hold before the piece locks is a no-op (same reference)", () => {
    const first = step(createInitialState(1), "hold");
    expect(first.canHold).toBe(false);
    const second = step(first, "hold");
    expect(second).toBe(first); // guarded by `if (!canHold)`, returns the input unchanged
  });

  it("the allowance resets when the piece locks, re-enabling hold", () => {
    const base = createInitialState(1);
    // An O one row above the floor with hold already spent: the next tick locks it.
    const active: Piece = { type: "O", rotation: 0, position: { x: 0, y: ROWS - 2 } };
    const s: GameState = { ...base, active, canHold: false };

    const after = step(s, "tick"); // lock → clear → spawn
    expect(after.canHold).toBe(true);
    // And the reset genuinely re-enables hold (not just a bool nobody reads).
    const held = step(after, "hold");
    expect(held).not.toBe(after);
    expect(held.canHold).toBe(false);
  });

  it("a non-locking tick leaves the hold allowance untouched", () => {
    const s: GameState = { ...createInitialState(1), canHold: false };
    const next = step(s, "tick"); // falls one row, does not lock
    expect(next.active.position.y).toBe(s.active.position.y + 1);
    expect(next.canHold).toBe(false);
  });

  it("hard-drop also resets the allowance (shared lock path, not duplicated)", () => {
    const s: GameState = { ...createInitialState(1), canHold: false };
    const dropped = step(s, "hardDrop");
    expect(dropped.canHold).toBe(true);
  });

  it("is a no-op once game-over is set", () => {
    const ended = tickUntilGameOver({
      ...createInitialState(7),
      board: fillTopCenter(),
      active: { type: "O", rotation: 0, position: { x: 0, y: 17 } },
    });
    expect(ended.gameOver).toBe(true);
    expect(step(ended, "hold")).toBe(ended);
  });

  it("does not mutate the input state's active piece", () => {
    const s = createInitialState(1);
    const activeBefore = s.active;
    step(s, "hold");
    expect(s.active).toBe(activeBefore);
    expect(s.canHold).toBe(true);
    expect(s.hold).toBeNull();
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

describe("pause (AC)", () => {
  const PLAY_INPUTS = [
    "left",
    "right",
    "rotateCW",
    "rotateCCW",
    "softDrop",
    "hardDrop",
    "tick",
    "hold",
  ] as const;

  it("'pause' toggles the flag on, then off", () => {
    const s = createInitialState(1);
    expect(s.paused).toBe(false);
    const paused = step(s, "pause");
    expect(paused.paused).toBe(true);
    expect(step(paused, "pause").paused).toBe(false);
  });

  it("a paused tick is a no-op (same reference, gravity frozen)", () => {
    const paused = step(createInitialState(1), "pause");
    const after = step(paused, "tick");
    expect(after).toBe(paused); // nothing ran: no spread, no descent
    expect(after.active.position.y).toBe(paused.active.position.y);
  });

  it("toggling twice returns an equivalent (deep-equal, fresh) state", () => {
    const s = createInitialState(1);
    const roundTrip = step(step(s, "pause"), "pause");
    expect(roundTrip).toEqual(s); // resumes to an identical state
    expect(roundTrip).not.toBe(s); // ...but each toggle spreads a fresh object
    expect(roundTrip.paused).toBe(false);
  });

  it("gates every play input while paused (each a same-reference no-op)", () => {
    const paused = step(createInitialState(1), "pause");
    for (const input of PLAY_INPUTS) {
      expect(step(paused, input)).toBe(paused);
    }
  });

  it("resumes cleanly: descent continues from the frozen piece", () => {
    const s = createInitialState(1);
    // pause → a paused tick (no-op) → resume → tick: the piece falls exactly one row, as if the
    // pause round-trip never happened.
    let cur = step(s, "pause");
    cur = step(cur, "tick"); // swallowed while paused
    cur = step(cur, "pause"); // resume
    const resumed = step(cur, "tick");
    expect(resumed.active.position.y).toBe(s.active.position.y + 1);
    // The frozen-then-resumed path matches an uninterrupted tick from the start.
    expect(resumed.active).toEqual(step(s, "tick").active);
  });

  it("pausing consumes no bag draw and does not perturb the piece stream", () => {
    const s = createInitialState(1);
    // A sibling game from the same seed that never pauses — their upcoming streams must match.
    const sibling = createInitialState(1);
    expect(step(s, "pause").bag.peek(3)).toEqual(sibling.bag.peek(3));
  });

  it("a paused hold does not spend the once-per-drop allowance", () => {
    const paused = step(createInitialState(1), "pause");
    expect(paused.canHold).toBe(true);
    expect(step(paused, "hold")).toBe(paused); // swallowed
    expect(paused.canHold).toBe(true); // allowance untouched
  });

  it("'pause' is a no-op once game-over is set (a finished game cannot be paused)", () => {
    const ended = tickUntilGameOver({
      ...createInitialState(7),
      board: fillTopCenter(),
      active: { type: "O", rotation: 0, position: { x: 0, y: 17 } },
    });
    expect(ended.gameOver).toBe(true);
    expect(step(ended, "pause")).toBe(ended);
  });
});

describe("upcomingPieces — read-only lookahead surfaced from the live bag", () => {
  const N = 5;

  it("equals the types of the next N spawned pieces (matches subsequent spawns)", () => {
    const s = createInitialState(1);
    const queue = upcomingPieces(s, N);

    // hardDrop locks + spawns in one step, so each drop consumes exactly one bag id = one queue
    // entry. On an empty board these stack at the floor and never top out within N drops.
    const spawned: string[] = [];
    let cur = s;
    for (let i = 0; i < N; i++) {
      cur = step(cur, "hardDrop");
      expect(cur.gameOver).toBe(false);
      spawned.push(cur.active.type);
    }
    expect(spawned).toEqual(queue);
  });

  it("is non-consuming: reading the queue does not advance the stream", () => {
    const s = createInitialState(1);
    const first = upcomingPieces(s, N);
    const second = upcomingPieces(s, N);
    expect(second).toEqual(first);

    // The very next spawn is still queue[0] — peeking twice did not draw anything.
    expect(step(s, "hardDrop").active.type).toBe(first[0]);
  });

  it("returns a fresh array the caller may mutate without corrupting the bag", () => {
    const s = createInitialState(1);
    const q = upcomingPieces(s, N);
    q[0] = "I";
    q.length = 0;
    expect(upcomingPieces(s, N)).not.toEqual(q);
    expect(upcomingPieces(s, N)).toHaveLength(N);
  });

  it("returns [] for n <= 0", () => {
    const s = createInitialState(1);
    expect(upcomingPieces(s, 0)).toEqual([]);
    expect(upcomingPieces(s, -3)).toEqual([]);
  });
});
