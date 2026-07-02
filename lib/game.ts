/**
 * The game-core reducer — the single pure `step(state, input)` that ties every `lib/` primitive
 * into a running Tetris state machine, and the `GameState`/`Input`/`createInitialState` surface
 * around it.
 *
 * Pure, framework-free (no React/Next; enforced by the `lib/**` eslint boundary). This is the
 * *composition root* that sits on top of all the standalone primitives: it drives spawn
 * (`movement.spawnPiece`), lateral movement (`movement.moveLeft/Right`), rotation
 * (`rotation.rotateCW/CCW`), gravity + lock (`gravity.applyGravity`), line clear
 * (`line-clear.clearLines`), and scoring (`scoring.scoreFor`). The three primitives that named
 * "the step reducer" as their consumer (gravity → line-clear → scoring) are wired together here,
 * in that exact order, on every lock.
 *
 * Coordinate convention (matches `types.ts`): the board is row-major, `board[y][x]`, `x` growing
 * right and `y` growing down from a top-left origin. `GameState.board` holds only *settled* cells
 * — the `active` piece is kept separate and merged in only when it locks (a renderer overlays the
 * active piece on top of the board).
 *
 * Game-over (top-out): after a piece locks and lines clear, the next piece is spawned from the
 * bag; if that fresh spawn `collides` with the settled stack, `gameOver` is set. Once `gameOver`
 * is true, `step` is a no-op (returns its input state) so an animation loop can keep ticking
 * harmlessly until it notices.
 *
 * Purity note (design A1): `GameState` carries a **live** seeded 7-bag (`bag.ts`), whose `next()`
 * mutates internal closure state. That is the one intentional side effect `step` performs — it
 * advances the bag when it spawns. "Pure" here means framework-free and deterministic given the
 * seed and input sequence, not strict value-purity of the embedded id stream; making the RNG/bag
 * fully serializable (for saves/replays) is a deliberate later refactor.
 *
 * Scope boundary: no lock-delay/timing, no drop-distance score bonus (neither soft- nor hard-drop
 * awards per-cell points yet — soft-drop is still an alias of a gravity tick, and hard-drop only
 * earns the line-clear award any lock grants), no combo/back-to-back/T-spin scoring, and no level
 * progression — `level` is carried into `scoreFor` but not advanced here. Hard-drop *is* wired
 * (`"hardDrop"` input → drop to rest → the lock pipeline). All the rest are later tickets. This
 * module imports nothing from React/Next and touches no other file.
 */

import type { Board, Piece, TetrominoType } from "./types";
import { COLS, ROWS } from "./constants";
import { emptyBoard } from "./board";
import { createSevenBag, type SevenBag } from "./bag";
import { spawnPiece, moveLeft, moveRight, hardDrop } from "./movement";
import { rotateCW, rotateCCW } from "./rotation";
import { applyGravity } from "./gravity";
import { clearLines } from "./line-clear";
import { scoreFor } from "./scoring";
import { collides } from "./collision";

/**
 * The complete snapshot of a game. `board` holds only settled cells; the falling `active` piece
 * is separate and always present (a finished game is signalled by `gameOver`, not by a missing
 * piece). `bag` is the live seeded id source (see the module purity note). `score`/`lines`
 * accumulate over the game; `level` scales scoring and is carried unchanged by this ticket.
 *
 * `hold` is the held-piece *identity* (`null` until the first hold): a held piece re-enters
 * the field **fresh** via `spawnPiece`, so only its type is stored — its previous rotation and
 * position are intentionally discarded. `canHold` is the once-per-drop lock flag: `true` while
 * a hold is allowed for the current piece, flipped `false` the instant `"hold"` is used, and
 * reset `true` only when the next piece locks-and-spawns (in `descend`). Together they enforce
 * the "one hold per drop" rule.
 */
export interface GameState {
  board: Board;
  active: Piece;
  bag: SevenBag;
  score: number;
  lines: number;
  level: number;
  gameOver: boolean;
  hold: TetrominoType | null;
  canHold: boolean;
}

/**
 * A player or timer intent handed to `step`. Lateral intents (`left`/`right`/`rotateCW`/
 * `rotateCCW`) transform only the active piece; the descent intents (`softDrop`, `tick`) run one
 * gravity step and may trigger the lock → clear → score → spawn pipeline. `hardDrop` drops the
 * active piece straight to its resting position and then runs that same pipeline in one step
 * (instant drop + lock). `softDrop` and `tick` currently behave identically (both a single gravity
 * step); they are kept distinct so a later ticket can give soft-drop its own scoring/timing without
 * changing the input alphabet.
 *
 * `hold` swaps the active piece with the held slot (or, on the first hold of a drop, stashes
 * the active piece and pulls a fresh one from the bag). It is allowed once per drop: a second
 * `hold` before the current piece locks is a no-op, and the allowance resets when the piece
 * locks. The swapped-in piece always re-spawns fresh (spawn rotation/column).
 */
