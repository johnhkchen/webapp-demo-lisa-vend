// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import Board from "@/components/Board";
import { emptyBoard } from "@/lib/board";
import { COLS, ROWS } from "@/lib/constants";
import type { Board as BoardMatrix, Point } from "@/lib/types";

afterEach(cleanup);

/** All rendered squares, in row-major DOM order. */
function cells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-cell]"));
}

/** Ghost squares → sorted `"x,y,type"`, recovered from the flat row-major order. */
function ghostCoords(container: HTMLElement): string[] {
  return cells(container)
    .map((el, i) => ({ x: i % COLS, y: Math.floor(i / COLS), ghost: el.dataset.ghost }))
    .filter((c) => c.ghost !== undefined)
    .map((c) => `${c.x},${c.y},${c.ghost}`)
    .sort();
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

describe("Board — ghost", () => {
  it("marks exactly the given landing cells with the active piece's hue", () => {
    const board = emptyBoard(COLS, ROWS);
    // A horizontal I landing on the bottom row.
    const ghost: Point[] = [
      { x: 3, y: ROWS - 1 },
      { x: 4, y: ROWS - 1 },
      { x: 5, y: ROWS - 1 },
      { x: 6, y: ROWS - 1 },
    ];

    const { container } = render(<Board board={board} ghost={ghost} ghostType="I" />);

    expect(ghostCoords(container)).toEqual(
      [...ghost].map((p) => `${p.x},${p.y},I`).sort(),
    );
    // Grid is still complete and none of the ghosts became a settled cell.
    expect(cells(container)).toHaveLength(ROWS * COLS);
    expect(cells(container).every((c) => c.dataset.cell === "empty")).toBe(true);
  });

  it("draws ghost squares as translucent empties, distinct from plain empties", () => {
    const board = emptyBoard(COLS, ROWS);
    const ghost: Point[] = [{ x: 2, y: 5 }];

    const { container } = render(<Board board={board} ghost={ghost} ghostType="S" />);
    const rendered = cells(container);

    const ghostCell = rendered.find((c) => c.dataset.ghost === "S");
    expect(ghostCell).toBeDefined();
    expect(ghostCell!.dataset.cell).toBe("empty");
    expect(ghostCell!.className).toContain("bg-piece-s/15");

    // Every other square is a plain empty with no ghost tag and no fill.
    const plain = rendered.filter((c) => c.dataset.ghost === undefined);
    expect(plain).toHaveLength(ROWS * COLS - 1);
    expect(plain.every((c) => !c.className.includes("bg-piece-"))).toBe(true);
  });

  it("suppresses a ghost that lands on a settled cell (settled wins)", () => {
    const board = emptyBoard(COLS, ROWS);
    board[ROWS - 1][4] = "O"; // a settled cell...
    const ghost: Point[] = [{ x: 4, y: ROWS - 1 }]; // ...at the same coordinate as the ghost

    const { container } = render(<Board board={board} ghost={ghost} ghostType="I" />);

    // The occupied square stays solid with no ghost marker.
    const occupied = cells(container)[(ROWS - 1) * COLS + 4];
    expect(occupied.dataset.cell).toBe("O");
    expect(occupied.hasAttribute("data-ghost")).toBe(false);
    // No ghost squares rendered at all — the only ghost coord was suppressed.
    expect(ghostCoords(container)).toEqual([]);
  });

  it("renders no ghost squares when no ghost channel is passed", () => {
    const { container } = render(<Board board={emptyBoard(COLS, ROWS)} />);
    expect(container.querySelectorAll("[data-ghost]")).toHaveLength(0);
  });

  it("draws no ghost when ghostType is null even if cells are supplied", () => {
    const ghost: Point[] = [{ x: 1, y: 1 }];
    const { container } = render(
      <Board board={emptyBoard(COLS, ROWS)} ghost={ghost} ghostType={null} />,
    );
    expect(container.querySelectorAll("[data-ghost]")).toHaveLength(0);
  });
});
