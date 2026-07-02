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

  it("defaults to the game-over variant when no mode is given", () => {
    render(<GameOverlay visible score={0} lines={0} />);
    // Absent `mode` ⇒ game-over: assertive alert + GAME OVER, never the pause banner.
    expect(screen.getByRole("alert").textContent).toMatch(/game over/i);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders the paused variant as a polite status banner with a resume hint", () => {
    render(<GameOverlay visible mode="paused" score={0} lines={0} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/paused/i);
    expect(status.textContent).toMatch(/press p to resume/i);
    // Pause is not the terminal end state — it must not surface as an assertive alert.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders nothing when the paused variant is hidden", () => {
    const { container } = render(
      <GameOverlay visible={false} mode="paused" score={0} lines={0} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
