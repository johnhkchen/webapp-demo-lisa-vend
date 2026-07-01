/**
 * Board dimensions for the Tetris playfield.
 *
 * Pure, framework-free constants — no React, no side effects. This seeds the `lib/`
 * track (see CLAUDE.md); the real game logic (tetrominoes, collision, scoring, RNG)
 * lands in later epics and imports from here.
 */

/** Number of columns in the playfield (classic Tetris width). */
export const COLS = 10;

/** Number of rows in the playfield (classic Tetris height). */
export const ROWS = 20;
