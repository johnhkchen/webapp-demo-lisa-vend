import { describe, it, expect } from "vitest";
import { scoreFor, LINE_CLEAR_BASE } from "./scoring";

describe("scoreFor — base tiers", () => {
  it("scores 0 for a no-clear lock", () => {
    expect(scoreFor(0)).toBe(0);
  });

  it("returns the standard single/double/triple/tetris values at level 1", () => {
    const tiers: [number, number][] = [
      [1, 40],
      [2, 100],
      [3, 300],
      [4, 1200],
    ];
    for (const [lines, expected] of tiers) {
      expect(scoreFor(lines)).toBe(expected);
    }
  });
});

describe("scoreFor — level factor", () => {
  it("defaults to a level factor of 1", () => {
    expect(scoreFor(2)).toBe(scoreFor(2, 1));
    expect(scoreFor(2)).toBe(100);
  });

  it("scales linearly with level", () => {
    expect(scoreFor(1, 2)).toBe(80);
    expect(scoreFor(4, 3)).toBe(3600);
    expect(scoreFor(3, 10)).toBe(3000);
  });

  it("yields 0 at level 0 for any tier (proportional, not clamped)", () => {
    for (const lines of [1, 2, 3, 4]) {
      expect(scoreFor(lines, 0)).toBe(0);
    }
  });
});

describe("scoreFor — out-of-range lines", () => {
  it("scores 0 for counts outside 1..4 without leaking NaN", () => {
    for (const lines of [5, -1, 2.5, Number.NaN]) {
      const s = scoreFor(lines);
      expect(s).toBe(0);
      expect(Number.isFinite(s)).toBe(true);
    }
  });
});

describe("LINE_CLEAR_BASE — constant", () => {
  it("is the standard payout table indexed by line count", () => {
    expect(LINE_CLEAR_BASE).toEqual([0, 40, 100, 300, 1200]);
  });
});
