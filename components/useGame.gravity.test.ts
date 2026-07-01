// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useGame, DEFAULT_SEED } from "@/components/useGame";
import { createInitialState, step } from "@/lib/game";
import { pieceCells } from "@/lib/collision";

afterEach(cleanup);

/**
 * Gravity via `dispatch("tick")` — the surface the rAF loop drives. These prove the AC at the hook
 * level (descend one row per tick, then lock + spawn) and, crucially, that the hook reimplements no
 * rules: its state tracks a hand-rolled `step(_, "tick")` chain from the same seed exactly.
 */
describe("useGame — gravity tick", () => {
  it("descends the active piece one row per tick", () => {
    const { result } = renderHook(() => useGame(DEFAULT_SEED));
    const startY = result.current.state.active.position.y;

    act(() => result.current.dispatch("tick"));
    expect(result.current.state.active.position.y).toBe(startY + 1);

    act(() => result.current.dispatch("tick"));
    expect(result.current.state.active.position.y).toBe(startY + 2);
  });

  it("tracks the pure core exactly — no rules reimplemented in the hook", () => {
    const { result } = renderHook(() => useGame(DEFAULT_SEED));

    // Independently drive the core the same number of ticks from the same seed.
    let expected = createInitialState(DEFAULT_SEED);
    const TICKS = 5;
    for (let i = 0; i < TICKS; i++) {
      expected = step(expected, "tick");
      act(() => result.current.dispatch("tick"));
    }

    const got = result.current.state;
    expect(got.active).toEqual(expected.active);
    expect(got.board).toEqual(expected.board);
    expect(got.score).toBe(expected.score);
    expect(got.lines).toBe(expected.lines);
  });

  it("locks the piece into the settled board and spawns a fresh one", () => {
    const { result } = renderHook(() => useGame(DEFAULT_SEED));

    // The starting board is empty; drive ticks until the first piece locks (its cells appear in the
    // settled board). Bounded well above the ~20-row fall so a bug can't hang the test.
    const boardEmpty = () =>
      result.current.state.board.every((row) => row.every((c) => c === null));

    let ticks = 0;
    while (boardEmpty() && ticks < 40) {
      act(() => result.current.dispatch("tick"));
      ticks++;
    }

    // The board now carries exactly the locked piece's four cells...
    const settled = result.current.state.board
      .flatMap((row, y) => row.map((c, x) => ({ c, x, y })))
      .filter(({ c }) => c !== null);
    expect(settled).toHaveLength(4);

    // ...and a fresh active piece was spawned back at the top, above the settled stack (its lowest
    // cell sits above the highest settled cell).
    const active = result.current.state.active;
    const activeCells = pieceCells(active.type, active.position, active.rotation);
    const maxActiveY = Math.max(...activeCells.map((c) => c.y));
    const minSettledY = Math.min(...settled.map((s) => s.y));
    expect(maxActiveY).toBeLessThan(minSettledY);
    expect(result.current.state.gameOver).toBe(false);
  });
});
