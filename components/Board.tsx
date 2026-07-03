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
 *
 * Flash channel (T-007-06-02): the row-clear flash arrives as another advisory overlay channel,
 * `flashRows` (the cleared-row indices, latched by `useClearFlash`) plus `flashKey` (the burst
 * generation). Like the ghost channel it carries no game logic; it is painted as a separate
 * absolutely-positioned overlay *grid* that mirrors the cell grid's exact geometry (same template,
 * gap, padding — computed once and shared), so each full-row `.flash` bar lands precisely on its row
 * without disturbing the cell grid's auto-placement. Flash bars carry `data-flash-row` and never
 * `data-cell`/`data-ghost`, so the `rows*cols` `[data-cell]` invariant is preserved. `flashKey` keys
 * the overlay so the CSS animation restarts on each new clear (even when the same rows clear twice).
 * On a clear frame the `board` prop is already the collapsed board, so the bars flash the row
 * *positions* over the settled result — the intended "these rows lit up as they cleared" beat.
 */
interface BoardProps {
  /** The settled board to paint (row-major `board[y][x]`). */
  board: BoardMatrix;
  /** The active piece's landing cells to mark translucent (from `ghostCells`). */
  ghost?: Point[];
  /** The active piece's id, tinting the ghost marks; `null`/absent draws no ghost. */
  ghostType?: TetrominoType | null;
  /** Cleared-row indices to flash for the current clear burst (from `useClearFlash`). */
  flashRows?: number[];
  /** The clear burst generation; keys the overlay so the flash animation restarts each burst. */
  flashKey?: number;
}

export default function Board({
  board,
  ghost = [],
  ghostType = null,
  flashRows = [],
  flashKey,
}: BoardProps) {
  const rows = board.length || ROWS;
  const cols = board[0]?.length ?? COLS;
  const ghostKeys = new Set(ghost.map((p) => p.y * cols + p.x));

  // Shared grid geometry, computed once so the cell grid and the flash overlay can never drift.
  const gridStyle = {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  } as const;

  return (
    <div
      className="relative"
      style={{ width: "min(90vw, 300px)", aspectRatio: `${cols} / ${rows}` }}
    >
      <div
        aria-label="Tetris board"
        className="clay-well grid h-full w-full gap-px p-2"
        style={gridStyle}
      >
        {board.flatMap((row, y) =>
          row.map((cell, x) => {
            const key = y * cols + x;
            const isGhost = ghostType !== null && ghostKeys.has(key);
            return <Cell key={key} cell={cell} ghost={isGhost ? ghostType : null} />;
          }),
        )}
      </div>

      {flashRows.length > 0 && (
        <div
          key={flashKey}
          aria-hidden
          className="pointer-events-none absolute inset-0 grid gap-px p-2"
          style={gridStyle}
        >
          {flashRows.map((y) => (
            <div
              key={y}
              data-flash-row={y}
              className="flash glow rounded-[2px]"
              style={{ gridRow: `${y + 1}`, gridColumn: "1 / -1" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
