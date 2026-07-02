// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useGame, DEFAULT_SEED } from "@/components/useGame";
import { createInitialState } from "@/lib/game";

afterEach(cleanup);

/**
 * The `reset` seam (T-008-02-01) — the only way to get a fresh game, since the pure core has no
 * "new game" input. It underpins the attract loop's reset-on-top-out and the Start handoff, so it
 * must (a) produce exactly `createInitialState(seed)` and (b) be referentially stable like
 * `dispatch`. These are asserted against the pure core directly — no rules reimplemented here.
 */
describe("useGame — reset", () => {
  it("replaces the game with a fresh createInitialState(seed)", () => {
    const { result } = renderHook(() => useGame(DEFAULT_SEED));

    // Advance the game so its state is clearly non-initial before resetting.
    for (let i = 0; i < 5; i++) act(() => result.current.dispatch("tick"));
    expect(result.current.state.active.position.y).toBeGreaterThan(
      createInitialState(DEFAULT_SEED).active.position.y,
    );

    const NEW_SEED = DEFAULT_SEED + 1;
    act(() => result.current.reset(NEW_SEED));

    // A reset game is value-identical to a fresh core state for the same seed: empty board, first
    // spawn, zeroed score/lines, not over. (The live bag is a fresh instance, so compare fields.)
    const fresh = createInitialState(NEW_SEED);
    expect(result.current.state.board).toEqual(fresh.board);
    expect(result.current.state.active).toEqual(fresh.active);
    expect(result.current.state.score).toBe(0);
    expect(result.current.state.lines).toBe(0);
    expect(result.current.state.gameOver).toBe(false);
    expect(result.current.state.clearedRows).toEqual([]);
  });

  it("keeps a stable identity across renders", () => {
    const { result, rerender } = renderHook(() => useGame(DEFAULT_SEED));
    const first = result.current.reset;
    act(() => result.current.dispatch("tick")); // force a re-render via a state change
    rerender();
    expect(result.current.reset).toBe(first);
  });
});
