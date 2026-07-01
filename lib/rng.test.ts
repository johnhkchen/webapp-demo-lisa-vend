import { describe, it, expect } from "vitest";
import { mulberry32, type RandomFn } from "./rng";

/** Collect `n` consecutive draws from a generator. */
const take = (rand: RandomFn, n: number): number[] =>
  Array.from({ length: n }, () => rand());

describe("mulberry32", () => {
  it("is deterministic: the same seed yields a byte-identical stream", () => {
    const a = take(mulberry32(12345), 200);
    const b = take(mulberry32(12345), 200);
    expect(a).toEqual(b);
  });

  it("yields floats in the half-open interval [0, 1)", () => {
    const values = take(mulberry32(999), 1000);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("diverges for different seeds (not a constant/stuck generator)", () => {
    const a = take(mulberry32(1), 100);
    const b = take(mulberry32(2), 100);
    expect(a).not.toEqual(b);
  });

  it("does not return the same value every call (state advances)", () => {
    const values = take(mulberry32(7), 100);
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it("normalizes any number seed to a well-defined stream (0, negative, fractional)", () => {
    // seed >>> 0 coerces these; each is deterministic on its own.
    for (const seed of [0, -1, 3.14, 2 ** 32]) {
      expect(take(mulberry32(seed), 20)).toEqual(take(mulberry32(seed), 20));
    }
  });

  it("gives two independent instances from one seed identical, non-interfering streams", () => {
    const g1 = mulberry32(42);
    const g2 = mulberry32(42);
    // Interleave draws; each instance owns its state, so the two must still agree.
    for (let i = 0; i < 50; i++) {
      expect(g1()).toBe(g2());
    }
  });
});
