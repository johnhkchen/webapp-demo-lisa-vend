// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import GameContainer from "@/components/GameContainer";
import { DEFAULT_SEED } from "@/components/useGame";
import { createInitialState } from "@/lib/game";
import { pieceCells } from "@/lib/collision";
import { COLS, ROWS } from "@/lib/constants";

afterEach(cleanup);

/** All rendered squares, in row-major DOM order. */
function cells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-cell]"));
}

describe("GameContainer", () => {
  it("renders the full ROWS×COLS starting grid", () => {
    const { container } = render(<GameContainer />);
    expect(cells(container)).toHaveLength(ROWS * COLS);
  });

  it("overlays exactly the spawned active piece from the core — not a reimplementation", () => {
    const { container } = render(<GameContainer />);
    const rendered = cells(container);

    // Filled DOM squares → their (x, y, type), recovered from the flat row-major order.
    const filled = rendered
      .map((el, i) => ({ x: i % COLS, y: Math.floor(i / COLS), type: el.dataset.cell }))
      .filter((c) => c.type !== "empty");

    // The single tetromino is the only thing on the starting board.
    expect(filled).toHaveLength(4);

    // Ground truth straight from the core: the spawned piece's cells for DEFAULT_SEED.
    const { active } = createInitialState(DEFAULT_SEED);
    const expected = pieceCells(active.type, active.position, active.rotation)
      .map(({ x, y }) => `${x},${y},${active.type}`)
      .sort();
    const got = filled.map((c) => `${c.x},${c.y},${c.type}`).sort();

    expect(got).toEqual(expected);
  });
});
