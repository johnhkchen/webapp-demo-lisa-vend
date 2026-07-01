# Review — T-002-02-01: collision-detection

Handoff document. What changed, how it was verified, what a reviewer needs to know without
reading every diff. Committed as `c037339`.

## Outcome

Collision detection is now a pure, framework-free gate in a new `lib/collision.ts`. It exports
`collides(board, type, pos, rot)` — the boolean every future move (left/right, soft/hard drop,
rotate, spawn) will consult — and a helper `pieceCells(type, pos, rot)` that resolves a piece's
absolute board cells. A table-driven Vitest suite (`lib/collision.test.ts`) exercises 16 placement
cases plus helper and no-mutation guards. **Acceptance criterion met.**

## Acceptance criterion — clause by clause

> `collides(board, piece, pos, rot)` returns `true` for out-of-bounds and overlap cases and
> `false` for legal placements across a table-driven test.

| Clause | Where | Status |
|---|---|---|
| `true` for **out-of-bounds** | CASES rows: off-left (#5), off-right (#6), below-floor (#7), above-top (#8), I vertical clip (#11), 2×2 past-floor (#14) | ✓ |
| `true` for **overlap** | row "overlaps a settled cell" (#9) | ✓ |
| `false` for **legal placements** | rows #1–4, #10, #12, #13, #15, #16 | ✓ |
| **table-driven** test | single `CASES: Case[]` array driven by `it.each(CASES)` | ✓ |

Signature note: the AC's `piece` is realized as the `TetrominoType` — only the shape identity is
intrinsic; `pos`/`rot` are separate so a hypothetical placement can be tested without mutating a
`Piece`. Rationale in `design.md` (Decision 1). If a reviewer prefers a `Piece`-taking overload,
it wraps `collides` trivially and is noted as deferred, not blocked.

## What changed

### Added
- **`lib/collision.ts`** (~70 lines) — pure logic. `pieceCells` (offsets translated by anchor,
  returns fresh `Point`s, no aliasing of the shared shape table) and `collides` (dimensions read
  from the board; bounds test short-circuits *before* the array index via `.some`, so an
  out-of-range `pos` returns `true` rather than throwing). Types via `import type` from `./types`;
  reads `cellsFor` from `./tetrominoes`. Named exports only, house doc-comment style.
- **`lib/collision.test.ts`** (~90 lines) — Vitest. `keyOf`/`asSet` set helpers and a `settle`
  fixture helper (mirrors the `board[y][x] = type` idiom in `board.test.ts`). `pieceCells`
  describe (translation + no-mutation), the 16-row `CASES` table for `collides`, and a
  board-not-mutated guard.
- **`docs/active/work/T-002-02-01/{research,design,structure,plan,progress,review}.md`**.

### Not changed (deliberately)
- `lib/types.ts`, `lib/tetrominoes.ts`, `lib/board.ts`, `lib/constants.ts` — collision only
  *reads* them; no new type or data needed.
- `components/`, `app/`, `eslint.config.mjs`, `tsconfig.json`, `package.json` — untouched. No new
  dependency. Ticket/story/epic frontmatter left for Lisa.

## Verification

```
npm test   → Test Files 5 passed (5) · Tests 42 passed (42)
npm run lint → clean (--max-warnings 0)
```

The 42 total includes the pre-existing board/tetromino suites — no regression, only new files.
Boundary arithmetic is bracketed from both sides: last-legal vs first-illegal at the right wall
(#3 `x:8` false / #6 `x:9` true) and the floor (#4 `y:18` false / #7 `y:19` true), so an
off-by-one in the exclusive bound would fail a test.

## Design decisions a reviewer should know

- **Dimensions from the board, not `COLS`/`ROWS`.** Odd-sized fixtures (2×2 rows #13/#14) work,
  and `collides` answers about the board it was handed. Empty board is handled defensively
  (`width = 0`).
- **Bounds before index.** `x/y` range is checked before `board[y][x]`, so the predicate never
  reads `undefined` or throws on out-of-range input — a hard contract for the movement callers.
- **`pieceCells` extracted, not inlined.** Absolute-cell resolution is needed again by the
  renderer and lock/merge; exposing it now gives those tickets a tested seam.

## Open concerns / limitations

- **Above-the-top (`y < 0`) counts as a collision.** This is the correct conservative geometric
  primitive, but the **spawn ticket must decide** whether pieces may occupy buffer rows above the
  visible field — if so, it passes a taller board or offsets positions rather than expecting
  `collides` to tolerate negative `y`. Flagged in `design.md` (Decision 4) so the choice is
  explicit, not inherited silently.
- **No wall-kick logic.** By scope, `collides` only answers "does this exact placement fit"; the
  SRS kick *search* (retrying offsets on a failed rotation) is a later ticket that sits above this
  gate.
- **Boolean only, no collision reason.** Deliberate (YAGNI). Widening to a reason enum later is
  non-breaking for callers.
- **Well-formedness assumption.** `collides` assumes a rectangular, `emptyBoard`-shaped board
  (uses `board[0].length` for width). Malformed jagged boards are out of contract — consistent
  with the rest of `lib/`.

## Nothing requiring human intervention

No TODOs left in code, no skipped tests, no failing checks. Ready for the movement/rotation
tickets that depend on this gate.
