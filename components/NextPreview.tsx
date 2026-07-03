import { cellsFor, BOUNDING_BOX } from "@/lib/pieces";
import type { PieceType } from "@/lib/types";

/**
 * `NextPreview` — the upcoming-piece queue displayed beside the board (T-007-04-02).
 *
 * Presentational and props-driven, in the same discipline as `Board`/`Cell`/`GameOverlay`/
 * `HoldBox`: it holds no state and no game logic. The lookahead *seam* is already done
 * (T-007-04-01) — `useGame` surfaces a non-consuming bag peek as `queue`, sized by
 * `PREVIEW_COUNT`. This component only renders whatever ids it is handed, one mini-tile per
 * entry, next-to-spawn first. It imports no count of its own: `queue.length` IS the count, so
 * there is a single source of truth (the hook) and no magic-number drift.
 *
 * Each tile draws its piece by reusing the shape data — the spawn cells `cellsFor(type, 0)`
 * painted onto a `BOUNDING_BOX[type]`-sized mini grid — so it re-derives no offsets of its own,
 * exactly as `HoldBox` does. Tiles sit in a fixed-size square slot so the column width never
 * jitters as a 4-wide I and a 2-wide O cycle through.
 *
 * Attribute discipline: filled squares carry `data-next={type}`, **never** `data-cell` —
 * `data-cell` is reserved for board squares and is load-bearing for `GameContainer.test`'s flat
 * row-major index helpers (a stray `data-cell` in a side panel shifts those indices and breaks
 * board assertions). This mirrors `HoldBox`'s `data-hold` rule.
 *
 * No advance animation/juice here (that flash is E-004's; see `HoldBox`/`GameOverlay`'s matching
 * scope notes) — the tiles simply re-render as the queue re-derives on each spawn.
 */

/**
 * Per-piece neon fills — the same `bg-piece-*` tokens `Cell`/`HoldBox` use, kept as a **local
 * literal** map. Tailwind v4 only emits a utility it finds written out in source, so a computed
 * `bg-piece-${type}` would be tree-shaken away; each rendering module therefore owns its own
 * static map (the pattern `Cell.CELL_COLOR` / `HoldBox.PIECE_FILL` establishes). Duplicated
 * rather than shared to keep these leaves decoupled.
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

/**
 * One upcoming piece drawn on its own `BOUNDING_BOX[type]` grid, inside a fixed-size square slot
 * so every tile shares a column width. Filled squares reuse `cellsFor(type, 0)` (spawn
 * orientation) keyed by row-major index — no hard-coded coords.
 */
function PreviewTile({ type }: { type: PieceType }) {
  const box = BOUNDING_BOX[type];
  const filled = new Set(cellsFor(type, 0).map((c) => c.y * box + c.x));

  return (
    <div
      className="grid gap-px"
      style={{
        gridTemplateColumns: `repeat(${box}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${box}, minmax(0, 1fr))`,
        width: "64px",
        height: "64px",
      }}
    >
      {Array.from({ length: box * box }, (_, i) =>
        filled.has(i) ? (
          <div key={i} className={`rounded-[2px] ${PIECE_FILL[type]}`} data-next={type} />
        ) : (
          <div key={i} className="rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10" />
        ),
      )}
    </div>
  );
}

interface NextPreviewProps {
  /**
   * Upcoming piece ids, next-to-spawn first. Sourced from `useGame`'s `queue` (a non-consuming
   * bag peek, sized by `PREVIEW_COUNT`). Rendered verbatim — one tile per entry.
   */
  queue: PieceType[];
}

export default function NextPreview({ queue }: NextPreviewProps) {
  return (
    <div aria-label="Next" className="clay-chip flex flex-col gap-2 p-2">
      <span className="text-xs uppercase tracking-wide text-foreground/70">Next</span>
      <div className="flex flex-col gap-2">
        {/* Key by index: the queue is positional (slot 0 is next) and ids repeat across the bag,
            so the slot index is the stable positional key. */}
        {queue.map((type, i) => (
          <PreviewTile key={i} type={type} />
        ))}
      </div>
    </div>
  );
}
