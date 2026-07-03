import { cellsFor, BOUNDING_BOX } from "@/lib/pieces";
import type { PieceType } from "@/lib/types";

/**
 * `HoldBox` — the held-piece display beside the board (T-007-03-02).
 *
 * Presentational and props-driven, in the same discipline as `Board`/`Cell`/`GameOverlay`: it
 * holds no state and no game logic. The hold *rules* live entirely in the pure core
 * (`lib/game.ts`: `hold`/`canHold`, `step`'s `"hold"` case, all landed by T-007-03-01); this
 * component only surfaces two fields read straight off the hook — `state.hold` (what is held) and
 * `state.canHold` (whether a hold is still allowed this drop).
 *
 * It draws the held piece by reusing the shape data: the spawn cells `cellsFor(type, 0)`
 * painted onto a `BOUNDING_BOX[type]`-sized mini grid, so it re-derives no offsets of its own. An
 * empty slot (`type === null`, before the first hold) renders a stable 4×4 blank so the panel is
 * present from first paint and the layout never jumps.
 *
 * "Block felt" (AC): when `canHold` is false — a hold was already spent this drop and a second is
 * a core no-op — the whole box dims (`opacity-40`) and carries `data-can-hold="false"`, so the
 * once-per-drop lock is observable, not silent. This is a plain static state, not animated juice
 * (that flash is E-004's; see `GameOverlay`'s matching scope note).
 *
 * Attribute discipline: filled squares carry `data-hold={type}`, **never** `data-cell` —
 * `data-cell` is reserved for board squares and is load-bearing for `GameContainer.test`'s flat
 * row-major index helpers. A stray `data-cell` here would shift those indices and break board
 * assertions.
 */

/**
 * Per-piece neon fills — the same `bg-piece-*` tokens `Cell` uses, kept as a **local literal**
 * map. Tailwind v4 only emits a utility it finds written out in source, so a computed
 * `bg-piece-${type}` would be tree-shaken away; each rendering module therefore owns its own
 * static map (the pattern `Cell.CELL_COLOR` establishes). Duplicated rather than exported from
 * `Cell` to keep that leaf untouched and free of a cross-component coupling.
 */
const PIECE_FILL: Record<PieceType, string> = {
  I: "bg-piece-i",
  O: "bg-piece-o",
  T: "bg-piece-t",
  S: "bg-piece-s",
  Z: "bg-piece-z",
  J: "bg-piece-j",
  L: "bg-piece-l",
};

interface HoldBoxProps {
  /** The held piece id, or `null` before the first hold (renders an empty slot). */
  type: PieceType | null;
  /** Whether a hold is still allowed this drop; `false` dims the box (the block "felt"). */
  canHold: boolean;
}

export default function HoldBox({ type, canHold }: HoldBoxProps) {
  // Empty slot draws a stable 4×4 blank (the widest box) so the panel size is fixed across holds.
  const box = type ? BOUNDING_BOX[type] : 4;
  // The occupied squares of the held piece in its spawn orientation, keyed by row-major index.
  const filled = new Set(
    type ? cellsFor(type, 0).map((c) => c.y * box + c.x) : [],
  );

  return (
    <div
      aria-label="Hold"
      data-can-hold={canHold}
      className={`clay-chip flex flex-col gap-2 p-2 ${canHold ? "" : "opacity-40"}`}
    >
      <span className="text-xs uppercase tracking-wide text-foreground/70">Hold</span>
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `repeat(${box}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${box}, minmax(0, 1fr))`,
          width: "72px",
          height: "72px",
        }}
      >
        {Array.from({ length: box * box }, (_, i) =>
          type && filled.has(i) ? (
            <div key={i} className={`rounded-[2px] ${PIECE_FILL[type]}`} data-hold={type} />
          ) : (
            <div
              key={i}
              className="rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10"
            />
          ),
        )}
      </div>
    </div>
  );
}
