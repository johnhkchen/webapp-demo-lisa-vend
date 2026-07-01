// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import Board from "@/components/Board";
import { emptyBoard } from "@/lib/board";
import { COLS, ROWS } from "@/lib/constants";
import type { Board as BoardMatrix } from "@/lib/types";

afterEach(cleanup);

/** All rendered squares, in row-major DOM order. */
function cells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-cell]"));
}

describe("Board", () => {
  it("renders one cell per square of an empty ROWS×COLS board, all empty", () => {
    const { container } = render(<Board board={emptyBoard(COLS, ROWS)} />);
    const rendered = cells(container);

    expect(rendered).toHaveLength(ROWS * COLS);
    expect(rendered.every((c) => c.dataset.cell === "empty")).toBe(true);
    // Empty cells carry no per-piece fill.
    expect(rendered.some((c) => c.className.includes("bg-piece-"))).toBe(false);
  });

  it("paints filled cells visually distinct from empty ones", () => {
    const board = emptyBoard(COLS, ROWS);
    // A partial I row on the bottom and a lone T above it.
    board[ROWS - 1][0] = "I";
    board[ROWS - 1][1] = "I";
    board[ROWS - 1][2] = "I";
    board[ROWS - 2][5] = "T";

    const { container } = render(<Board board={board} />);
    const rendered = cells(container);

    const iCells = rendered.filter((c) => c.dataset.cell === "I");
    const tCells = rendered.filter((c) => c.dataset.cell === "T");
    expect(iCells).toHaveLength(3);
    expect(tCells).toHaveLength(1);

    // Filled cells carry their piece's neon fill class; empty cells do not.
    expect(iCells.every((c) => c.className.includes("bg-piece-i"))).toBe(true);
    expect(tCells.every((c) => c.className.includes("bg-piece-t"))).toBe(true);
    const emptyCells = rendered.filter((c) => c.dataset.cell === "empty");
    expect(emptyCells).toHaveLength(ROWS * COLS - 4);
    expect(emptyCells.every((c) => !c.className.includes("bg-piece-"))).toBe(true);
  });

  it("derives grid dimensions from the matrix, not the constants", () => {
    // A non-standard 3-wide × 2-tall fixture.
    const board: BoardMatrix = [
      ["O", null, "L"],
      [null, "Z", null],
    ];
    const { container } = render(<Board board={board} />);

    expect(cells(container)).toHaveLength(6);
    const grid = container.querySelector<HTMLElement>('[aria-label="Tetris board"]');
    expect(grid?.style.gridTemplateColumns).toContain("repeat(3");
    expect(grid?.style.gridTemplateRows).toContain("repeat(2");
  });
});
