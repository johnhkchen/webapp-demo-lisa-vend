"use client";

/**
 * The single client island: it wires the `useGame` hook to the props-driven `Board` and routes
 * the keyboard into the pure game core.
 *
 * `page.tsx` stays a server component and renders this; everything stateful lives behind this one
 * `"use client"` boundary. It holds no game rules — it hands the hook's composed view (settled
 * board + active piece overlaid) plus the ghost landing cells (the translucent drop marker,
 * T-007-02-02) to `Board`, and translates keydown events into core `Input`s via `dispatch`. A
 * window-level listener means the player never has to click to focus.
 *
 * Gravity: a `requestAnimationFrame` loop (`useAnimationFrameLoop`) dispatches one `"tick"` per
 * `GRAVITY_INTERVAL_MS`, so the piece descends, locks, and respawns on its own with no input
 * (T-003-02-01). Keyboard scope is move (left/right), rotate (CW/CCW), soft-drop (`ArrowDown`) and
 * hard-drop (Space) — all hanging off the same `dispatch` (T-003-03-02). Soft-drop rides OS key
 * auto-repeat like the move keys (hold = keep dropping, layered on top of gravity); hard-drop is
 * edge-triggered — a held Space must not lock+spawn on every repeat, so `event.repeat` is ignored
 * for it.
 *
 * Game-over (T-003-02-02): the core sets `state.gameOver` when a fresh spawn tops out. We gate the
 * gravity loop on `!gameOver` so the tick actually *halts* (not merely no-ops), and render a
 * `GameOverlay` over the frozen board so the end state is observable. Locked cells and cleared lines
 * need no code here — they already flow through the composed `view`.
 *
 * Hold (T-007-03-02): the `C` key dispatches `"hold"` through the same generic path as every other
 * key, and `state.hold`/`state.canHold` are handed to a side `HoldBox` so the swapped-out piece and
 * the once-per-drop block are visible. Hold needs no auto-repeat guard (unlike hard-drop): a second
 * `"hold"` before the next lock is already a core no-op, so a held key can't machine-gun swaps.
 *
 * Next-queue (T-007-04-02): the hook's `queue` (a non-consuming bag peek, sized by `PREVIEW_COUNT`)
 * is handed to a side `NextPreview` on the right so the upcoming pieces are visible; it re-derives on
 * each spawn like the rest of the view, so the column advances on its own (hold left, next right).
 *
 * Pause (T-007-05-02): the `P` key dispatches `"pause"` (a core toggle of `state.paused`). We gate
 * the gravity loop on `!gameOver && !paused` so descent truly *halts* while paused (the loop stops
 * scheduling frames — not merely no-ops), and render a `mode="paused"` `GameOverlay` over the frozen
 * board so the pause is observable. Resume is clean: re-enabling the loop resets its accumulator, so
 * descent continues from the frozen position with no catch-up burst of banked ticks. Pause is
 * edge-triggered like hard-drop (`event.repeat` guarded) so a held `P` can't flicker the overlay.
 *
 * Row-clear flash (T-007-06-02): the hook's `clearedRows` is a transient one-frame field, so we run
 * it through `useClearFlash`, which latches the cleared rows and holds them for `FLASH_DURATION_MS`
 * regardless of what the player presses next — giving the CSS `.flash` its full lifetime. The
 * resulting `flashRows`/generation are handed to `Board`, which paints the neon row bars as an
 * overlay over the (already-collapsed) board so a clear reads as juice, not a silent redraw.
 *
 * Attract mode (T-008-02-01): on load the game auto-plays itself — the CPU `useAttractLoop` runs the
 * pure `chooseMove` planner behind a non-blocking `StartOverlay` ("PRESS START"), placing pieces,
 * clearing lines, and re-initializing on top-out. The `attract` prop (default `true`) is held in
 * state. While `attract` is on, the human gravity loop and the keyboard are both **gated off** so
 * exactly one driver advances the state (the bot) and stray keys don't fight it. Everything renders
 * from the same `state`, so the demo reuses the exact `Board` path.
 *
 * Start handoff (T-008-02-02): while attracting, any ordinary key press "presses Start" — it flips
 * `attract` off AND `reset`s to a fresh `createInitialState(DEFAULT_SEED)`. The reset is essential:
 * the bot mutates the one shared game holder, so at Start `state` holds the bot's in-progress
 * board/score/active piece; without the reset the human would inherit it. The two batched setState
 * calls land in one render — attract off cancels the driver's rAF frame (so no bot input fires after
 * Start) and enables the human gravity loop + keyboard, while the reset guarantees the first human
 * game starts clean. Browser-shortcut chords (Ctrl/Cmd/Alt held) and lone modifier keys are excluded
 * from "any key" (see `isStartKey`) so we neither hijack Cmd+R nor start on a resting Shift; the
 * start press is consumed and does not double as a game move (the fresh piece begins untouched).
 */

import { useCallback, useEffect, useState } from "react";

import Board from "@/components/Board";
import GameOverlay from "@/components/GameOverlay";
import StartOverlay from "@/components/StartOverlay";
import HoldBox from "@/components/HoldBox";
import NextPreview from "@/components/NextPreview";
import { useGame, GRAVITY_INTERVAL_MS, FLASH_DURATION_MS, DEFAULT_SEED } from "@/components/useGame";
import { useAnimationFrameLoop } from "@/components/useAnimationFrameLoop";
import { useAttractLoop } from "@/components/useAttractLoop";
import { useClearFlash } from "@/components/useClearFlash";
import type { Input } from "@/lib/game";

