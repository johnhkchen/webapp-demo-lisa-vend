import type { Cell as CellValue, TetrominoType } from "@/lib/types";

/**
 * One square of the Tetris board grid — presentational, driven by a single stored cell value.
 *
 * `cell` is the model value (`lib/types.ts`): `null` for an empty square, otherwise the id of the
 * tetromino settled there. Owns exactly one decision — how a square looks — branching only on
 * `cell === null`; it contains no game logic (see CLAUDE.md / this ticket's AC). Distinct from the
 * `Cell` value type it renders, which is imported here aliased as `CellValue`.
 *
 * Color comes from the per-piece neon tokens provisioned in `app/globals.css` (E-004), consumed via
 * the `bg-piece-*` utilities. The map holds **literal** class strings on purpose: Tailwind v4 only
 * emits a utility it finds as a literal in source, so a computed `bg-piece-${type}` would be
 * tree-shaken away — the static map is what guarantees all seven fills ship.
 */
const CELL_COLOR: Record<TetrominoType, string> = {
  I: "bg-piece-i",
  O: "bg-piece-o",
  T: "bg-piece-t",
  S: "bg-piece-s",
  Z: "bg-piece-z",
  J: "bg-piece-j",
  L: "bg-piece-l",
};

interface CellProps {
  /** The stored square: `null` (empty) or the settled tetromino id. */
  cell: CellValue;
}

export default function Cell({ cell }: CellProps) {
  const className =
    cell === null
      ? "rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5"
      : `rounded-[2px] ${CELL_COLOR[cell]}`;

  return <div className={className} data-cell={cell ?? "empty"} />;
}
