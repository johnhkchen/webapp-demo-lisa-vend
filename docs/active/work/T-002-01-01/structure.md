# Structure — T-002-01-01: board-model-and-core-types

The blueprint: exact files created/modified, their public interfaces, and the ordering of
changes. Not code — the shape of the code. Grounded in `design.md`.

## Change set overview

| File | Action | Purpose |
|---|---|---|
| `lib/types.ts` | **create** | Core pure types: `Point`, `TetrominoType`, `RotationState`, `Cell`, `Board`, `Piece` |
| `lib/board.ts` | **create** | `emptyBoard(width, height): Board` constructor |
| `lib/board.test.ts` | **create** | Unit test: dimensions, emptiness, non-aliasing, `(w,h)` order |
| `package.json` | **modify** | Add `vitest` devDependency + `"test": "vitest run"` script |
| `package-lock.json` | **modify** (generated) | Lockfile updated by `npm install -D vitest` |

No changes to `components/`, `app/`, `eslint.config.mjs`, `tsconfig.json`,
`next.config.ts`, `postcss.config.mjs`. No barrel file. No ticket/story/epic frontmatter.

## File: `lib/types.ts` (new)

Pure type module — **zero runtime output** (only `type`/`interface` declarations, erased by
the compiler). No imports. Framework-free by construction.

Public interface (all `export`ed):

```
Point          interface { x: number; y: number }        // x = column, y = row
TetrominoType  type "I"|"O"|"T"|"S"|"Z"|"J"|"L"           // the fixed 7-id alphabet
RotationState  type 0 | 1 | 2 | 3                          // the 4 SRS orientations
Cell           type TetrominoType | null                   // null = empty, else occupying id
Board          type Cell[][]                               // board[y][x]; outer=rows, inner=cols
Piece          interface { type: TetrominoType;            // active falling piece:
                            rotation: RotationState;       //   identity + orientation + anchor
                            position: Point }              //   (occupied cells derived later)
```

Doc comments:
- File header: this is the pure data substrate every `lib/` module builds on; framework-free
  per CLAUDE.md; shape data (T-002-01-02) and RNG (T-002-01-03) build on these types.
- `Board`: state that `board[y][x]` is row-major (outer=rows=height, inner=cols=width) and
  note it diverges intentionally from the renderer's flat array.
- `Cell`: note the name distinct from the `components/Cell.tsx` React component.
- `Piece`: note that concrete occupied cells are resolved from T-002-01-02's shape tables,
  not stored here.

## File: `lib/board.ts` (new)

Behavior module. Imports **types only** from `./types`.

```
import type { Board, Cell } from "./types";

export function emptyBoard(width: number, height: number): Board
```

- Body: `Array.from({ length: height }, () => Array.from({ length: width }, () => null))`.
  Fresh inner array per row (no aliasing). Each cell initialized `null` (typed `Cell`).
- `import type` (not `import`) so the compiler fully erases it — `board.ts` emits only the
  function, keeping the module runtime-pure and satisfying `isolatedModules`.
- Doc comment: pure constructor, arg order `(width, height)` mirroring `emptyBoard(w,h)` /
  `COLS,ROWS`; returns an all-`null` grid; callers pass `emptyBoard(COLS, ROWS)`.

## File: `lib/board.test.ts` (new)

```
import { describe, it, expect } from "vitest";
import { emptyBoard } from "./board";
```

Test structure (one `describe("emptyBoard")` with focused `it` blocks):

1. `it("has height rows and width columns")` — `emptyBoard(10, 20)`: assert
   `board.length === 20`, and `board.every(row => row.length === 10)`.
2. `it("is entirely empty (all null)")` — assert `board.flat().every(c => c === null)`.
3. `it("does not alias rows")` — construct, set `board[0][0] = "I"`, assert
   `board[1][0] === null` and only `board[0][0]` changed.
4. `it("respects (width, height) argument order")` — `emptyBoard(3, 5)`: assert
   `board.length === 5` and `board[0].length === 3` (guards a transpose bug).

Import path is relative (`./board`), matching the module under test; no `@/*` needed since
same-directory. Being under `lib/**`, the file is subject to the purity lint rule — it imports
only `vitest` (allowed), proving the substrate needs no framework to test.

## File: `package.json` (modify)

- `devDependencies`: add `"vitest": "^4.1.9"` (latest resolved; caret for patch/minor).
- `scripts`: add `"test": "vitest run"` (single non-watch run, CI-friendly). Existing
  `dev`/`build`/`start`/`lint` untouched.

No production dependency added — `vitest` is dev-only, so the app bundle and deploy are
unaffected.

## Ordering of changes (why this sequence)

1. **Install runner** (`npm install -D vitest`) → mutates `package.json` + lockfile. Do first
   so the test file's `vitest` import type-resolves before anything references it.
2. **`lib/types.ts`** → no dependencies; everything else imports it.
3. **`lib/board.ts`** → depends on `types.ts`.
4. **`lib/board.test.ts`** → depends on `board.ts` + `vitest`.
5. **Verify**: `npm run test` (green), `npm run lint` (zero warnings, purity intact),
   `npm run build` (whole-tree type-check passes with test file present).

Steps 2–4 could be one commit; the plan commits the type/logic/test together as the atomic
"substrate" unit, with the runner-setup as its own logically-separable commit if clean, else
folded in (see `plan.md`).

## Interfaces other tickets will consume (contract stability)

- `T-002-01-02` imports `TetrominoType`, `RotationState`, `Point` from `@/lib/types` to key
  its shape tables and offsets. → keep these names/spellings stable.
- `T-002-01-03` imports `TetrominoType` to type the 7-bag output.
- `S-003` (collision/move) imports `Board`, `Cell`, `Piece`, `Point`, `emptyBoard`.
- These names are the ticket's published surface; the test locks `emptyBoard`'s behavior.
