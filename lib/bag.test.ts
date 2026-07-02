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

// Seeds spanning zero, negatives, fractionals, and large values — mulberry32 normalizes any of them.
const SEEDS = [0, 1, 2, 5, 42, 1337, 20260701, -7, 3.14, 999999];

describe("SevenBag.peek", () => {
  it("equals the next n next() draws, for many seeds and many n (across refill boundaries)", () => {
    for (const seed of SEEDS) {
      for (let n = 0; n <= 21; n++) {
        // Fresh sibling bags from the same seed: peek one, draw from the other, compare.
        const peeked = createSevenBag(seed).peek(n);
        const drawn = drawN(createSevenBag(seed), n);
        expect(peeked).toEqual(drawn);
        expect(peeked).toHaveLength(n);
      }
    }
  });

  it("does not mutate the stream: draws after peeks match a never-peeked sibling", () => {
    for (const seed of SEEDS) {
      const a = createSevenBag(seed);
      const b = createSevenBag(seed);
      // Interleave several peeks of varying sizes, including across the first refill.
      a.peek(1);
      a.peek(7);
      a.peek(15);
      expect(drawN(a, 50)).toEqual(drawN(b, 50));
    }
  });

  it("agrees when interleaved with next(): peeked ids match the draws that follow", () => {
    const bag = createSevenBag(1337);
    drawN(bag, 3); // advance into the stream
    const peeked = bag.peek(10); // spans the current bag into the next
    expect(drawN(bag, 10)).toEqual(peeked);
  });

  it("is idempotent: repeated peeks with no intervening next() are equal", () => {
    const bag = createSevenBag(42);
    const first = bag.peek(12);
    const second = bag.peek(12);
    expect(second).toEqual(first);
    // And peeking still didn't consume anything.
    expect(drawN(bag, 12)).toEqual(first);
  });

  it("treats n <= 0 as an empty peek", () => {
    const bag = createSevenBag(5);
    expect(bag.peek(0)).toEqual([]);
    expect(bag.peek(-3)).toEqual([]);
    // Empty peeks do not advance the stream.
    expect(drawN(bag, 7)).toEqual(drawN(createSevenBag(5), 7));
  });

  it("returns a fresh array: mutating the result cannot corrupt the stream", () => {
    const bag = createSevenBag(2);
    const peeked = bag.peek(5);
    peeked[0] = "I";
    peeked.length = 0;
    // The stream is unaffected by mutations to a previously-returned peek array.
    expect(drawN(bag, 5)).toEqual(createSevenBag(2).peek(5));
  });
});
