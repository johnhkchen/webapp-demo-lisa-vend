/**
 * End-to-end determinism harness — the keystone property of the game core (T-002-03-04):
 * *same seed + same input sequence ⇒ identical game outcome, every time.*
 *
 * The whole engine has exactly one entropy source: the integer seed threaded through the
 * 7-bag (`bag.ts` over `mulberry32`). Every other `lib/` op is a pure, copy-on-write function
 * of its inputs. This suite proves that determinism *emerges* at the `step` reducer level,
 * above the already-unit-tested primitives — two independent games from one seed, driven by
 * one scripted input sequence, must converge on the same board, score, and piece stream.
 *
 * One subtlety drives the shape of these tests: `GameState.bag` is a **live closure** (see the
 * purity note in `game.ts`). So (a) whole-state `toEqual` would spuriously fail on the `bag`
 * function reference — we compare a bag-excluding `snapshot` instead; and (b) `step` mutates
 * the bag, so each state is run through the script exactly once (never re-stepped). The bag's
 * position in its stream — the AC's "piece-sequence state" — is probed separately by drawing
 * the next ids from each finished run and comparing.
 */

import { describe, it, expect } from "vitest";
import { createInitialState, step, type GameState, type Input } from "./game";
import type { Board, Piece, TetrominoType } from "./types";

/**
 * The serializable projection of a `GameState` — everything except the live `bag` closure.
 * Tied by hand to `GameState`: if the state grows a field, add it here deliberately so the
 * determinism comparison keeps covering the whole value, not silently miss it.
 */
interface Snapshot {
  board: Board;
  active: Piece;
  score: number;
  lines: number;
  level: number;
  gameOver: boolean;
}

/** Project a `GameState` to its bag-excluding `Snapshot` for exact deep-equality. */
function snapshot(s: GameState): Snapshot {
  const { board, active, score, lines, level, gameOver } = s;
  return { board, active, score, lines, level, gameOver };
}

/** Fold `step` over `script` from a fresh seeded game; returns the final (still-live) state. */
function run(seed: number, script: readonly Input[]): GameState {
  return script.reduce<GameState>((s, input) => step(s, input), createInitialState(seed));
}

/** Snapshot after every step (index 0 = initial state), for pinpointing first divergence. */
function runTrace(seed: number, script: readonly Input[]): Snapshot[] {
  let s = createInitialState(seed);
  const trace: Snapshot[] = [snapshot(s)];
  for (const input of script) {
    s = step(s, input);
    trace.push(snapshot(s));
  }
  return trace;
}

/** Draw the next `n` ids from a run's bag — probes its position in the piece stream. Mutates. */
function drawIds(s: GameState, n: number): TetrominoType[] {
  return Array.from({ length: n }, () => s.bag.next());
}

/** `n` gravity ticks. */
const ticks = (n: number): Input[] => Array<Input>(n).fill("tick");

/**
 * A fixed, eventful script: long tick runs (to lock and respawn many pieces, crossing 7-bag
 * refill boundaries) interleaved with laterals and rotations so movement, rotation, gravity,
 * line-clear, and scoring all sit on the compared path. Only its *identity across runs*
 * matters for the property; the exact content is illustrative.
 */
const SCRIPT: Input[] = [
  "left", "left", ...ticks(22),
  "rotateCW", "right", ...ticks(22),
  "right", "right", ...ticks(22),
  "rotateCCW", "left", ...ticks(22),
  ...ticks(22),
  "rotateCW", ...ticks(22),
  "left", ...ticks(22),
  "right", "right", ...ticks(22),
];

describe("step determinism", () => {
  it("same seed + same script ⇒ deep-equal final board, score, and piece-sequence state", () => {
    const seed = 20260701;
    const a = run(seed, SCRIPT);
    const b = run(seed, SCRIPT);

    // AC: board (deep-equal), score, and the surrounding scalars + active piece all match.
    expect(snapshot(a)).toEqual(snapshot(b));

    // AC: "piece-sequence state" — both bags sit at the same point in the same stream.
    expect(drawIds(a, 14)).toEqual(drawIds(b, 14));

    // Guard: the run must actually be eventful (pieces locked, spawns advanced past a refill),
    // so this can't pass vacuously if a regression short-circuits descent/locking.
    expect(a.board.some((row) => row.some((cell) => cell !== null))).toBe(true);
  });

  it("stays identical at every step, not just at the end", () => {
    const seed = 424242;
    const traceA = runTrace(seed, SCRIPT);
    const traceB = runTrace(seed, SCRIPT);

    expect(traceA).toHaveLength(traceB.length);
    for (let i = 0; i < traceA.length; i++) {
      expect(traceA[i], `divergence at step ${i}`).toEqual(traceB[i]);
    }
  });

  it("diverges for a different seed (equality is not vacuous)", () => {
    const x = run(1, SCRIPT);
    const y = run(2, SCRIPT);
    // Different seeds ⇒ different piece streams from the start, so the games must not agree
    // on their continuing piece sequence.
    expect(drawIds(x, 14)).not.toEqual(drawIds(y, 14));
  });

  it("a lateral input is a pure function of state (no hidden entropy in movement)", () => {
    // Laterals never touch the bag, so re-applying to the same state is safe and must agree.
    const s = createInitialState(7);
    expect(snapshot(step(s, "left"))).toEqual(snapshot(step(s, "left")));
    expect(snapshot(step(s, "rotateCW"))).toEqual(snapshot(step(s, "rotateCW")));
  });
});
