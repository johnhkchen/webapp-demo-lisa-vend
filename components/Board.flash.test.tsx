// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import Board from "@/components/Board";
import { emptyBoard } from "@/lib/board";
import { COLS, ROWS } from "@/lib/constants";

afterEach(cleanup);

/** The flash overlay bars, in DOM order. */
function flashBars(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-flash-row]"));
}

/**
 * The flash channel (T-007-06-02 AC): Board paints a full-row `.flash` bar per cleared-row index as
 * an advisory overlay, without polluting the `[data-cell]` grid it already renders.
 */
describe("Board — flash channel", () => {
  it("renders one flash bar per cleared-row index, on the right rows", () => {
    const { container } = render(
      <Board board={emptyBoard(COLS, ROWS)} flashRows={[3, 18]} flashKey={1} />,
    );
    const bars = flashBars(container);

    expect(bars).toHaveLength(2);
    expect(bars.map((b) => b.dataset.flashRow)).toEqual(["3", "18"]);
    // Each bar carries the shared flash animation utility and spans its grid row (1-indexed).
    expect(bars.every((b) => b.className.includes("flash"))).toBe(true);
    expect(bars[0].style.gridRow).toBe("4");
    expect(bars[1].style.gridRow).toBe("19");
  });

  it("does not pollute the board grid — [data-cell] stays ROWS×COLS and bars carry no cell tag", () => {
    const { container } = render(
      <Board board={emptyBoard(COLS, ROWS)} flashRows={[0, 1, 2]} flashKey={1} />,
    );
    // The flash bars are outside the cell node set.
    expect(container.querySelectorAll("[data-cell]")).toHaveLength(ROWS * COLS);
    expect(
      flashBars(container).every(
        (b) => !b.hasAttribute("data-cell") && !b.hasAttribute("data-ghost"),
      ),
    ).toBe(true);
  });

  it("renders no overlay when there are no cleared rows", () => {
    const { container } = render(<Board board={emptyBoard(COLS, ROWS)} />);
    expect(flashBars(container)).toHaveLength(0);
    // And with an explicit empty list.
    cleanup();
    const { container: c2 } = render(
      <Board board={emptyBoard(COLS, ROWS)} flashRows={[]} flashKey={0} />,
    );
    expect(flashBars(c2)).toHaveLength(0);
  });

  it("still renders the full board grid alongside the flash overlay", () => {
    const { container } = render(
      <Board board={emptyBoard(COLS, ROWS)} flashRows={[5]} flashKey={1} />,
    );
    expect(container.querySelector('[aria-label="Tetris board"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-cell]")).toHaveLength(ROWS * COLS);
    expect(flashBars(container)).toHaveLength(1);
  });
});
