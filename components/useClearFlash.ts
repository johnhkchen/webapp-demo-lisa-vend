"use client";

/**
 * `useClearFlash` — latch the transient one-frame `clearedRows` field so the row-clear flash plays
 * its full animation, decoupled from player input cadence.
 *
 * The problem: `state.clearedRows` (surfaced verbatim by `useGame`) is non-empty for exactly *one*
 * dispatch — the frame whose lock cleared rows — and the pure core resets it to `[]` on the very
 * next step (see `lib/game.ts`). The next step can arrive far sooner than the flash finishes: a
 * gravity `tick` is up to `GRAVITY_INTERVAL_MS` away, but a player keypress right after a clear
 * (the common case — people keep playing) lands in milliseconds. Rendering the flash straight off
 * `clearedRows` would therefore yank it mid-animation, and two consecutive clears carry equal-but-
 * distinct arrays that would not restart a CSS animation keyed on row index.
 *
 * The fix (a feel/timing concern, so it lives here in the component seam, never in pure `lib/`):
 * when `clearedRows` arrives non-empty, capture those rows and bump a `generation` counter, then arm
 * a timer that releases them after `durationMs`. Empty inputs are ignored — they must NOT cancel an
 * in-flight flash (that is the entire point of the latch). A fresh clear before the timer fires
 * re-captures and bumps `generation` again (the effect re-arms, cancelling the prior timer), so
 * back-to-back clears restart cleanly. `generation` is exposed as a React key for the flash overlay
 * so the CSS `.flash` animation re-triggers on each burst even when the same rows clear twice.
 *
 * Capture happens in render via React's "adjust state while rendering" pattern (comparing the
 * incoming array against the previous one), not in an effect — the reducer hands a new array
 * identity every step, so a mismatch marks a fresh frame. Only the *timer* lives in an effect, and
 * it sets state solely from its async `setTimeout` callback, so no state is set synchronously inside
 * an effect body. `durationMs` should equal the CSS `.flash` duration (`FLASH_DURATION_MS`) so the
 * rows are released exactly as the animation ends.
 */

import { useEffect, useState } from "react";

export interface ClearFlash {
  /** The rows currently flashing (`[]` when idle). */
  rows: number[];
  /** Bumps on each new clear burst — use as a React key to restart the flash animation. */
  generation: number;
}

/**
 * Hold `clearedRows` for `durationMs` after each clear. Detection keys off the identity of the
 * incoming array (the reducer produces a new reference per step — see the T-007-06-01 pass-through
 * test) plus a non-empty length, so a capture fires once per clear frame and the empty resets in
 * between are recorded (as the new "previous") without disturbing the latch.
 */
export function useClearFlash(
  clearedRows: number[],
  durationMs: number,
): ClearFlash {
  const [prev, setPrev] = useState(clearedRows);
  const [rows, setRows] = useState<number[]>([]);
  const [generation, setGeneration] = useState(0);

  // Adjust-state-while-rendering: a new array identity means a fresh frame from the reducer. On a
  // clear frame (non-empty) latch the rows and bump the generation; on the empty resets that follow,
  // only advance `prev` so the latch is left alone. React re-renders immediately with these values
  // and the guard is false next pass, so there is no loop.
  if (clearedRows !== prev) {
    setPrev(clearedRows);
    if (clearedRows.length > 0) {
      setRows(clearedRows);
      setGeneration((g) => g + 1);
    }
  }

  // Release timer, re-armed per burst: each new `generation` cancels the prior timer (cleanup) and
  // schedules a fresh release. State is set only from the async callback, never synchronously in the
  // effect body. Cleanup also fires on unmount, so no timer leaks and no post-teardown setState.
  useEffect(() => {
    if (generation === 0) return; // nothing captured yet
    const id = setTimeout(() => setRows([]), durationMs);
    return () => clearTimeout(id);
  }, [generation, durationMs]);

  return { rows, generation };
}
