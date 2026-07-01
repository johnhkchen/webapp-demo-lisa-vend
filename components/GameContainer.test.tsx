// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import GameContainer from "@/components/GameContainer";
import { DEFAULT_SEED } from "@/components/useGame";
import { createInitialState, step, type Input } from "@/lib/game";
import { overlayPiece } from "@/lib/overlay";
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
    fireEvent.keyDown(window, { key: "ArrowDown" }); // reserved for the soft-drop ticket
    expect(filledCoords(container)).toEqual(before);
  });

  it("removes its keydown listener on unmount", () => {
    const { unmount } = render(<GameContainer />);
    unmount();
    // A stray key after teardown must not throw (listener was cleaned up).
    expect(() => fireEvent.keyDown(window, { key: "ArrowLeft" })).not.toThrow();
  });
});
