# Plan — T-002-02-04: gravity-and-lock-on-landing

Ordered, independently verifiable steps. One atomic commit at the end (single small module +
tests, matching the sibling tickets' commit granularity).

## Step 1 — `lib/gravity.ts`

Create the module in house style.

1. Doc header: purpose (one gravity step + lock-on-landing), pure/framework-free note, coordinate
   convention (`board[y][x]`, top-left origin), and a scope boundary: reuses `softDrop` for the
   down-step and `pieceCells` for the merge; does **not** clear lines, respawn/touch the bag, apply
   lock-delay, or hard-drop.
2. Imports: `type { Board, Piece }` from `./types`; `pieceCells` from `./collision`; `softDrop`
   from `./movement`.
3. Types: `Fell { locked: false; board; piece: Piece }`, `Locked { locked: true; board; piece: null }`,
   `GravityResult = Fell | Locked`.
4. `lockPiece(board, piece): Board` — `board.map(row => row.slice())`, stamp each
   `pieceCells(...)` cell to `piece.type`, return the copy.
5. `applyGravity(board, piece): GravityResult` — `softDrop`; if reference changed → `Fell` (board
   same ref, piece = dropped); else → `Locked` (board = `lockPiece(...)`, piece = null).

**Verify:** `npx tsc --noEmit` (or the build) is clean; exports resolve.

## Step 2 — `lib/gravity.test.ts`

Vitest suite mirroring `movement.test.ts`. Reuse `keyOf`/`asSet`/`settle` helpers.

- **`lockPiece`**
  - stamps exactly the 4 derived cells with the type; a spot-check of a non-piece cell stays
    `null`; count of non-null cells is exactly 4.
  - returns a fresh board; input board unchanged (`JSON.stringify` snapshot).
- **`applyGravity` falling** (empty 10×20 board)
  - one call: `locked === false`, `piece.position.y` increased by 1, `board` is the *same
    reference*, `piece` is a fresh object (`!== input`).
- **`applyGravity` landing on the floor**
  - place an `O` at `y = 18` (occupies rows 18,19 — resting on the floor). One `applyGravity`:
    `locked === true`, `piece === null`, and the O's four cells in the returned board equal `"O"`.
- **`applyGravity` landing on a stack**
  - settle a cell directly beneath a mid-board piece so the down-step is blocked above the floor;
    assert it locks (semantics come from `softDrop`, not the floor).
- **AC drive** — the acceptance test:
  1. Start a piece near the bottom (or loop `applyGravity` from spawn until `locked`).
  2. Loop: `let r = applyGravity(board, piece)`; while `!r.locked` advance `board`/`piece` from
     `r` and step again. Cap iterations (≤ ROWS) as a guard.
  3. After the loop: assert `r.locked === true` and `r.piece === null` (**active piece cleared for
     respawn**), and that `r.board` gained exactly the piece's 4 cells (`asSet(pieceCells(...))`
     all `=== piece.type`; total non-null count == 4) — **board gains the piece's 4 cells**.
- **no-mutation guards** — snapshot board+piece around a falling step *and* a locking step; the
  input board must be byte-identical after a lock (only the returned copy differs).

**Verify:** `npm test` — new suite passes, prior 67 tests still pass (expect ~7 file / ~77+ tests).

## Step 3 — Lint

`npm run lint` (`eslint --max-warnings 0`). Fix any style/`import` ordering issues. Confirm no
React/Next import crept in (respect the `lib/**` boundary).

## Step 4 — Commit

Single atomic commit:
```
feat(T-002-02-04): add one-step gravity + lock-on-landing merge with vitest
```
Includes `lib/gravity.ts`, `lib/gravity.test.ts`, and the RDSPI work artifacts.

## Step 5 — progress.md, then review.md

Record what was done and any deviations in `progress.md`; then write `review.md` (handoff:
changes, test coverage, open concerns). Stop after review — Lisa handles phase transitions.

## Testing strategy summary

- **Unit** covers everything here (pure functions). No integration/e2e — there is no reducer or
  render layer wired to gravity yet.
- **AC coverage:** the "AC drive" test is the literal acceptance criterion; floor- and stack-
  landing tests bracket the landing surface; no-mutation guards protect the copy-on-write contract.
- **Verification criteria:** `npm test` green (no regressions), `npm run lint` clean, AC test
  asserts both post-conditions (board +4 cells, active piece null).

## Risks / mitigations

- **Landing on a settled cell vs. the floor** could diverge if implemented ad hoc → mitigated by
  reusing `softDrop` (one definition of "can fall"); both are tested.
- **Accidentally mutating the input board** on lock → mitigated by copy-on-write + explicit
  no-mutation snapshot test on the locking path.
- **AC test infinite loop** if `locked` never fires → iteration cap (≤ ROWS) makes a logic bug fail
  fast instead of hanging.
