import Cell from "@/components/Cell";
import { COLS, ROWS } from "@/lib/constants";

/**
 * Placeholder Tetris board — a static CSS grid composed of empty `Cell` components.
 *
 * Deliberately trivial: no props, no state, no game logic. It owns the grid *container*
 * (template from COLS/ROWS, sizing, chrome) and renders one `Cell` per position, proving
 * the chosen DOM/CSS-grid render approach (over canvas) and that Tailwind applies. The
 * real, stateful board lands in a later playability epic, which gives `Cell` its state.
 */
export default function Board() {
  const cells = Array.from({ length: COLS * ROWS });

  return (
    <div
      aria-label="Tetris board (placeholder)"
      className="grid gap-px rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl"
      style={{
        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
        width: "min(90vw, 300px)",
        aspectRatio: `${COLS} / ${ROWS}`,
      }}
    >
      {cells.map((_, i) => (
        <Cell key={i} />
      ))}
    </div>
  );
}
