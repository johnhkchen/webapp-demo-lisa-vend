"use client";

/**
 * `useGame` — the React seam that holds the pure game core and exposes a render-ready view.
 *
 * The core (`lib/game.ts`) is framework-free and can't live in React; this hook is the thin
 * client-side holder for it. It keeps a `GameState` (from `createInitialState`) in component state
 * and derives the composed board — settled cells with the active piece overlaid — via the pure
 * `overlayPiece`. No game rules are reimplemented here: the state comes from the core and the
 * overlay reuses the core's cell accessor.
 *
 * Scope: the hook captures the state setter and exposes a stable `dispatch(input)` that runs the
 * pure core reducer (`step`). Every player intent — move/rotate, soft-drop, and hard-drop — flows
 * through this one `dispatch`; because it is generic over the core `Input`, adding the drop inputs
 * (T-003-03-02) needed no change here. Gravity is driven by a `requestAnimationFrame` loop in the
 * container dispatching `"tick"`; this hook owns only the state + dispatch seam.
 */

import { useCallback, useMemo, useState } from "react";

import type { Board, Point, TetrominoType } from "@/lib/types";
import {
  createInitialState,
  step,
  upcomingPieces,
  type GameState,
  type Input,
} from "@/lib/game";
import { overlayPiece } from "@/lib/overlay";
import { ghostCells } from "@/lib/ghost";

/**
 * A fixed default seed. Deterministic on purpose: a `"use client"` component still server-renders
 * its first HTML, so seeding from a non-stable source (`Date.now()`/`Math.random()`) would spawn a
 * different first piece on server vs. client and trip React hydration. Per-load variety is a
 * later-ticket concern (new-game / loop), which can pass its own `seed`.
 */
export const DEFAULT_SEED = 0x5eed;

/**
 * Gravity cadence in milliseconds: how long the active piece rests before it falls one row under
 * automatic gravity. Consumed by the client island's `requestAnimationFrame` loop
 * (`useAnimationFrameLoop`), which dispatches one `"tick"` per interval. ~800ms is the classic
 * level-1 feel — slow enough to react, fast enough to see descend → lock → spawn within seconds.
 *
 * Lives here in the seam, not in `lib/constants.ts`: timing/feel is deliberately *not* part of the
 * pure core (see `lib/gravity.ts`, which calls lock-delay/timing "a feel/timing concern, not pure
 * logic"). Level-scaled speed-up is a later epic; this is the single fixed rate for now.
 */
export const GRAVITY_INTERVAL_MS = 800;

/**
 * How many upcoming pieces the HUD surfaces in the next-queue preview. Like `DEFAULT_SEED` and
 * `GRAVITY_INTERVAL_MS`, this is UI/feel policy and so lives in the seam, not `lib/constants.ts` —
 * the pure core supports any window (`SevenBag.peek(n)` / `upcomingPieces`); the count of slots we
 * actually show is a rendering decision. Exported so the preview component (T-007-04-02) renders
 * exactly as many slots as are surfaced here — one source of truth, no magic-number drift. Five is
 * the guideline-standard next-piece window.
 */
export const PREVIEW_COUNT = 5;

/**
 * How long, in milliseconds, the row-clear flash plays before the flashed rows are released. Like
 * `GRAVITY_INTERVAL_MS`/`PREVIEW_COUNT`/`DEFAULT_SEED`, this is UI/feel policy and so lives in the
 * seam, not `lib/constants.ts` (the pure core has no notion of animation timing). Consumed by the
 * `useClearFlash` latch in the client island: `state.clearedRows` is a transient one-frame field
 * (see `lib/game.ts`), so the latch holds the flashed rows for this duration regardless of what the
 * player presses next, giving the CSS `.flash` animation its full lifetime.
 *
 * Must equal the globals.css `.flash` `--flash-duration` default (500ms): the CSS owns the visual
 * timing and this owns *when the rows are released*, so keeping them equal releases the rows exactly
 * as the animation ends — one conceptual source of truth, no drift.
 */
export const FLASH_DURATION_MS = 500;

/**
 * What `useGame` returns: the raw core `state`, the render-ready composed `view`, the active
 * piece's `ghost` landing cells (the translucent marker's placement), the `queue` of upcoming
 * piece ids (peeked from the bag — reading it never consumes the stream), the `clearedRows`
 * surfaced for the current frame (see below), and `dispatch` to feed a player/timer `Input` through
 * the core reducer.
 *
 * `clearedRows` is a straight pass-through of `state.clearedRows` — the pre-collapse indices of the
 * rows the last `step` cleared, non-empty only on the clear frame (see `lib/game.ts`). It is surfaced
 * flat here, beside `view`/`ghost`/`queue`, as a render input for the clear animation (T-007-06-02);
 * no derivation, so no memo.
 */
export interface GameView {
  state: GameState;
  view: Board;
  ghost: Point[];
  queue: TetrominoType[];
  clearedRows: number[];
  dispatch: (input: Input) => void;
}

/**
 * Hold a fresh game for `seed` and expose its composed view plus a `dispatch`. The state is
 * created lazily (once), so the bag/spawn run a single time rather than on every render; the view,
 * the ghost landing, and the upcoming-piece queue are memoized on `state`, so all re-derive on
 * every move/rotate (each `dispatch` yields a new `state`) and none reimplements shape/collision
 * math — `overlayPiece`, `ghostCells`, and `upcomingPieces` reuse the pure core (the queue is a
 * non-consuming bag peek). `dispatch` applies the pure `step` reducer via a functional
 * state update, so it needs no `state` dependency and is referentially stable — a consumer can list
 * it in an effect's deps without re-subscribing every render.
 */
export function useGame(seed: number = DEFAULT_SEED): GameView {
  const [state, setState] = useState(() => createInitialState(seed));
  const view = useMemo(() => overlayPiece(state.board, state.active), [state]);
  const ghost = useMemo(() => ghostCells(state.board, state.active), [state]);
  // `state` identity changes on every dispatch, so this re-derives after each input — including
  // the lock/hold steps that advance the bag — keeping the surfaced queue current. `peek` is
  // non-consuming, so surfacing it never desyncs the piece stream.
  const queue = useMemo(() => upcomingPieces(state, PREVIEW_COUNT), [state]);
  const dispatch = useCallback(
    (input: Input) => setState((s) => step(s, input)),
    [],
  );
  return { state, view, ghost, queue, clearedRows: state.clearedRows, dispatch };
}
