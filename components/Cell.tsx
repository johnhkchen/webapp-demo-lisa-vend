import type { Cell as CellValue, TetrominoType } from "@/lib/types";

/**
 * One square of the Tetris board grid — presentational, driven by a single stored cell value.
 *
 * `cell` is the model value (`lib/types.ts`): `null` for an empty square, otherwise the id of the
 * tetromino settled there. A square has three visual states — settled (solid neon), ghost (a
 * translucent landing marker, T-007-02-02), and empty — decided here; it contains no game logic
 * (see CLAUDE.md / this ticket's AC). Distinct from the `Cell` value type it renders, which is
 * imported here aliased as `CellValue`.
 *
 * Color comes from the per-piece neon tokens provisioned in `app/globals.css` (E-004), consumed via
 * the `bg-piece-*` utilities. Both maps hold **literal** class strings on purpose: Tailwind v4 only
 * emits a utility it finds as a literal in source, so a computed `bg-piece-${type}` would be
 * tree-shaken away — the static maps are what guarantee all seven fills (and their translucent
 * ghost variants) ship.
 *
 * Ghost (`ghost`): the id whose hue tints this square as the translucent landing marker. It is
 * drawn **only on an empty square** — a settled cell always wins — so a ghost that coincides with
 * the active piece or the stack is silently suppressed (the caller, `Board`, already only sets it
 * where the landing lands; this guard makes suppression correct even if it didn't). Ghost squares
 * stay `data-cell="empty"` (their model cell *is* empty) and additionally carry `data-ghost={id}`.
 *
 * Motion (T-007-06-02): every branch's root carries the `.motion` utility, giving each square a
 * compositor-only transition hook (transform/opacity — the two properties the GPU animates without
 * layout or paint) so the clear/collapse redraw eases instead of snapping, at 60fps. `.motion`
 * deliberately does NOT transition `background-color` (a paint property, off-compositor) — fills
 * still swap instantly; only transform/opacity interpolate. See `app/globals.css`.
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

/**
 * Translucent per-piece ghost fills: a see-through hue wash plus a hairline inset ring in the same
 * neon token, so the landing footprint reads as an outlined, transparent block distinct from both
 * the solid fill and the blank empty cell. Literal strings for the same tree-shaking reason as
 * `CELL_COLOR` — the `/15` and `/60` opacity modifiers apply to the real `--color-piece-*` tokens.
 */
const GHOST_COLOR: Record<TetrominoType, string> = {
  I: "bg-piece-i/15 ring-1 ring-inset ring-piece-i/60",
  O: "bg-piece-o/15 ring-1 ring-inset ring-piece-o/60",
  T: "bg-piece-t/15 ring-1 ring-inset ring-piece-t/60",
  S: "bg-piece-s/15 ring-1 ring-inset ring-piece-s/60",
  Z: "bg-piece-z/15 ring-1 ring-inset ring-piece-z/60",
  J: "bg-piece-j/15 ring-1 ring-inset ring-piece-j/60",
  L: "bg-piece-l/15 ring-1 ring-inset ring-piece-l/60",
};

interface CellProps {
  /** The stored square: `null` (empty) or the settled tetromino id. */
  cell: CellValue;
  /**
   * The tetromino id whose hue paints this square as the translucent ghost landing marker, or
   * `null`/absent for a normal square. Rendered only when `cell` is `null` (settled wins).
   */
  ghost?: TetrominoType | null;
}

export default function Cell({ cell, ghost = null }: CellProps) {
  if (cell !== null) {
    return (
      <div className={`motion rounded-[2px] ${CELL_COLOR[cell]}`} data-cell={cell} />
    );
  }

  if (ghost !== null) {
    return (
      <div
        className={`motion rounded-[2px] ${GHOST_COLOR[ghost]}`}
        data-cell="empty"
        data-ghost={ghost}
      />
    );
  }

  return (
    <div
      className="motion rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5"
      data-cell="empty"
    />
  );
}
