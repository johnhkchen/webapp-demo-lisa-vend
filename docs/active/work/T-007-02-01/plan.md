# Plan — T-007-02-01 ghost-projection-core

## Overview

Two new files, one atomic commit. The implementation is trivial (two delegating one-liners);
the substance is the test suite proving the two AC invariants. Verify with `npm test`,
`npm run lint`, `npm run build`.

## Steps

### Step 1 — Write `lib/ghost.ts`

- Add the module JSDoc header in `overlay.ts` style (purpose, reuse note, coordinate
  convention, scope boundary).
- Import `Board, Piece, Point` (types), `hardDrop` (movement), `pieceCells` (collision).
- Implement `ghostPiece(board, piece): Piece` → `return hardDrop(board, piece);`
- Implement `ghostCells(board, piece): Point[]` → resolve `pieceCells` of the `ghostPiece`
  landing.
- Verify: `npm test` (existing suites still green — no behavior change to core), `npm run
  lint` (purity boundary, no unused imports).

### Step 2 — Write `lib/ghost.test.ts`

Mirror `overlay.test.ts` conventions. Cases:

`ghostPiece`:
1. **Coincides with hardDrop** — `expect(ghostPiece(board, T_PIECE)).toEqual(hardDrop(board,
   T_PIECE))`. The core AC invariant, asserted directly against the reused primitive.
2. **Lands on the floor on an empty board** — resolve `pieceCells` of the result; assert the
   max `y` equals `ROWS - 1` (piece rests on the bottom).
3. **Lands atop a settled stack** — fill the bottom row(s) in the piece's drop columns;
   assert the landing rests immediately above the stack (cross-check via `pieceCells`; assert
   no resolved cell coincides with a filled cell).
4. **Already-resting piece is a no-op** — drop `T_PIECE` to rest first (`const rested =
   hardDrop(...)`), then `expect(ghostPiece(board, rested)).toBe(rested)` (same reference).
5. **Non-mutation** — snapshot board + piece before; assert unchanged after.

`ghostCells`:
6. **Four legal cells** — assert length 4 and every returned cell is `null` on the board
   (the "never overlaps settled cells" invariant), using a board with settled cells in the
   drop column so the assertion is meaningful.
7. **Equals pieceCells of ghostPiece** — reuse check (no hard-coded coordinates).
8. **Fresh Points** — mutate a returned point; assert the shared shape table / a second call
   is unaffected (guards against aliasing).

- Verify: `npm test` — the new `ghost` suite is green; full suite stays green.

### Step 3 — Full verification + commit

- `npm test` (all suites green, including new ghost suite).
- `npm run lint` (zero warnings — `--max-warnings 0`).
- `npm run build` (production build green, per CLAUDE.md "must pass before deploy").
- Commit atomically: `feat(ghost): add pure ghost-projection core (lib/ghost.ts)`.

## Testing strategy

- **Unit only.** This is a pure `lib/` module; unit tests are the complete verification
  surface. No integration/render test here — that arrives with T-007-02-02, whose AC covers
  Board/Cell ghost rendering.
- **Cross-check, don't hard-code.** Every positional assertion is derived from `hardDrop` or
  `pieceCells`, so the tests can't silently encode a wrong coordinate and are robust to shape
  or spawn-column changes (matches the house style in `overlay.test.ts`).
- **The two AC invariants each get a dedicated, direct assertion**: coincides-with-hardDrop
  (case 1) and never-overlaps-settled (case 6). The suite is "ghost test suite green" ⇒ AC
  met.

## Verification criteria (Definition of Done)

- `lib/ghost.ts` exports `ghostPiece` and `ghostCells`; both delegate (no shape/collision
  math re-implemented).
- `lib/ghost.test.ts` green, covering both invariants + edges (floor, stack, already-resting,
  non-mutation, fresh points).
- `npm test`, `npm run lint`, `npm run build` all pass.
- No files changed outside the two new ones (no `game.ts`/component/config edits).

## Risks / notes

- **Trivial-logic risk**: the temptation is to skip a real suite because the code is two
  lines. The value is precisely the invariant tests — they lock the ghost to `hardDrop` so a
  future refactor of either can't silently desync ghost from an actual drop.
- **Reference-equality edge (case 4)** depends on `hardDrop`'s documented no-op contract
  (returns the input reference for an already-resting piece). If that contract ever changes,
  this test flags it — which is the desired coupling, not a fragility.
- No new deps, no config, no external surface. Lowest-risk ticket shape in the epic.
