/**
 * Board dimensions for the RowClear playfield.
 *
 * Pure, framework-free constants — no React, no side effects. This seeds the `lib/`
 * track (see CLAUDE.md); the real game logic (pieces, collision, scoring, RNG)
 * lands in later epics and imports from here.
 */

/** Number of columns in the playfield (the classic falling-block width). */
export const COLS = 10;

/** Number of rows in the playfield (the classic falling-block height). */
export const ROWS = 20;
