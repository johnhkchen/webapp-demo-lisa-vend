/**
 * Seeded pseudo-random number generator for the RowClear game core.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). The generator
 * is *deterministic*: its entire state is fixed by the integer seed, so two generators built
 * from the same seed emit byte-identical streams. Reproducibility is the whole point — piece
 * order must replay exactly from a seed — so nothing here reads the wall clock or `Math.random`;
 * seeds come from the caller.
 *
 * Algorithm: **mulberry32**, a compact 32-bit generator that seeds from a single integer and
 * yields good-enough distribution for shuffling (far more than a 7-bag needs). Uses only
 * `Math.imul` / `|0` / `>>>`, all ES2017-safe. `lib/bag.ts` consumes this to sequence pieces;
 * it is otherwise a standalone leaf primitive with no `lib/` dependencies.
 */

/** A random source: a thunk yielding a fresh float in the half-open interval `[0, 1)`. */
export type RandomFn = () => number;

/**
 * Build a seeded mulberry32 generator. Same `seed` ⇒ same returned stream, always; different
 * seeds diverge immediately. `seed` is normalized to a uint32 (`>>> 0`), so any number — zero,
 * negative, fractional — is accepted and maps to a well-defined deterministic stream. The
 * returned `RandomFn` closes over its own running state, so independent instances never share
 * or interfere.
 */
export function mulberry32(seed: number): RandomFn {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
