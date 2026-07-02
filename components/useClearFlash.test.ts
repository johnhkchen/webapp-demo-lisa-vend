// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useClearFlash } from "@/components/useClearFlash";

/**
 * `useClearFlash` latches the transient one-frame `clearedRows` (see `lib/game.ts` /
 * T-007-06-01) so the row-clear flash plays its full `durationMs` regardless of what the player
 * presses next. These tests pin the latch lifecycle with fake timers: capture on a clear frame,
 * persistence across the empty resets that follow, timed release, restart-on-reclear, and cleanup.
 */
const DURATION = 500;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useClearFlash", () => {
  it("is idle on a fresh mount with an empty field", () => {
    const { result } = renderHook(() => useClearFlash([], DURATION));
    expect(result.current.rows).toEqual([]);
    expect(result.current.generation).toBe(0);
  });

  it("latches a clear frame's rows and bumps the generation", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useClearFlash(rows, DURATION),
      { initialProps: { rows: [] as number[] } },
    );

    act(() => rerender({ rows: [17, 18] }));
    expect(result.current.rows).toEqual([17, 18]);
    expect(result.current.generation).toBe(1);
  });

  it("holds the flash across the empty resets that follow a clear (latch, not passthrough)", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useClearFlash(rows, DURATION),
      { initialProps: { rows: [] as number[] } },
    );

    act(() => rerender({ rows: [19] })); // clear frame
    // The core resets clearedRows to [] on the very next step — the latch must ignore that.
    act(() => rerender({ rows: [] }));
    expect(result.current.rows).toEqual([19]);

    // ...still held partway through the duration.
    act(() => vi.advanceTimersByTime(DURATION - 1));
    expect(result.current.rows).toEqual([19]);
  });

  it("releases the rows after the full duration", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useClearFlash(rows, DURATION),
      { initialProps: { rows: [] as number[] } },
    );

    act(() => rerender({ rows: [10] }));
    act(() => rerender({ rows: [] }));
    act(() => vi.advanceTimersByTime(DURATION));
    expect(result.current.rows).toEqual([]);
    // Generation is sticky — it marks how many bursts have happened, not the current visibility.
    expect(result.current.generation).toBe(1);
  });

  it("restarts on a second clear before the first flash expires", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useClearFlash(rows, DURATION),
      { initialProps: { rows: [] as number[] } },
    );

    act(() => rerender({ rows: [5] }));
    act(() => rerender({ rows: [] }));
    act(() => vi.advanceTimersByTime(DURATION - 100)); // almost done

    act(() => rerender({ rows: [8, 9] })); // a fresh clear re-arms the latch
    expect(result.current.rows).toEqual([8, 9]);
    expect(result.current.generation).toBe(2); // bumped again → animation restarts

    // The original timer was cancelled: after only the remainder of the *first* window, still held.
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.rows).toEqual([8, 9]);
    // A full fresh window from the second clear releases it.
    act(() => vi.advanceTimersByTime(DURATION));
    expect(result.current.rows).toEqual([]);
  });

  it("clears its pending timer on unmount (no post-teardown setState)", () => {
    const { rerender, unmount } = renderHook(
      ({ rows }) => useClearFlash(rows, DURATION),
      { initialProps: { rows: [] as number[] } },
    );
    act(() => rerender({ rows: [3] }));
    unmount();
    // If the timer leaked it would fire a setState on an unmounted hook here; advancing must be inert.
    expect(() => vi.advanceTimersByTime(DURATION)).not.toThrow();
  });
});
