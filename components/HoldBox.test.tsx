// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import HoldBox from "@/components/HoldBox";
import { cellsFor, BOUNDING_BOX, PIECE_TYPES } from "@/lib/pieces";

afterEach(cleanup);

/** The held-piece squares (those tagged `data-hold`), in DOM order. */
function holdSquares(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-hold]"));
}

describe("HoldBox", () => {
  it("renders a labelled box with no piece when the slot is empty", () => {
    const { container } = render(<HoldBox type={null} canHold={true} />);
    expect(container.querySelector('[aria-label="Hold"]')).not.toBeNull();
    // An empty slot paints no held squares at all.
    expect(holdSquares(container)).toHaveLength(0);
  });

  it("renders exactly the held piece's four spawn cells", () => {
    const { container } = render(<HoldBox type="T" canHold={true} />);
    const squares = holdSquares(container);
    expect(squares).toHaveLength(4);
    expect(squares.every((el) => el.dataset.hold === "T")).toBe(true);
  });

  it("draws every piece as four filled squares tagged with its id", () => {
    for (const type of PIECE_TYPES) {
      const { container } = render(<HoldBox type={type} canHold={true} />);
      const squares = holdSquares(container);
      expect(squares).toHaveLength(4);
      expect(squares.every((el) => el.dataset.hold === type)).toBe(true);
      cleanup();
    }
  });

  it("places the filled squares at cellsFor(type, 0) — reuses shape data, not hard-coded coords", () => {
    for (const type of PIECE_TYPES) {
      const box = BOUNDING_BOX[type];
      const { container } = render(<HoldBox type={type} canHold={true} />);
      // Recover each held square's grid index from its position among ALL inner-grid squares.
      const grid = container.querySelectorAll<HTMLElement>(".grid > div");
      const got = Array.from(grid)
        .map((el, i) => ({ i, held: el.dataset.hold !== undefined }))
        .filter((c) => c.held)
        .map((c) => `${c.i % box},${Math.floor(c.i / box)}`)
        .sort();
      const expected = cellsFor(type, 0)
        .map((p) => `${p.x},${p.y}`)
        .sort();
      expect(got).toEqual(expected);
      cleanup();
    }
  });

  it("dims and flags the box when a hold is no longer allowed", () => {
    const { container } = render(<HoldBox type="I" canHold={false} />);
    const box = container.querySelector<HTMLElement>('[aria-label="Hold"]')!;
    expect(box.dataset.canHold).toBe("false");
    expect(box.className).toContain("opacity-40");
  });

  it("does not dim the box while a hold is still allowed", () => {
    const { container } = render(<HoldBox type="I" canHold={true} />);
    const box = container.querySelector<HTMLElement>('[aria-label="Hold"]')!;
    expect(box.dataset.canHold).toBe("true");
    expect(box.className).not.toContain("opacity-40");
  });

  it("never tags a square with data-cell (reserved for board squares)", () => {
    const { container } = render(<HoldBox type="L" canHold={true} />);
    expect(container.querySelectorAll("[data-cell]")).toHaveLength(0);
  });
});
