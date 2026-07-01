import type { Board, Cell } from "./types";

/**
 * Construct an all-empty board of the given dimensions.
 *
 * Argument order is `(width, height)` — mirroring `emptyBoard(w, h)` and the `COLS, ROWS`
 * ordering in `lib/constants.ts`; callers pass `emptyBoard(COLS, ROWS)`. Returns a row-major
 * grid (`board[y][x]`) of `height` rows × `width` columns, every cell initialized to `null`.
 *
 * Each row is a freshly allocated array, so cells are independent — writing `board[y][x]`
 * never aliases another row (avoiding the `Array(h).fill(Array(w).fill(null))` trap).
 */
export function emptyBoard(width: number, height: number): Board {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, (): Cell => null),
  );
}
