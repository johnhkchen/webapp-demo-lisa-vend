import Cell from "@/components/Cell";
import type { Board as BoardMatrix, Point, TetrominoType } from "@/lib/types";
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
 *
 * Ghost channel (T-007-02-02): the translucent landing marker is not baked into the `board`
 * matrix (which can only hold a piece id or `null`) — it arrives as a *separate* channel,
 * `ghost` (the landing cells from `lib/ghost.ts`) plus `ghostType` (the active piece's hue). This
 * component only zips it onto the grid by the same `y * cols + x` key it already uses for cells;
 * it stays logic-free. The mark is advisory — `Cell` still draws the ghost only on an empty
 * square, so a ghost coordinate that coincides with a settled cell is suppressed at the leaf.
 */
interface BoardProps {
  /** The settled board to paint (row-major `board[y][x]`). */
  board: BoardMatrix;
  /** The active piece's landing cells to mark translucent (from `ghostCells`). */
  ghost?: Point[];
  /** The active piece's id, tinting the ghost marks; `null`/absent draws no ghost. */
  ghostType?: TetrominoType | null;
}

export default function Board({ board, ghost = [], ghostType = null }: BoardProps) {
  const rows = board.length || ROWS;
  const cols = board[0]?.length ?? COLS;
  const ghostKeys = new Set(ghost.map((p) => p.y * cols + p.x));

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
        row.map((cell, x) => {
          const key = y * cols + x;
          const isGhost = ghostType !== null && ghostKeys.has(key);
          return <Cell key={key} cell={cell} ghost={isGhost ? ghostType : null} />;
        }),
      )}
    </div>
  );
}
