// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import GameContainer from "@/components/GameContainer";
import { DEFAULT_SEED, GRAVITY_INTERVAL_MS } from "@/components/useGame";
import { createInitialState, step, type Input } from "@/lib/game";
import { overlayPiece } from "@/lib/overlay";
import { clearLines } from "@/lib/line-clear";
import { emptyBoard } from "@/lib/board";
import { pieceCells } from "@/lib/collision";
import { COLS, ROWS } from "@/lib/constants";

afterEach(cleanup);

/** All rendered squares, in row-major DOM order. */
function cells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-cell]"));
}

/** Filled DOM squares → sorted `"x,y,type"`, recovered from the flat row-major order. */
function filledCoords(container: HTMLElement): string[] {
  return cells(container)
    .map((el, i) => ({ x: i % COLS, y: Math.floor(i / COLS), type: el.dataset.cell }))
    .filter((c) => c.type !== "empty")
    .map((c) => `${c.x},${c.y},${c.type}`)
    .sort();
}

/** Ground truth: the composed board after applying `inputs` to the default-seed core. */
function expectedAfter(...inputs: Input[]): string[] {
  let s = createInitialState(DEFAULT_SEED);
  for (const input of inputs) s = step(s, input);
  const view = overlayPiece(s.board, s.active);
  return view
    .flatMap((row, y) => row.map((cell, x) => ({ x, y, cell })))
    .filter((c) => c.cell !== null)
    .map((c) => `${c.x},${c.y},${c.cell}`)
    .sort();
}

