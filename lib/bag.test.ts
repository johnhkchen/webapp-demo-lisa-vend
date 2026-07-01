import { describe, it, expect } from "vitest";
import { createSevenBag, type SevenBag } from "./bag";
import { TETROMINO_TYPES } from "./tetrominoes";
import type { TetrominoType } from "./types";

/** Draw `n` ids from a bag. */
const drawN = (bag: SevenBag, n: number): TetrominoType[] =>
  Array.from({ length: n }, () => bag.next());

/** Split an array into consecutive chunks of `size` (drops a trailing partial chunk). */
const chunk = <T>(arr: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i + size <= arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const ALL_IDS = [...TETROMINO_TYPES].sort();

describe("createSevenBag", () => {
  it("is reproducible: two bags from the same seed yield identical sequences over 100 draws", () => {
    const a = drawN(createSevenBag(20260701), 100);
    const b = drawN(createSevenBag(20260701), 100);
    expect(a).toEqual(b);
  });

  it("makes every aligned 7-piece window a permutation of all seven ids", () => {
    const seq = drawN(createSevenBag(1337), 7 * 20); // 20 full bags
    const windows = chunk(seq, 7);
    expect(windows).toHaveLength(20);
    for (const w of windows) {
      // exactly the seven ids, each once → distinct set of size 7 covering the alphabet
      expect(new Set(w).size).toBe(7);
      expect([...w].sort()).toEqual(ALL_IDS);
    }
  });

  it("covers all seven ids within the first bag", () => {
    const first = drawN(createSevenBag(5), 7);
    expect([...new Set(first)].sort()).toEqual(ALL_IDS);
  });

  it("diverges for different seeds", () => {
    const a = drawN(createSevenBag(1), 100);
    const b = drawN(createSevenBag(2), 100);
    expect(a).not.toEqual(b);
  });

  it("only ever yields ids from the tetromino alphabet", () => {
    const valid = new Set<TetrominoType>(TETROMINO_TYPES);
    for (const id of drawN(createSevenBag(99), 100)) {
      expect(valid.has(id)).toBe(true);
    }
  });
});