/**
 * Keyboard → core `Input`. Keys absent here are ignored (browser shortcuts stay live).
 * `ArrowUp`/`x` rotate clockwise, `z` counter-clockwise — the conventional web-Tetris defaults.
 * `ArrowDown` is soft-drop (accelerated descent) and `" "` (Space) is hard-drop (instant drop +
 * lock). `c`/`C` is hold (swap the active piece into the hold slot). Soft-drop and hold are fine to
 * auto-repeat while held (hold's repeat is a core no-op); hard-drop and pause are guarded against
 * auto-repeat in the handler (see `onKeyDown`). `p`/`P` toggles pause.
 */
/**
 * While the attract demo plays, any *ordinary* key press starts the human game ("PRESS START").
 * Excludes browser-shortcut chords (Ctrl/Cmd/Alt held) and lone modifier keys so we neither hijack
 * Cmd+R nor "start" on a resting Shift.
 */
function isStartKey(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return !["Shift", "Control", "Alt", "Meta"].includes(event.key);
}

const KEY_TO_INPUT: Record<string, Input> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "rotateCW",
  x: "rotateCW",
  X: "rotateCW",
  z: "rotateCCW",
  Z: "rotateCCW",
  ArrowDown: "softDrop",
  " ": "hardDrop",
  c: "hold",
  C: "hold",
  p: "pause",
  P: "pause",
};

interface GameContainerProps {
  /**
   * Start in self-playing attract mode (default `true`). The app loads into attract; a test can opt
   * into the human game with `attract={false}`. Held as the initial value of internal state — the
   * seam the Start handoff (T-008-02-02) will flip off.
   */
  attract?: boolean;
}

export default function GameContainer({ attract: initialAttract = true }: GameContainerProps) {
  const { state, view, ghost, queue, clearedRows, dispatch, reset } = useGame();

  // Whether the CPU is auto-playing. Seeded from the prop; the setter is wired to the Start handoff.
  const [attract, setAttract] = useState(initialAttract);

  // Latch the transient one-frame `clearedRows` so the row-clear flash plays its full duration
  // regardless of subsequent input; `flash.rows`/`flash.generation` drive Board's overlay.
  const flash = useClearFlash(clearedRows, FLASH_DURATION_MS);

  // CPU attract driver: while `attract`, plays the game itself (chooseMove per interval) and
  // re-initializes on top-out. Dormant otherwise (schedules no frames), so it never competes with
  // the human gravity loop below — exactly one driver advances the state at a time.
  useAttractLoop({ state, dispatch, reset }, attract);

  // Start handoff: discard the bot's in-progress game for a fresh clean core state, then halt
  // attract. Two batched setState calls → one render: attract off cancels the driver's rAF frame
  // (no bot input after Start) and enables the human gravity loop + keyboard; the reset guarantees
  // the first human game begins from createInitialState (no carried-over board/score/active piece).
  // Stable (depends only on the stable `reset`), so the keyboard effect re-subscribes only when
  // `attract` flips.
  const startHumanGame = useCallback(() => {
    reset(DEFAULT_SEED);
    setAttract(false);
  }, [reset]);

  // Automatic gravity: one core "tick" (descend → lock → clear → spawn) per interval, no input.
  // Gated on !attract && !gameOver && !paused so it is idle while the bot drives, and so topping out
  // and pausing truly stop the loop (the `active` seam) rather than spinning rAF on a no-op `step`.
  // Un-pausing re-enables the loop, which resets its accumulator, so descent resumes from the frozen
  // state with no banked-tick catch-up.
  useAnimationFrameLoop(
    () => dispatch("tick"),
    GRAVITY_INTERVAL_MS,
    !attract && !state.gameOver && !state.paused,
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (attract) {
        // The bot is playing. An ordinary key "presses Start" — hand off to a fresh human game;
        // bare modifiers / browser chords stay swallowed so they don't fight the demo or the browser.
        if (isStartKey(event)) {
          event.preventDefault();
          startHumanGame();
        }
        return;
      }
      const input = KEY_TO_INPUT[event.key];
      if (!input) return; // not ours — leave browser shortcuts and unmapped keys alone
      // Hard-drop and pause are edge-triggered: a held key fires OS auto-repeat. For hard-drop each
      // repeat would drop+lock+spawn another piece (machine-gunning the stack); for pause each repeat
      // would flip the overlay on/off. Consume the key (preventDefault) but drop the repeats.
      // Soft-drop/move/hold keys keep their auto-repeat (hold's repeat is a core no-op).
      if ((input === "hardDrop" || input === "pause") && event.repeat) {
        event.preventDefault();
        return;
      }
      event.preventDefault(); // consumed keys (arrows, space) would otherwise scroll the page
      dispatch(input);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, attract, startHumanGame]);

  return (
    <div className="flex items-start gap-4">
      <HoldBox type={state.hold} canHold={state.canHold} />
      <div className="relative">
        <Board
          board={view}
          ghost={ghost}
          ghostType={state.active.type}
          flashRows={flash.rows}
          flashKey={flash.generation}
        />
        <GameOverlay
          visible={state.gameOver}
          score={state.score}
          lines={state.lines}
        />
        <GameOverlay
          visible={state.paused}
          mode="paused"
          score={state.score}
          lines={state.lines}
        />
        <StartOverlay visible={attract} />
      </div>
      <NextPreview queue={queue} />
    </div>
  );
}