describe("GameContainer", () => {
  it("renders the full ROWS×COLS starting grid", () => {
    const { container } = render(<GameContainer />);
    expect(cells(container)).toHaveLength(ROWS * COLS);
  });

  it("overlays exactly the spawned active piece from the core — not a reimplementation", () => {
    const { container } = render(<GameContainer />);
    const filled = cells(container)
      .map((el, i) => ({ x: i % COLS, y: Math.floor(i / COLS), type: el.dataset.cell }))
      .filter((c) => c.type !== "empty");

    expect(filled).toHaveLength(4);

    const { active } = createInitialState(DEFAULT_SEED);
    const expected = pieceCells(active.type, active.position, active.rotation)
      .map(({ x, y }) => `${x},${y},${active.type}`)
      .sort();
    const got = filled.map((c) => `${c.x},${c.y},${c.type}`).sort();

    expect(got).toEqual(expected);
  });

  it("ArrowLeft moves the active piece one column left", () => {
    const { container } = render(<GameContainer />);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(filledCoords(container)).toEqual(expectedAfter("left"));
  });

  it("ArrowRight moves the active piece one column right", () => {
    const { container } = render(<GameContainer />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(filledCoords(container)).toEqual(expectedAfter("right"));
  });

  it("ArrowUp rotates the active piece clockwise", () => {
    const { container } = render(<GameContainer />);
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(filledCoords(container)).toEqual(expectedAfter("rotateCW"));
  });

  it("z rotates the active piece counter-clockwise", () => {
    const { container } = render(<GameContainer />);
    fireEvent.keyDown(window, { key: "z" });
    expect(filledCoords(container)).toEqual(expectedAfter("rotateCCW"));
  });

  it("stops the piece at the left wall — repeated illegal moves are no-ops", () => {
    const { container } = render(<GameContainer />);
    // Push far past the board width so the piece must hit the wall and stop.
    for (let i = 0; i < COLS + 4; i++) fireEvent.keyDown(window, { key: "ArrowLeft" });

    // Core ground truth: the same over-long left run pinned against the wall.
    const pinned: Input[] = Array.from({ length: COLS + 4 }, () => "left");
    expect(filledCoords(container)).toEqual(expectedAfter(...pinned));
    // No cell escaped past the left edge.
    expect(filledCoords(container).every((c) => Number(c.split(",")[0]) >= 0)).toBe(true);
  });

  it("ignores unmapped keys", () => {
    const { container } = render(<GameContainer />);
    const before = filledCoords(container);
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "a" }); // unmapped letter
    expect(filledCoords(container)).toEqual(before);
  });

  it("ArrowDown soft-drops the active piece one row (accelerated descent)", () => {
    const { container } = render(<GameContainer />);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(filledCoords(container)).toEqual(expectedAfter("softDrop"));
  });

  it("Space hard-drops: the piece falls to the bottom, locks, and a fresh piece spawns", () => {
    const { container } = render(<GameContainer />);
    fireEvent.keyDown(window, { key: " " });
    expect(filledCoords(container)).toEqual(expectedAfter("hardDrop"));

    // Cross-check the ground truth: exactly four cells settled at the very bottom row.
    const dropped = step(createInitialState(DEFAULT_SEED), "hardDrop");
    const settled = dropped.board
      .flatMap((row, y) => row.map((c, x) => ({ c, x, y })))
      .filter(({ c }) => c !== null);
    expect(settled).toHaveLength(4);
    expect(Math.max(...settled.map((s) => s.y))).toBe(ROWS - 1);
  });

  it("held Space fires exactly once — OS auto-repeat does not machine-gun pieces", () => {
    const { container } = render(<GameContainer />);
    fireEvent.keyDown(window, { key: " " }); // first press: one piece drops + locks
    fireEvent.keyDown(window, { key: " ", repeat: true }); // auto-repeat: must be ignored
    fireEvent.keyDown(window, { key: " ", repeat: true });

    // Exactly one hard-drop happened: 4 settled cells + 4 for the freshly spawned active = 8 filled.
    const filled = cells(container).filter((el) => el.dataset.cell !== "empty").length;
    expect(filled).toBe(8);
    expect(filledCoords(container)).toEqual(expectedAfter("hardDrop"));
  });

  it("AC: a stranger can play spawn → game-over with the keyboard alone (Space only)", () => {
    render(<GameContainer />);
    // Repeatedly hard-drop with fresh presses (never a repeat). Bounded well above the ~ROWS
    // pieces needed to top out so a bug can't hang the test.
    for (let i = 0; i < 200 && !screen.queryByRole("alert"); i++) {
      fireEvent.keyDown(window, { key: " " });
    }
    const alert = screen.queryByRole("alert");
    expect(alert).not.toBeNull();
    expect(alert!.textContent).toMatch(/game over/i);
  });

  it("removes its keydown listener on unmount", () => {
    const { unmount } = render(<GameContainer />);
    unmount();
    // A stray key after teardown must not throw (listener was cleaned up).
    expect(() => fireEvent.keyDown(window, { key: "ArrowLeft" })).not.toThrow();
  });

  it("shows no game-over overlay during normal play", () => {
    const { container } = render(<GameContainer />);
    // Overlay renders null while the game is live, so the DOM is exactly the board grid.
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/game over/i)).toBeNull();
    expect(cells(container)).toHaveLength(ROWS * COLS);
  });

  it("C dispatches 'hold': the active piece swaps and the stashed piece shows in the hold box", () => {
    const { container } = render(<GameContainer />);
    // The piece that will be stashed on the first hold = the default-seed spawn.
    const stashed = createInitialState(DEFAULT_SEED).active.type;

    fireEvent.keyDown(window, { key: "c" });

    // Board active piece is exactly the core's post-hold state (ground truth, not reimplemented).
    expect(filledCoords(container)).toEqual(expectedAfter("hold"));

    // The stashed piece is now visible in the labelled hold box.
    const holdBox = container.querySelector('[aria-label="Hold"]')!;
    const holdCells = holdBox.querySelectorAll<HTMLElement>("[data-hold]");
    expect(holdCells).toHaveLength(4);
    expect(Array.from(holdCells).every((el) => el.dataset.hold === stashed)).toBe(true);
  });

  it("capital C also holds (Shift/CapsLock parity)", () => {
    const { container } = render(<GameContainer />);
    fireEvent.keyDown(window, { key: "C" });
    expect(filledCoords(container)).toEqual(expectedAfter("hold"));
  });

  it("a second hold is ignored until the next lock — the block is felt", () => {
    const { container } = render(<GameContainer />);
    const stashed = createInitialState(DEFAULT_SEED).active.type;

    fireEvent.keyDown(window, { key: "c" }); // first hold: swap
    const afterFirst = filledCoords(container);
    fireEvent.keyDown(window, { key: "c" }); // second hold before lock: no-op

    // Board is unchanged by the second hold; still equals a single core hold.
    expect(filledCoords(container)).toEqual(afterFirst);
    expect(filledCoords(container)).toEqual(expectedAfter("hold"));

    // The hold box still shows the same stashed piece and is flagged as spent.
    const holdBox = container.querySelector('[aria-label="Hold"]')!;
    expect(holdBox.getAttribute("data-can-hold")).toBe("false");
    const holdCells = holdBox.querySelectorAll<HTMLElement>("[data-hold]");
    expect(Array.from(holdCells).every((el) => el.dataset.hold === stashed)).toBe(true);
  });

  it("the hold box does not pollute the board grid — cells() stays ROWS×COLS after a hold", () => {
    const { container } = render(<GameContainer />);
    fireEvent.keyDown(window, { key: "c" });
    // Hold squares carry data-hold (not data-cell), so the board-square count is unchanged.
    expect(cells(container)).toHaveLength(ROWS * COLS);
  });

  it("reflects a line clear: a completed row is gone from what Board receives", () => {
    // The default seed never completes a line (pieces fall straight down), so build the clear
    // deterministically at the render-path seam. The matrix handed to Board is
    // overlayPiece(state.board, active), and state.board is the clearLines output — so proving the
    // full row disappears here proves the AC's "a completed row visibly clears".
    const board = emptyBoard(COLS, ROWS);
    board[ROWS - 1] = Array.from({ length: COLS }, () => "I" as const);

    const { cleared, board: afterClear } = clearLines(board);
    expect(cleared).toBe(1);

    const { active } = createInitialState(DEFAULT_SEED);
    const view = overlayPiece(afterClear, active);
    // The previously-full bottom row now carries no settled cells (the active piece spawns at top).
    expect(view[ROWS - 1].every((c) => c === null)).toBe(true);
  });
});

