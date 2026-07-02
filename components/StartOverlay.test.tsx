// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import StartOverlay from "@/components/StartOverlay";

afterEach(cleanup);

describe("StartOverlay", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(<StartOverlay visible={false} />);
    // Hidden ⇒ zero DOM footprint, so a non-attract board is unaffected.
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/press start/i)).toBeNull();
  });

  it("shows a PRESS START prompt when visible", () => {
    render(<StartOverlay visible />);
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/press start/i);
  });

  it("does not intercept input — the demo plays behind it", () => {
    render(<StartOverlay visible />);
    // Non-blocking: `pointer-events-none` means the overlay never captures clicks/keys, so the
    // auto-play (and the future Start handoff wiring) stays live beneath it.
    expect(screen.getByRole("status").className).toMatch(/pointer-events-none/);
  });
});
