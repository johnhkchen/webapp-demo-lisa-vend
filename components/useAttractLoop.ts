"use client";

/**
 * `useAttractLoop` — the CPU attract driver: play the game on its own, forever, behind the start
 * overlay (T-008-02-01).
 *
 * It ties the pure move planner (`lib/bot.ts chooseMove`) to the game seam through the shared
 * timing loop (`useAnimationFrameLoop`): once per interval it asks the bot for the current piece's
 * best move and dispatches **one** input toward it, so the demo visibly slides/rotates each piece
 * into place and hard-drops it — then does the same for the next piece, indefinitely. On top-out it
 * re-initializes the game (a fresh seed) and keeps going, so the board is never idle.
 *
 * Why one input per frame, recomputed each frame (not a stored plan): `chooseMove`'s *chosen
 * placement* depends only on the board and the piece type — both unchanged while a piece falls — so
 * it is invariant frame-to-frame; only the emitted relative maneuver (rotate/shift/hardDrop) shrinks
 * as we nudge the piece toward it. Dispatching `chooseMove(state)[0]` every frame therefore converges
 * deterministically and ends on the plan's terminal `hardDrop`, which locks the piece and spawns the
 * next; the following frame replans. No queue to hold or desync — the driver always reads the latest
 * committed `state` (the rAF loop's latest-callback guarantee makes this closure safe).
 *
 * Boundaries:
 *  - `chooseMove` returns `[]` only when nothing is placeable (topped out everywhere reachable). Per
 *    its contract the driver then dispatches `"tick"` to let the game top out through `step`; the
 *    next frame sees `gameOver` and resets. So the loop is self-healing at the reachability boundary,
 *    not stuck.
 *  - Purity/timing stays out of `lib/`: this hook is React glue that imports the pure `chooseMove`;
 *    it reimplements no game rules.
 *  - Reset seed is a deterministic counter (not `Math.random`), so every loop is reproducible while
 *    still varying the game each top-out (a demo shouldn't replay one identical game forever).
 *
 * It takes the game as an injected `{ state, dispatch, reset }` rather than calling `useGame`
 * internally, so a single game holder stays in the container and the game-over/reset branch is
 * unit-testable with a controlled fake.
 */

import { useRef } from "react";

import { chooseMove } from "@/lib/bot";
import type { GameState, Input } from "@/lib/game";
import { useAnimationFrameLoop } from "@/components/useAnimationFrameLoop";
import { ATTRACT_INTERVAL_MS, DEFAULT_SEED } from "@/components/useGame";

/**
 * The slice of the game seam the attract driver needs: the current `state` to plan against, a
 * `dispatch` to feed one input, and a `reset` to re-initialize on top-out. Structurally a subset of
 * `useGame`'s `GameView`, so the container passes it straight through.
 */
export interface AttractGame {
  state: GameState;
  dispatch: (input: Input) => void;
  reset: (seed: number) => void;
}

/**
 * Drive `game` as a self-playing attract demo while `active`. Each `intervalMs` (default
 * `ATTRACT_INTERVAL_MS`): if the game is over, re-initialize with the next counter seed and continue;
 * otherwise dispatch the first input of `chooseMove(state)`, or `"tick"` when there is no legal
 * placement. No-op while `active` is false (the loop does not schedule frames).
 */
export function useAttractLoop(
  game: AttractGame,
  active: boolean,
  intervalMs: number = ATTRACT_INTERVAL_MS,
): void {
  // The seed for the *next* reset. The first game already used DEFAULT_SEED (via useGame), so each
  // top-out advances to DEFAULT_SEED + n — deterministic, but a different game each loop.
  const seedRef = useRef(DEFAULT_SEED);

  useAnimationFrameLoop(
    () => {
      if (game.state.gameOver) {
        seedRef.current += 1;
        game.reset(seedRef.current);
        return;
      }
      const inputs = chooseMove(game.state);
      game.dispatch(inputs.length > 0 ? inputs[0] : "tick");
    },
    intervalMs,
    active,
  );
}
