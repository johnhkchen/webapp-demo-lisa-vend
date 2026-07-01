# Structure — T-002-02-03: SRS rotation with wall kicks

## File-level changes

| File | Change | Purpose |
|------|--------|---------|
| `lib/rotation.ts` | **create** | Kick tables + `rotate`/`rotateCW`/`rotateCCW` |
| `lib/rotation.test.ts` | **create** | Table-driven SRS kick coverage |

No existing files are modified. `movement.ts`'s scope comment already forward-references this
ticket, so no edit there. No changes to `types.ts` (`RotationState`/`Piece` suffice), `collision.ts`,
or `tetrominoes.ts`.

## `lib/rotation.ts` — internal organization (top to bottom)

1. **Module doc comment** — same house style as the other `lib/` files: purpose, pure/framework-
   free note, coordinate convention, and the **critical y-down negation note** (published tables
   are y-up; stored values are negated). State the scope boundary (rotation only; no gravity/lock/
   T-spin scoring).

2. **Imports**
   ```ts
   import type { Board, Piece, Point, RotationState, TetrominoType } from "./types";
   import { collides } from "./collision";
   ```
   (Note: `cellsFor` is *not* needed directly — `collides` resolves cells internally.)

3. **`RotationDir` type** — `export type RotationDir = "cw" | "ccw";`

4. **Local `p` helper** — `const p = (x, y): Point => ({x, y});` (mirrors `tetrominoes.ts`) to keep
   the tables terse.

5. **Kick tables** — three `Readonly<Record<string, readonly Point[]>>` constants keyed by
   `"from>to"`:
   - `KICKS_JLSTZ` — 8 entries (`0>1,1>0,1>2,2>1,2>3,3>2,3>0,0>3`), y-down, y-up source in a
     trailing comment per line.
   - `KICKS_I` — 8 entries, the I-specific table (±2 offsets), y-down.
   - `KICKS_O` — 8 entries each `[p(0,0)]` (rotation-invariant).
   Exported (named) so tests can assert table shape/length and reviewers can audit them.

6. **`kickTableFor(type)`** — internal selector: `O→KICKS_O`, `I→KICKS_I`, else `KICKS_JLSTZ`.

7. **`transitionKey(from, to)`** — internal: returns the `` `${from}>${to}` `` key. Trivial but
   named for readability at the call site.

8. **`rotate(board, piece, dir)`** — the exported algorithm (see design). Computes `to` via
   `(from+1)&3` / `(from+3)&3` cast to `RotationState`; iterates the kick list; returns fresh
   `Piece` on first non-colliding candidate, else the input reference.

9. **`rotateCW` / `rotateCCW`** — one-line exported wrappers delegating to `rotate`.

### Public interface (exports)

```ts
export type RotationDir = "cw" | "ccw";
export const KICKS_JLSTZ: Readonly<Record<string, readonly Point[]>>;
export const KICKS_I:     Readonly<Record<string, readonly Point[]>>;
export const KICKS_O:     Readonly<Record<string, readonly Point[]>>;
export function rotate(board: Board, piece: Piece, dir: RotationDir): Piece;
export function rotateCW(board: Board, piece: Piece): Piece;
export function rotateCCW(board: Board, piece: Piece): Piece;
```

### Internal (not exported)

`p`, `kickTableFor`, `transitionKey`.

## Contracts / invariants (must hold, asserted by tests)

- **No-op contract**: all-kicks-fail ⇒ returns the *same* `Piece` reference (`===`).
- **Fresh on success**: a successful rotate returns a new object (`!==` input), with `rotation`
  set to `to` and `position` set to the winning candidate.
- **Purity**: never mutates `board`, `piece`, or the kick tables. `board`/`piece` JSON snapshots
  unchanged after calls.
- **Type/dims agnosticism**: dimensions come from `board` via `collides`; no `COLS`/`ROWS` use.
- **Rotation field stays in `0|1|2|3`** (arithmetic guarantees range; cast documents it).

## `lib/rotation.test.ts` — structure

Reuse the repo's local helpers (copied per-file, as the other tests do): `keyOf`/`asSet`,
`settle(board, cells, type)`, and `emptyBoard` from `./board`.

Test groups:

1. **Kick-table shape** — each of the three tables has the 8 expected keys; every entry has
   length 5 (JLSTZ, I) or 1 (O); test 1 of every entry is `(0,0)`.
2. **Open-space rotation** — on an empty board, `rotateCW`/`rotateCCW` advance `rotation`
   `0→1→2→3→0` and `0→3→2→1→0`, position unchanged (test 1 wins), fresh object each time.
3. **CW/CCW inverse** — `rotateCCW(rotateCW(p)) deep-equals p` in open space.
4. **Wall kick (JLSTZ)** — place a piece flush to a wall where the naive rotation clips, assert the
   returned `position` equals the guideline kicked position.
5. **Floor kick** — piece resting so a rotation would poke below the floor; assert it kicks up.
6. **I-piece kicks** — a horizontal I flush to a wall rotating vertical, assert the ±2 kick lands
   at the guideline position; plus an I floor/wall case.
7. **T-spin corner kick** — build the canonical T-spin-double slot with `settle`; a blocked T
   rotates via test 5 into the slot; assert exact final `position`.
8. **Fully-blocked rotation** — surround the piece so all 5 tests collide; assert
   `rotate(...) === piece` (no-op) and that a same-cell rotation into a filled well is rejected.
9. **O rotation** — advances `rotation` with unchanged cells; buried O (single `(0,0)` test into a
   filled space) no-ops.
10. **Non-mutation** — JSON snapshots of `board` and `piece` unchanged across success and no-op.

Each geometric case is expressed as a row in an `it.each(CASES)` table where practical: `{name,
board, piece, dir, expected: Piece | "noop"}`; `"noop"` asserts reference equality, otherwise
assert deep-equal position + rotation.

## Ordering of changes

1. Write `lib/rotation.ts` (data + algorithm).
2. Write `lib/rotation.test.ts`.
3. `npm run test` (all green) → `npm run lint` → `npm run build` typecheck.
4. Commit.

No cross-file ordering hazards: purely additive, and dependency tickets
(T-002-02-01 collision, T-002-01-02 shapes) are already merged.
