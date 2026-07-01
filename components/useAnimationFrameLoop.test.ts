// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";

import { useAnimationFrameLoop } from "@/components/useAnimationFrameLoop";

/**
 * A deterministic rAF pump: replace `requestAnimationFrame` with a stub that stores the pending
 * frame callback, and drive it by hand with an explicit timestamp. No real timers, so cadence is
 * exact and the accumulator logic is observable step by step.
 */
let pending: FrameRequestCallback | null = null;
let nextHandle = 1;
const canceled = new Set<number>();

/** Deliver one frame at absolute time `now` (ms), if a frame is currently scheduled. */
function frame(now: number): void {
  const cb = pending;
  pending = null;
  if (cb) cb(now);
}

beforeEach(() => {
  pending = null;
  nextHandle = 1;
  canceled.clear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    pending = cb;
    return nextHandle++;
  });
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
    canceled.add(handle);
    pending = null;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useAnimationFrameLoop", () => {
  it("fires once per interval — not before a full interval has elapsed", () => {
    const onTick = vi.fn();
    renderHook(() => useAnimationFrameLoop(onTick, 100));

    frame(0); // establishes the baseline timestamp; no elapsed time yet
    expect(onTick).not.toHaveBeenCalled();

    frame(50); // half an interval
    expect(onTick).not.toHaveBeenCalled();

    frame(100); // now 100ms total → exactly one interval
    expect(onTick).toHaveBeenCalledTimes(1);

    frame(200); // another full interval
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it("drains a backlog when one frame spans several intervals", () => {
    const onTick = vi.fn();
    renderHook(() => useAnimationFrameLoop(onTick, 100));

    frame(0);
    frame(350); // 3.5 intervals in a single frame → 3 whole ticks, 0.5 carried over
    expect(onTick).toHaveBeenCalledTimes(3);

    frame(400); // +50ms → accumulator now 1.0 interval → 1 more
    expect(onTick).toHaveBeenCalledTimes(4);
  });

  it("does not run when inactive", () => {
    const onTick = vi.fn();
    renderHook(() => useAnimationFrameLoop(onTick, 100, false));

    // With active=false the effect returns early and never schedules a frame.
    expect(pending).toBeNull();
    frame(1000);
    expect(onTick).not.toHaveBeenCalled();
  });

  it("always invokes the latest callback identity without re-subscribing", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ cb }) => useAnimationFrameLoop(cb, 100),
      { initialProps: { cb: first } },
    );

    frame(0);
    frame(100);
    expect(first).toHaveBeenCalledTimes(1);

    rerender({ cb: second }); // new identity — loop must pick it up via the ref
    frame(200);
    expect(first).toHaveBeenCalledTimes(1); // stale callback no longer used
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending frame on unmount", () => {
    const onTick = vi.fn();
    const { unmount } = renderHook(() => useAnimationFrameLoop(onTick, 100));

    frame(0);
    unmount();
    expect(canceled.size).toBeGreaterThan(0);

    // Nothing is scheduled anymore, and a late stray frame would be a no-op.
    expect(pending).toBeNull();
    frame(1000);
    expect(onTick).not.toHaveBeenCalled();
  });
});
