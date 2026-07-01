import Cell from "@/components/Cell";
import type { Board as BoardMatrix } from "@/lib/types";
import { COLS, ROWS } from "@/lib/constants";

/**
 * The Tetris board — a props-driven CSS grid that paints a settled-board matrix.
 *
 * Takes the row-major `board` model (`lib/types.ts`, `board[y][x]`) and flattens it at the render
 * boundary into one `Cell` per square, delegating each square's look to `Cell`. Owns only the grid
 * *container* (template, sizing, neon/glass chrome); it holds no state and no game logic (AC).
 *
 * Grid dimensions are derived from the matrix, not from constants, so the rendered grid always
 * matches the data handed in ("props-driven"); `COLS`/`ROWS` are used only as a fallback for a
 * degenerate empty matrix. Renders settled cells only — the active falling piece is overlaid by the
 * state hook in a later ticket (T-003-01-02).
 */
interface BoardProps {
  /** The settled board to paint (row-major `board[y][x]`). */
  board: BoardMatrix;
}

export default function Board({ board }: BoardProps) {
  const rows = board.length || ROWS;
  const cols = board[0]?.length ?? COLS;

  return (
    <div
      aria-label="Tetris board"
      className="grid gap-px rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        width: "min(90vw, 300px)",
        aspectRatio: `${cols} / ${rows}`,
      }}
    >
      {board.flatMap((row, y) =>
        row.map((cell, x) => <Cell key={y * cols + x} cell={cell} />),
      )}
    </div>
  );
}
