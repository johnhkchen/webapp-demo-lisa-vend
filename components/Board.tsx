import { COLS, ROWS } from "@/lib/constants";

/**
 * Placeholder Tetris board — a static CSS grid of empty cell divs.
 *
 * Deliberately trivial: no props, no state, no game logic. It proves the chosen
 * DOM/CSS-grid render approach (over canvas) and that Tailwind applies. The real,
 * stateful board lands in a later playability epic, which replaces this body.
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
        <div
          key={i}
          className="rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5"
        />
      ))}
    </div>
  );
}
