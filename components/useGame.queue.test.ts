// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useGame, DEFAULT_SEED, PREVIEW_COUNT } from "@/components/useGame";
import { createInitialState, step, upcomingPieces } from "@/lib/game";

afterEach(cleanup);

/**
 * The next-queue surface (T-007-04-01 AC): `useGame` exposes `queue` — the next `PREVIEW_COUNT`
 * upcoming piece ids, sourced from the bag's non-consuming `peek` — and that queue must match
 * the pieces the game actually spawns next. As with the gravity suite, these also prove the hook
 * reimplements no rules: its queue tracks the pure core (`upcomingPieces`) exactly.
 */
describe("useGame — upcoming-piece queue", () => {
  it("exposes a queue of PREVIEW_COUNT ids from the seeded bag", () => {
    const { result } = renderHook(() => useGame(DEFAULT_SEED));
    expect(result.current.queue).toHaveLength(PREVIEW_COUNT);
    // Same seed ⇒ same surfaced queue as an independently-built core (no hook-local rules).
    expect(result.current.queue).toEqual(
      upcomingPieces(createInitialState(DEFAULT_SEED), PREVIEW_COUNT),
    );
  });

  it("predicts the spawn order: each hard-drop spawns the next queued id", () => {
    const { result } = renderHook(() => useGame(DEFAULT_SEED));
    const queue = [...result.current.queue];

    // hardDrop locks + spawns in one step; on an empty board PREVIEW_COUNT drops stack at the
    // floor and never top out, so the spawn sequence runs uninterrupted.
    for (let i = 0; i < PREVIEW_COUNT; i++) {
      act(() => result.current.dispatch("hardDrop"));
      expect(result.current.state.gameOver).toBe(false);
      expect(result.current.state.active.type).toBe(queue[i]);
    }
  });

  it("tracks the pure core exactly — no rules reimplemented in the hook", () => {
    const { result } = renderHook(() => useGame(DEFAULT_SEED));

    let expected = createInitialState(DEFAULT_SEED);
    for (let i = 0; i < PREVIEW_COUNT; i++) {
      expected = step(expected, "hardDrop");
      act(() => result.current.dispatch("hardDrop"));
      // The queue after each drop still matches the core's remaining lookahead.
      expect(result.current.queue).toEqual(upcomingPieces(expected, PREVIEW_COUNT));
    }
  });
});