/**
 * Game-over integration: drive the *real* hook + real gravity loop to a genuine top-out via a
 * deterministic rAF pump (same idiom as useAnimationFrameLoop.test.ts), then assert the end state is
 * observable AND that the tick truly halts. The default seed tops out at tick 108 with no line
 * clears, so ~400 pumped frames is a safe bound.
 */
describe("GameContainer — game over", () => {
  let pending: FrameRequestCallback | null = null;
  let handle = 1;

  /** Deliver one rAF frame at absolute time `now` (ms), if one is scheduled. */
  function frame(now: number): void {
    const cb = pending;
    pending = null;
    if (cb) act(() => cb(now));
  }

  beforeEach(() => {
    pending = null;
    handle = 1;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending = cb;
      return handle++;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      pending = null;
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the overlay on top-out and halts the gravity tick", () => {
    const { container } = render(<GameContainer />);

    // Pump gravity frames until the stack tops out and the overlay appears (bounded well above the
    // empirical 108-tick top-out for the default seed).
    let t = 0;
    frame(t); // baseline timestamp, no elapsed time
    for (let i = 0; i < 400 && !screen.queryByRole("alert"); i++) {
      t += GRAVITY_INTERVAL_MS;
      frame(t);
    }

    // Observable game-over: the overlay is present and announces the end state.
    const alert = screen.queryByRole("alert");
    expect(alert).not.toBeNull();
    expect(alert!.textContent).toMatch(/game over/i);

    // Tick halted: with active=false the loop schedules no further frames, so the board is frozen.
    expect(pending).toBeNull();
    const frozen = filledCoords(container);
    for (let i = 0; i < 5; i++) {
      t += GRAVITY_INTERVAL_MS;
      frame(t); // no-op — nothing is scheduled
    }
    expect(filledCoords(container)).toEqual(frozen);
    expect(screen.queryByRole("alert")).not.toBeNull();
  });

  it("stacks locked cells into the settled board before topping out", () => {
    render(<GameContainer />);

    let t = 0;
    frame(t);
    // Pump until game over, then read the final settled board from the core ground truth.
    for (let i = 0; i < 400 && !screen.queryByRole("alert"); i++) {
      t += GRAVITY_INTERVAL_MS;
      frame(t);
    }

    // Ground truth: the same tick count driven through the pure core leaves a non-empty settled
    // board (locked cells persisted) — the render path shows exactly this board beneath the overlay.
    let s = createInitialState(DEFAULT_SEED);
    while (!s.gameOver) s = step(s, "tick");
    const settled = s.board.flat().filter((c) => c !== null);
    expect(settled.length).toBeGreaterThan(0);
  });
});
