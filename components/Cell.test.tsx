// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import Cell from "@/components/Cell";

afterEach(cleanup);

/** The single rendered square. */
function square(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>("[data-cell]");
  if (!el) throw new Error("no cell rendered");
  return el;
}

describe("Cell", () => {
  it("renders an empty square with no fill and no ghost marker", () => {
    const { container } = render(<Cell cell={null} />);
    const el = square(container);

    expect(el.dataset.cell).toBe("empty");
    expect(el.hasAttribute("data-ghost")).toBe(false);
    expect(el.className).not.toContain("bg-piece-");
  });

  it("renders a settled square with the solid per-piece neon fill", () => {
    const { container } = render(<Cell cell="T" />);
    const el = square(container);

    expect(el.dataset.cell).toBe("T");
    expect(el.hasAttribute("data-ghost")).toBe(false);
    // Solid fill — the base token, not a translucent (`/opacity`) variant.
    expect(el.className).toContain("bg-piece-t");
    expect(el.className).not.toContain("bg-piece-t/");
    // Carries the compositor-only motion hook so redraws ease at 60fps (T-007-06-02).
    expect(el.className).toContain("motion");
  });

  it("renders a translucent ghost marker on an empty square", () => {
    const { container } = render(<Cell cell={null} ghost="T" />);
    const el = square(container);

    // Still an empty model cell, additionally tagged as a ghost of that piece.
    expect(el.dataset.cell).toBe("empty");
    expect(el.dataset.ghost).toBe("T");
    // Translucent hue wash + hairline ring in the piece's own token.
    expect(el.className).toContain("bg-piece-t/15");
    expect(el.className).toContain("ring-piece-t/60");
  });

  it("lets a settled cell win over a ghost prop (ghost drawn only on empty squares)", () => {
    const { container } = render(<Cell cell="T" ghost="S" />);
    const el = square(container);

    // The suppression guard: a ghost coordinate over a filled cell never overrides it.
    expect(el.dataset.cell).toBe("T");
    expect(el.hasAttribute("data-ghost")).toBe(false);
    expect(el.className).toContain("bg-piece-t");
    expect(el.className).not.toContain("bg-piece-s");
  });
});
