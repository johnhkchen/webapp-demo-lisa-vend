# Research — T-002-03-02 line-based-scoring

## Ticket in one line

Given a line-clear event (how many rows a lock cleared), compute the standard
line-based score delta: single/double/triple/tetris = **40 / 100 / 300 / 1200**,
scaled by a level factor, and **0** for a lock that clears nothing.

_Advances: P1, E-002:scoring. Depends on T-002-03-01 (line-clear detection)._

## Where this sits in the `lib/` stack

The game core is a layered stack of pure, framework-free modules under `lib/`
(CLAUDE.md forbids React/Next imports here; a `lib/**` eslint boundary enforces it).
Bottom-up, the pieces relevant to this ticket:

- `constants.ts` — `COLS = 10`, `ROWS = 20`. No scoring constants yet.
- `types.ts` — the data substrate: `Cell`, `Board`, `Piece`, `TetrominoType`,
  `RotationState`, `Point`. **No `Level`, `Score`, or scoring types yet.** This
  ticket adds no board/piece types; it is a scalar → scalar computation.
- `board.ts` — `emptyBoard(width, height)`.
- `collision.ts`, `movement.ts`, `rotation.ts`, `gravity.ts` — the piece-motion layers.
- `line-clear.ts` — **the direct upstream** (T-002-03-01). `clearLines(board)` returns
  `LineClearResult { cleared: number; board: Board }`, where `cleared` is the count of
  full rows removed (0..height). **That `cleared` count is the sole input this ticket's
  scoring function consumes.**

## The seam this ticket plugs into

`line-clear.ts`'s header and `LineClearResult` interface already anticipate this ticket:

> `board` is the shrunk board and the cleared count (which then feeds scoring, a
> separate story).

So the contract is pre-designed. `clearLines` produces `cleared ∈ {0,1,2,3,4}` (four is
the max simultaneous clear — a "Tetris"). This ticket delivers a pure function that maps
that count (plus a level) to a score delta. It does **not** wire itself into any reducer:
the `step(state, input)` reducer of **T-002-03-03** is what will call `clearLines` then
feed `cleared` into `scoreFor` and accumulate the running score. Wiring here would couple
this ticket to the reducer ticket (a DAG edge the workflow warns against) — T-002-03-03
already `depends_on` this ticket.

## The scoring rule (classic line-based)

The standard Nintendo/Guideline **line clear** award (excluding soft/hard-drop and combo
bonuses, which are out of scope) is a fixed base per number of simultaneous lines,
multiplied by a level factor:

| Lines cleared | Name   | Base points |
|---------------|--------|-------------|
| 0             | (none) | 0           |
| 1             | single | 40          |
| 2             | double | 100         |
| 3             | triple | 300         |
| 4             | tetris | 1200        |

The base values are super-linear on purpose (a tetris pays 1200 vs. 4×40 = 160 for four
singles) — the classic incentive to clear four at once. In NES Tetris the multiplier is
`(level + 1)` with a 0-based level; the AC frames the base table as "the standard
40/100/300/1200 values (**times level factor**)", i.e. the returned value is
`base × levelFactor`, and at a level factor of **1** the function returns exactly the base
table. The Design phase pins down the multiplier convention and its default.

## Testing conventions observed

- Vitest, colocated `lib/<name>.test.ts`, `describe`/`it`/`expect`. Run via
  `npm run test` (`vitest run`).
- Sibling `line-clear.test.ts` groups cases with `describe` blocks by concern ("counts",
  "collapse", "purity") and uses small local helpers. A scoring test is simpler — no board
  fixtures needed — but should mirror the structure: a block asserting **each tier**
  (0/1/2/3/4) and a block for the **level factor** scaling.
- The AC dictates the headline tests: assert each of 40/100/300/1200 and **zero for a
  no-clear lock** (`cleared === 0`).

## Constraints / house style

- **Pure, total, framework-free.** Scalar in, scalar out. No board mutation, no imports
  beyond types/constants. Deterministic — same inputs, same output (this underpins the
  determinism harness of T-002-03-04, which asserts identical `score` across two runs).
- **Verb-first export name** to match `emptyBoard`, `lockPiece`, `spawnPiece`,
  `applyGravity`, `clearLines`. The AC literally names the function `scoreFor(lines)`.
- **Named constants** for the base table (like `COLS`/`ROWS`), not magic numbers scattered
  in the function body.

## Open questions (resolved in Design)

1. **Signature.** AC writes `scoreFor(lines)` but also says "times level factor" — so a
   `level` (or `levelFactor`) parameter is needed. Design decides: second parameter,
   defaulted so `scoreFor(lines)` alone yields the base table.
2. **Level convention.** NES uses `base × (level + 1)` with 0-based level; a 1-based
   `level` would use `base × level`. Design picks one and documents the mapping to the
   "level factor" wording so T-002-03-03 wires it unambiguously.
3. **Out-of-range `lines`.** `clearLines` only ever yields 0..4, but a total function
   should define 5+ (and negative). Design decides between a lookup table (undefined →
   guard) and an explicit clamp/throw.
4. **File name.** No existing `scoring.ts`. Candidates: `scoring.ts`, `score.ts`. Design
   picks (leaning `scoring.ts`, single lowercase word like `gravity.ts`/`collision.ts`).
