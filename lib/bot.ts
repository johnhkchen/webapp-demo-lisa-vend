/**
 * The pure move planner — composes the CPU bot's two evaluator seams into a single choice.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). This is the third
 * and *composing* seam of the pure-bot track (S-008-01): it ties `enumeratePlacements`
 * (`lib/bot-placements.ts`, the candidate generator) and `evaluate` (`lib/bot-heuristic.ts`, the
 * board scorer) into `chooseMove(state)` — score every legal hard-drop of the active piece, take the
 * best, and emit the rotate/shift/hardDrop `Input[]` that enacts it.
 *
 * Shared altitude (the reason these two seams compose directly): `enumeratePlacements` returns
 * **lock-only, pre-collapse** boards (full rows left present, NOT cleared), and `evaluate` counts
 * completed lines off exactly that surface. So candidate `.board` fields are fed **straight into**
 * `evaluate` with no `clearLines` in between — pre-clearing here would erase the completed-lines
 * reward. The two seams were drawn at the same boundary precisely so this pass-through is correct.
 *
 * Coordinate convention (matches `types.ts`): row-major `board[y][x]`, `x` right, `y` down from a
 * top-left origin. A candidate's `column` is the spawn anchor `x` at `y = 0` for its `rotation`.
 *
 * Reachability: a candidate is reached from the active piece by rotating in place at the top (SRS's
 * first kick test is `(0,0)`, so an in-open-space rotation does not shift `x`), then shifting the
 * anchor to the target column, then hard-dropping — which reproduces the candidate's landing exactly
 * because `hardDrop` is deterministic from `(column, rotation)`. This inherits the seam's
 * spawn-column reachability boundary: on a board whose top rows are clear every maneuver is
 * unobstructed; near a top-out stack a lateral shift could be blocked (tuck/slide-under is a later
 * ticket). Determinism: the candidate order is fixed and `evaluate` is deterministic, so the
 * keep-first argmax below makes `chooseMove` fully deterministic.
 *
 * Scope boundary: single-piece greedy argmax. No bag lookahead, no hold, no lock-delay/timing — the
 * planner reads only `state.board` and `state.active` and returns a fresh `Input[]`, mutating
 * nothing.
 */

import type { GameState, Input } from "./game";
import type { RotationState } from "./types";
import { enumeratePlacements, type PlacementCandidate } from "./bot-placements";
import { evaluate } from "./bot-heuristic";

/**
 * The highest-`evaluate` candidate, or `null` when there are none (a topped-out board where every
 * top-of-field spawn collides). Scores candidate `.board` fields directly (lock-only altitude — see
 * the module docstring) and replaces on strict `>`, so on tied scores the earliest candidate in
 * `enumeratePlacements` order (lowest rotation, then column) wins — a stable, deterministic pick.
 */
function bestPlacement(
  candidates: PlacementCandidate[],
): PlacementCandidate | null {
  let best: PlacementCandidate | null = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = evaluate(candidate.board);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

/**
 * The input sequence that moves the active piece from its current `(rotation, x)` to the chosen
 * placement and drops it: `(to.rotation - from.rotation) mod 4` clockwise rotations (in-place at the
 * open top), then `to.column - from.x` lateral shifts, then one `hardDrop`. Rotating before shifting
 * keeps `x` predictable (the rotation happens in open space, so it does not kick sideways); the final
 * `hardDrop` lands exactly on the candidate because `hardDrop` is deterministic from `(column,
 * rotation)`.
 */
function inputsFor(
  from: { rotation: RotationState; x: number },
  to: PlacementCandidate,
): Input[] {
  const inputs: Input[] = [];

  const rotations = (to.rotation - from.rotation) & 3;
  for (let i = 0; i < rotations; i++) inputs.push("rotateCW");

  const dx = to.column - from.x;
  const shift: Input = dx > 0 ? "right" : "left";
  for (let i = 0; i < Math.abs(dx); i++) inputs.push(shift);

  inputs.push("hardDrop");
  return inputs;
}

/**
 * Choose the bot's move for `state`: the `Input[]` that lands the active piece at the
 * highest-heuristic placement. Enumerates every legal hard-drop of `state.active`, scores each with
 * `evaluate`, and returns the rotate/shift/hardDrop sequence enacting the best. Deterministic and
 * pure — reads only `state.board` and `state.active`, mutates nothing.
 *
 * Returns `[]` when there is no legal placement (`enumeratePlacements` empty — the stack reaches the
 * top everywhere reachable, i.e. top-out is imminent): an honest "no move" a driver can follow with
 * a `tick` to let the game top out through `step`.
 */
export function chooseMove(state: GameState): Input[] {
  const candidates = enumeratePlacements(state.board, state.active.type);
  const best = bestPlacement(candidates);
  if (best === null) return [];
  return inputsFor(
    { rotation: state.active.rotation, x: state.active.position.x },
    best,
  );
}
