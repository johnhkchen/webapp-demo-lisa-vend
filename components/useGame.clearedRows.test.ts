// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useGame, DEFAULT_SEED } from "@/components/useGame";
import { createInitialState, step } from "@/lib/game";

afterEach(cleanup);

/**
 * The cleared-rows surface (T-007-06-01 AC): `useGame` exposes `clearedRows` — the pre-collapse
 * indices of the rows the last step cleared — and it must mirror the pure core exactly (the hook
 * reimplements no rules; it is a straight pass-through of `state.clearedRows`).
 */
describe("useGame — cleared-rows surface", () => {
  it("starts empty on a fresh game", () => {
    const { result } = renderHook(() => useGame(DEFAULT_SEED));
    expect(result.current.clearedRows).toEqual([]);
  });

  it("passes state.clearedRows straight through on every dispatch", () => {
    const { result } = renderHook(() => useGame(DEFAULT_SEED));

    // A lateral move never clears; the surface stays empty and equals the core's field.
    let expected = createInitialState(DEFAULT_SEED);
    act(() => result.current.dispatch("left"));
    expected = step(expected, "left");
    expect(result.current.clearedRows).toEqual(expected.clearedRows);
    // Identity is the same reference the reducer produced (no hook-local copy).
    expect(result.current.clearedRows).toBe(result.current.state.clearedRows);
  });

  it("mirrors the core's clearedRows step-for-step across a varied input sequence", () => {
    // Drive a mix of moves, rotations, and drops through the hook and an independent pure core from
    // the same seed; the surface must equal the core's clearedRows on every frame — and always be
    // the *same reference* the reducer produced, which is what proves the pass-through holds in the
    // populated (clear) case too, not just the empty one. (The clear semantics themselves are
    // covered by lib/game.test.ts, which can construct a full-row board directly.)
    const inputs = [
      "left", "rotateCW", "softDrop", "right", "hardDrop",
      "tick", "left", "hardDrop", "rotateCCW", "hardDrop",
    ] as const;
    const { result } = renderHook(() => useGame(DEFAULT_SEED));
    let core = createInitialState(DEFAULT_SEED);

    for (const input of inputs) {
      act(() => result.current.dispatch(input));
      core = step(core, input);
      expect(result.current.clearedRows).toEqual(core.clearedRows);
      expect(result.current.clearedRows).toBe(result.current.state.clearedRows);
    }
  });
});
