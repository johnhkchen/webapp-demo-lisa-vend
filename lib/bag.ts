/**
 * Seeded 7-bag piece generator for the Tetris game core (the modern "Random Generator" rule).
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). Deals pieces
 * from a bag holding exactly one of each of the seven tetromino ids; when the bag empties it is
 * refilled and reshuffled. Consequence: no piece repeats until all seven have appeared, so every
 * *aligned* window of seven draws (`[0,7)`, `[7,14)`, …) is a permutation of all seven ids.
 *
 * Reproducible: order is fixed entirely by the seed via `mulberry32` (see `lib/rng.ts`), so two
 * bags built from the same seed emit identical sequences. This module yields `TetrominoType` ids
 * only — turning an id into a spawned `Piece` (position, rotation) is a later ticket.
 *
 * The stream also supports non-consuming lookahead via `peek(n)`: it reveals the next `n` ids
 * without advancing. This is safe because generation and consumption share a single buffer — the
 * only place `rand` is ever advanced is when the buffer is grown, so peeking and then drawing
 * return the very same generated ids (peek cannot desynchronize from `next`).
 */

import type { TetrominoType } from "./types";
import { TETROMINO_TYPES } from "./tetrominoes";
import { mulberry32, type RandomFn } from "./rng";

/**
 * Unbiased Fisher–Yates shuffle. Returns a **new** array (the input, e.g. the shared
 * `TETROMINO_TYPES`, is copied and never mutated). Each position gets a uniform index in
 * `[0, i]` via `Math.floor(rand() * (i + 1))`, which yields uniformly-distributed permutations.
 */
function shuffle(
  items: readonly TetrominoType[],
  rand: RandomFn,
): TetrominoType[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A reproducible stream of tetromino ids. `next()` refills the bag internally when it empties. */
export interface SevenBag {
  /** Draw and consume the next id. Refills (reshuffles) internally when the bag empties. */
  next(): TetrominoType;
  /**
   * Reveal the next `n` ids **without consuming them**: `peek(n)` equals the ids the following
   * `n` `next()` calls will return, and it does not advance the stream (draws after a peek are
   * identical to draws without it). `n <= 0` returns `[]`. Returns a fresh array — the internal
   * buffer is never exposed, so mutating the result cannot corrupt the stream.
   */
  peek(n: number): TetrominoType[];
}

/**
 * Build a seeded 7-bag. Same `seed` ⇒ identical piece sequence. Ids are served from an internal
 * `buffer` of already-generated, not-yet-consumed ids; when more are needed the buffer is grown by
 * appending fresh shuffled permutations of all seven ids. Growing the buffer is the *only* place
 * `rand` is advanced, so `peek` (which grows then reads) and `next` (which grows then removes)
 * always agree.
 */
export function createSevenBag(seed: number): SevenBag {
  const rand = mulberry32(seed);
  const buffer: TetrominoType[] = [];
  // Grow `buffer` until it holds at least `n` ids by appending fresh shuffled bags (7 ids each).
  // The sole consumer of `rand`, so generation order is fixed regardless of peek/next interleaving.
  const ensure = (n: number): void => {
    while (buffer.length < n) buffer.push(...shuffle(TETROMINO_TYPES, rand));
  };
  return {
    next(): TetrominoType {
      ensure(1);
      // Safe: ensure(1) guarantees the buffer holds at least one id.
      return buffer.shift()!;
    },
    peek(n: number): TetrominoType[] {
      if (n <= 0) return [];
      ensure(n);
      return buffer.slice(0, n);
    },
  };
}
