// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import GameOverlay from "@/components/GameOverlay";

afterEach(cleanup);

describe("GameOverlay", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(
      <GameOverlay visible={false} score={0} lines={0} />,
    );
    // Hidden ⇒ zero DOM footprint, so normal-play rendering is unaffected.
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("announces the game-over state when visible", () => {
    render(<GameOverlay visible score={0} lines={0} />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeTruthy();
    expect(alert.textContent).toMatch(/game over/i);
  });

  it("shows the final score and lines in the summary", () => {
    render(<GameOverlay visible score={1200} lines={7} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/1200/);
    expect(alert.textContent).toMatch(/7/);
  });
});