export type Input =
  | "left"
  | "right"
  | "rotateCW"
  | "rotateCCW"
  | "softDrop"
  | "hardDrop"
  | "tick"
  | "hold";

/**
 * Build a fresh game for `seed`: an empty `COLS×ROWS` board, a seeded 7-bag, and the first piece
 * spawned from that bag. Same `seed` ⇒ identical piece sequence (and thus identical play under an
 * identical input sequence). The first spawn is onto an empty board, so it can never top out —
 * `gameOver` starts `false` with no collision check needed.
 */
export function createInitialState(seed: number): GameState {
  const bag = createSevenBag(seed);
  const board = emptyBoard(COLS, ROWS);
  const active = spawnPiece(bag.next(), COLS);
  return {
    board,
    active,
    bag,
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
    hold: null,
    canHold: true,
  };
}

/**
 * One gravity step and, if it lands, the full lock pipeline.
 *
 * `applyGravity` returns the same board reference with the fallen piece when the piece can still
 * descend → we just swap in the new `active`. When it locks, `applyGravity` hands back a fresh
 * board with the piece already merged; we then `clearLines` it, award `scoreFor(cleared, level)`,
 * accumulate the cleared-row count, spawn the next piece from the bag, and set `gameOver` if that
 * spawn collides with the settled stack. Returns a fresh `GameState`; the input's board and piece
 * are never mutated (the only side effect is advancing the shared `bag`).
 */
function descend(state: GameState): GameState {
  const result = applyGravity(state.board, state.active);
  if (!result.locked) {
    return { ...state, active: result.piece };
  }

  const { cleared, board } = clearLines(result.board);
  const score = state.score + scoreFor(cleared, state.level);
  const lines = state.lines + cleared;
  const width = board[0].length;
  const active = spawnPiece(state.bag.next(), width);
  const gameOver = collides(board, active.type, active.position, active.rotation);

  // A fresh piece just locked-and-spawned → the once-per-drop hold allowance resets. This is
  // the engine's single lock site, so it is the only place `canHold` is re-enabled.
  return { ...state, board, active, score, lines, gameOver, canHold: true };
}

/**
 * Apply a `"hold"` input: swap the active piece with the held slot, once per drop.
 *
 * No-op (returns the input state unchanged) when `canHold` is false — a second hold before the
 * current piece locks. Otherwise the active piece's *identity* moves into `hold`, and the
 * incoming id becomes a freshly-spawned active: the held id on a swap, or — when the slot is
 * empty — the next id drawn from the bag. The `??` short-circuit means the bag is advanced
 * **only** on the empty-slot path; an occupied-slot swap never consumes a draw (so it cannot
 * desync the piece sequence from an unheld game). `canHold` is set false until the next lock.
 * The swapped-in piece re-spawns fresh via `spawnPiece`; if it collides with the settled stack
 * it tops out, exactly as an ordinary spawn does. Returns a fresh `GameState`; the only side
 * effect is advancing the shared bag, and only when the slot was empty.
 */
function hold(state: GameState): GameState {
  if (!state.canHold) return state;

  const width = state.board[0].length;
  const stashed = state.active.type;
  const incoming = state.hold ?? state.bag.next();
  const active = spawnPiece(incoming, width);
  const gameOver = collides(state.board, active.type, active.position, active.rotation);

  return { ...state, active, hold: stashed, canHold: false, gameOver };
}

/**
 * The reducer: apply one `input` to `state` and return the next `GameState`.
 *
 * Once `state.gameOver` is set, every input is a no-op (the input state is returned unchanged).
 * Lateral inputs delegate to the collision-gated movement/rotation helpers on `state.active` and
 * touch nothing else; `softDrop`/`tick` run `descend`. Never mutates the input state's board or
 * piece (movement/rotation are copy-on-write and return the same reference when blocked, so a
 * no-op lateral move yields an equivalent state).
 */
export function step(state: GameState, input: Input): GameState {
  if (state.gameOver) return state;

  switch (input) {
    case "left":
      return { ...state, active: moveLeft(state.board, state.active) };
    case "right":
      return { ...state, active: moveRight(state.board, state.active) };
    case "rotateCW":
      return { ...state, active: rotateCW(state.board, state.active) };
    case "rotateCCW":
      return { ...state, active: rotateCCW(state.board, state.active) };
    case "hardDrop":
      // Drop straight to the resting position, then run the ordinary lock pipeline: with the
      // piece already at rest, `descend`'s `applyGravity` locks it immediately (instant drop +
      // lock + clear + score + spawn), so hard-drop reuses the exact gravity path with no
      // duplicated lock logic.
      return descend({ ...state, active: hardDrop(state.board, state.active) });
    case "softDrop":
    case "tick":
      return descend(state);
    case "hold":
      return hold(state);
  }
}
