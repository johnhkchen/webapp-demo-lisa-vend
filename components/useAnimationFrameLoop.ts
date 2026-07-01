"use client";

/**
 * `useAnimationFrameLoop` — fire a callback once per fixed interval, driven by `requestAnimationFrame`.
 *
 * A game-agnostic timing seam: it knows nothing about Tetris, taking only a `() => void`. That is
 * what keeps it unit-testable in isolation and reusable (a later pause gate, hard-drop repeat, or
 * sub-row animation can all hang off the same loop). The game seam (`useGame`) supplies the callback
 * and the interval; this hook owns only *when* to call it.
 *
 * Cadence, not frame rate: rAF fires ~60×/s, but gravity should step once per `intervalMs`. Each
 * frame adds the elapsed time (from the rAF callback's own `DOMHighResTimeStamp` — no `Date.now()`)
 * to an accumulator; `onTick` fires once per whole `intervalMs` drained from it. A `while` (not
 * `if`) drains a backlog, so a long/janky frame still advances the right number of steps and gravity
 * stays wall-clock-accurate rather than losing time.
 *
 * Latest-callback guarantee: `onTick` is read through a ref refreshed every render, so the newest
 * callback is always the one invoked, yet the rAF subscription re-subscribes only when
 * `intervalMs`/`active` change — never merely because `onTick` got a new identity each render. The
 * pending frame is cancelled on unmount / dependency change, so no loop leaks and no callback runs
 * after teardown.
 */

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Invoke `onTick` about once per `intervalMs` of elapsed time while mounted and `active`.
 *
 * @param onTick    Side-effecting callback (e.g. dispatch one gravity tick). Latest identity wins.
 * @param intervalMs Milliseconds of wall-clock time per `onTick` call.
 * @param active    When false, the loop does not run (defaults to true). A seam for pause/game-over.
 */
export function useAnimationFrameLoop(
  onTick: () => void,
  intervalMs: number,
  active: boolean = true,
): void {
  const onTickRef = useRef(onTick);
  // Sync the latest callback after each commit (a layout effect, so it lands before the next
  // frame fires) — not during render, which React forbids for refs.
  useLayoutEffect(() => {
    onTickRef.current = onTick;
  });

  useEffect(() => {
    if (!active) return;

    let raf = 0;
    let last: number | null = null;
    let acc = 0;

    const frame = (now: number) => {
      if (last !== null) {
        acc += now - last;
        while (acc >= intervalMs) {
          acc -= intervalMs;
          onTickRef.current();
        }
      }
      last = now;
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [intervalMs, active]);
}
