// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useState } from "react";

import { useAttractLoop, type AttractGame } from "@/components/useAttractLoop";
import { useGame, DEFAULT_SEED, ATTRACT_INTERVAL_MS } from "@/components/useGame";
import { createInitialState, step, type GameState } from "@/lib/game";
import { chooseMove } from "@/lib/bot";

/**
 * Deterministic rAF pump (same shape as useAnimationFrameLoop.test.ts): capture the pending frame
 * callback and drive it by hand with explicit timestamps, so the attract cadence is exact and the
 * per-frame behaviour is observable step by step — no real timers.
 */
let pending: FrameRequestCallback | null = null;
let nextHandle = 1;
let clock = 0;

function frame(now: number): void {
  const cb = pending;
  pending = null;
  if (cb) cb(now);
}

/**
 * Establish the loop's time baseline (a single frame; `last` is set, nothing fires). The rAF loop
 * keeps a continuous accumulator across frames — it does not re-subscribe on re-render — so this is
 * done once per test, after which each `nextTick()` advances exactly one interval and fires once.
 */
function baseline(): void {
  clock = 0;
  frame(clock);
}

/** Advance one attract interval; fires the loop's callback exactly once. */
function nextTick(): void {
  clock += ATTRACT_INTERVAL_MS;
  frame(clock);
}

beforeEach(() => {
  pending = null;
  nextHandle = 1;
  clock = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    pending = cb;
    return nextHandle++;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    pending = null;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useAttractLoop — advancing bot-chosen state (real useGame seam)", () => {
  it("dispatches exactly the bot's chosen input on the first interval", () => {
    const { result } = renderHook(() => {
      const game = useGame(DEFAULT_SEED);
      useAttractLoop(game, true);
      return game;
    });

    // Independently compute the bot's first move from the same seed.
    const s0 = createInitialState(DEFAULT_SEED);
    const firstInput = chooseMove(s0)[0];
    const expected = step(s0, firstInput);

    act(() => {
      baseline();
      nextTick();
    });

    // The driver dispatched precisely chooseMove(s0)[0] — the piece moved as the bot chose.
    expect(result.current.state.active).toEqual(expected.active);
    expect(result.current.state.board).toEqual(expected.board);
  });

  it("keeps placing pieces frame over frame (a piece locks into the board)", () => {
    const { result } = renderHook(() => {
      const game = useGame(DEFAULT_SEED);
      useAttractLoop(game, true);
      return game;
    });

    const boardEmpty = () =>
      result.current.state.board.every((row) => row.every((c) => c === null));
    expect(boardEmpty()).toBe(true);

    act(() => baseline());
    // A handful of hard-drops' worth of intervals; bounded so a stuck driver can't hang the test.
    for (let i = 0; i < 30 && boardEmpty(); i++) {
      act(() => nextTick());
    }

    // The bot placed at least one piece: the settled board now carries locked cells.
    expect(boardEmpty()).toBe(false);
  });

  it("does nothing while inactive", () => {
    const { result } = renderHook(() => {
      const game = useGame(DEFAULT_SEED);
      useAttractLoop(game, false);
      return game;
    });
    const before = result.current.state;

    // active=false → the loop never schedules a frame; pumping is a no-op.
    expect(pending).toBeNull();
    act(() => {
      baseline();
      nextTick();
    });
    expect(result.current.state).toBe(before);
  });
});

/**
 * The game-over/reset and no-placement branches, isolated with a *controlled* fake game. A real
 * greedy bot survives hundreds of pieces, so a natural top-out is impractical to drive in a unit
 * test; injecting the state exercises exactly the branch the AC names ("until game-over then
 * re-initialize") deterministically and fast.
 */
describe("useAttractLoop — reset & no-placement branches (controlled fake)", () => {
  function fullBoard(width: number, height: number): GameState["board"] {
    return Array.from({ length: height }, () =>
      Array.from({ length: width }, () => "I" as const),
    );
  }

  /**
   * Render the driver over a fake game whose `GameState` the test controls. `dispatch`/`reset` are
   * spies; `dispatch` is a no-op (the branch under test doesn't depend on the resulting state), and
   * the test drives state transitions itself via `setState`.
   */
  function renderControlled(initial: GameState) {
    const dispatch = vi.fn();
    const reset = vi.fn();
    const api: { setState?: (s: GameState) => void } = {};

    const view = renderHook(() => {
      const [state, setState] = useState(initial);
      api.setState = setState;
      const game: AttractGame = { state, dispatch, reset };
      useAttractLoop(game, true);
      return null;
    });

    return { dispatch, reset, setState: (s: GameState) => act(() => api.setState!(s)), ...view };
  }

  it("re-initializes on game-over instead of dispatching a move, then resumes", () => {
    const over: GameState = { ...createInitialState(DEFAULT_SEED), gameOver: true };
    const { dispatch, reset, setState } = renderControlled(over);

    act(() => {
      baseline();
      nextTick();
    });
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledWith(expect.any(Number)); // a fresh seed
    expect(dispatch).not.toHaveBeenCalled();

    // After a reset the game is live again: the driver goes back to feeding bot inputs.
    setState(createInitialState(DEFAULT_SEED));
    act(() => nextTick());
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(expect.any(String));
  });

  it("advances the seed across successive resets (games vary)", () => {
    const over: GameState = { ...createInitialState(DEFAULT_SEED), gameOver: true };
    const { reset } = renderControlled(over);

    act(() => baseline());
    act(() => nextTick());
    act(() => nextTick());

    const seeds = reset.mock.calls.map((c) => c[0] as number);
    expect(seeds).toHaveLength(2);
    expect(seeds[1]).not.toBe(seeds[0]); // deterministic counter, but a different game each loop
  });

  it("dispatches a plain tick when there is no legal placement", () => {
    const base = createInitialState(DEFAULT_SEED);
    const topped: GameState = {
      ...base,
      board: fullBoard(base.board[0].length, base.board.length),
    };
    // Sanity: a completely filled board has no placeable candidate.
    expect(chooseMove(topped)).toEqual([]);

    const { dispatch } = renderControlled(topped);
    act(() => {
      baseline();
      nextTick();
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith("tick");
  });
});
