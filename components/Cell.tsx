/**
 * A single placeholder cell of the Tetris board grid.
 *
 * The atomic unit named in CLAUDE.md's component list. Deliberately presentational and
 * stateless: no props, no game semantics. It renders one empty grid square so the board
 * proves the DOM/CSS-grid renderer fork. The playability epic adds the first prop here
 * (fill / color for a settled or active piece) — this is the seam reserved for that state.
 */
export default function Cell() {
  return (
    <div className="rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5" />
  );
}
