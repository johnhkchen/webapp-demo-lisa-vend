/**
 * Core data substrate for the RowClear game core.
 *
 * Pure, framework-free type definitions — no React/Next imports (see CLAUDE.md; enforced by
 * the `lib/**` eslint boundary). This module has zero runtime output: every declaration is a
 * `type`/`interface` erased by the compiler. It is the substrate every other `lib/` module
 * builds on — the seven-piece shape data (T-002-01-02) and the seeded RNG (T-002-01-03)
 * import these types, as will collision, movement, and scoring in later stories.
 */

/**
 * A grid coordinate. `x` is the column (0 = leftmost), `y` is the row (0 = topmost).
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * The seven standard piece identities. This fixed alphabet is what the whole engine keys
 * on — shape tables, the 7-bag, and settled-cell colors all reference these ids.
 */
export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

/**
 * The four SRS rotation states of a piece: 0 (spawn), 1 (R), 2 (180), 3 (L). The concrete
 * cell offsets for each state are supplied by the shape data (T-002-01-02); this type only
 * enumerates the valid orientations.
 */
export type RotationState = 0 | 1 | 2 | 3;

/**
 * One square of the board grid: `null` when empty, otherwise the id of the piece that
 * settled there (kept so the renderer can color the block and line-clear can test fullness).
 *
 * Note: distinct from the `components/Cell.tsx` React component — this is the stored value,
 * that is the rendered square.
 */
export type Cell = PieceType | null;

/**
 * The playfield as a row-major 2D grid: the outer array is rows (length = height), each inner
 * array is columns (length = width), so a square is addressed `board[y][x]`. This diverges
 * intentionally from the placeholder renderer's flat array — the model favors 2D indexing for
 * row-wise operations (line clears, collision) and the renderer flattens at its boundary.
 */
export type Board = Cell[][];

/**
 * The active, falling piece: its identity, current orientation, and anchor position. The
 * concrete occupied cells are *derived* from the shape tables (T-002-01-02) for a given
 * `type` + `rotation`, not stored here — keeping this state normalized.
 */
export interface Piece {
  type: PieceType;
  rotation: RotationState;
  position: Point;
}
