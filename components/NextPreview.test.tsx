// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import NextPreview from "@/components/NextPreview";
import { cellsFor, BOUNDING_BOX, PIECE_TYPES } from "@/lib/pieces";
import type { PieceType } from "@/lib/types";

afterEach(cleanup);

/** Every filled preview square (those tagged `data-next`), in DOM order. */
function nextSquares(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-next]"));
}

/** The distinct piece ids in DOM order — one per rendered tile (queue order, top-down). */
function tileOrder(container: HTMLElement): PieceType[] {
  const order: PieceType[] = [];
  for (const el of nextSquares(container)) {
    const id = el.dataset.next as PieceType;
    if (order[order.length - 1] !== id) order.push(id);
  }
  return order;
}

describe("NextPreview", () => {
  it("renders a labelled panel for a non-empty queue", () => {
    const { container } = render(<NextPreview queue={["I", "O", "T"]} />);
    expect(container.querySelector('[aria-label="Next"]')).not.toBeNull();
  });

  it("renders one tile per queued piece, each as four filled squares", () => {
    const { container } = render(<NextPreview queue={["I", "O", "T"]} />);
    const squares = nextSquares(container);
    // 3 pieces × 4 cells each.
    expect(squares).toHaveLength(12);
    // Filled squares group into the three queued ids, in queue order.
    expect(tileOrder(container)).toEqual(["I", "O", "T"]);
  });

  it("draws every piece as four squares tagged with its id", () => {
    const { container } = render(<NextPreview queue={[...PIECE_TYPES]} />);
    for (const type of PIECE_TYPES) {
      const own = nextSquares(container).filter((el) => el.dataset.next === type);
      expect(own).toHaveLength(4);
    }
  });

  it("places each tile's filled squares at cellsFor(type, 0) — reuses shape data, not hard-coded coords", () => {
    // One tile per type so each tile is an isolated inner grid.
    const { container } = render(<NextPreview queue={[...PIECE_TYPES]} />);
    const grids = container.querySelectorAll<HTMLElement>(".grid");
    expect(grids).toHaveLength(PIECE_TYPES.length);

    PIECE_TYPES.forEach((type, t) => {
      const box = BOUNDING_BOX[type];
      const cells = grids[t].querySelectorAll<HTMLElement>(":scope > div");
      const got = Array.from(cells)
        .map((el, i) => ({ i, filled: el.dataset.next !== undefined }))
        .filter((c) => c.filled)
        .map((c) => `${c.i % box},${Math.floor(c.i / box)}`)
        .sort();
      const expected = cellsFor(type, 0)
        .map((p) => `${p.x},${p.y}`)
        .sort();
      expect(got).toEqual(expected);
    });
  });

  it("renders the queue top-to-bottom in order", () => {
    const { container } = render(<NextPreview queue={["Z", "S", "I"]} />);
    expect(tileOrder(container)).toEqual(["Z", "S", "I"]);
  });

  it("renders a present but empty panel for an empty queue (defensive, no crash)", () => {
    const { container } = render(<NextPreview queue={[]} />);
    expect(container.querySelector('[aria-label="Next"]')).not.toBeNull();
    expect(nextSquares(container)).toHaveLength(0);
  });

  it("never tags a square with data-cell (reserved for board squares)", () => {
    const { container } = render(<NextPreview queue={["I", "L", "J"]} />);
    expect(container.querySelectorAll("[data-cell]")).toHaveLength(0);
  });
});
