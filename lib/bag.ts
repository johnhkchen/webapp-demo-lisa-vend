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
  next(): TetrominoType;
}

/**
 * Build a seeded 7-bag. Same `seed` ⇒ identical piece sequence. Draws come from the front of the
 * current bag; when the bag is exhausted it is refilled with a fresh shuffled permutation of all
 * seven ids before the next draw.
 */
export function createSevenBag(seed: number): SevenBag {
  const rand = mulberry32(seed);
  let queue: TetrominoType[] = [];
  return {
    next(): TetrominoType {
      if (queue.length === 0) queue = shuffle(TETROMINO_TYPES, rand);
      // Safe: a fresh bag always holds seven ids, so the queue is non-empty here.
      return queue.shift()!;
    },
  };
}
