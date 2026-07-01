# Research — T-002-01-01: board-model-and-core-types

Descriptive map of the codebase as it bears on defining the framework-free data
substrate (board grid, cell, piece, coordinate types + `emptyBoard`). No solutions here.

## Ticket in one line

Define the pure `lib/` data types — `Board`, `Cell`, `Piece`, `Point` — plus an
`emptyBoard(w,h)` constructor that returns a correctly-dimensioned all-empty grid, with a
unit test asserting dimensions and initial emptiness, and **no React/Next import present**.

## Where this sits

- Parent story **S-002-01** (`tetromino-and-rng-foundations`), first of three tickets:
  - **T-002-01-01** (this) — board model + core types.
  - **T-002-01-02** — 7 tetrominoes × 4 SRS rotation states as pure shape data.
  - **T-002-01-03** — seeded PRNG + 7-bag generator.
- Epic **E-002** (`pure-game-core-engine`): the framework-free rules engine in `lib/`.
  "Done looks like" a `lib/` API that spawns/rotates/collides/gravity/clears/scores
  deterministically. This ticket lays the **substrate every other module builds on**.
- `depends_on: [T-001-03-01]` — the scaffold/skeleton track (E-001) is complete: app builds,
  renders a placeholder board, lint gate is green.

## Current `lib/` reality

Only one module exists:

- `lib/constants.ts` — exports `COLS = 10`, `ROWS = 20`. Documented as the seed of the `lib/`
  track: "the real game logic (tetrominoes, collision, scoring, RNG) lands in later epics and
  imports from here." Pure, framework-free, no side effects. This is the single source of
  truth for playfield dimensions; `components/Board.tsx` already imports it.

No `lib/board.ts`, `lib/types.ts`, no types, no board representation exist yet. Confirmed via
directory listing — `lib/` holds exactly `constants.ts`.

## How `lib/` is consumed today

- `components/Board.tsx` imports `{ COLS, ROWS }` and builds a flat
  `Array.from({ length: COLS * ROWS })` purely for **rendering** a placeholder grid — it has
  **no board data model**; each position is an anonymous empty `Cell` component. The board's
  *state* representation does not exist yet; that is exactly this ticket's job.
- `components/Cell.tsx` is a stateless, props-less presentational component. Note the **name
  collision to keep straight**: `Cell` the React *component* (a rendered square) vs. `Cell`
  the *lib type* this ticket introduces (a stored grid value). They live in different
  directories/namespaces (`components/` vs `lib/`) and never import each other.

## Constraints binding this ticket

1. **Purity boundary is lint-enforced.** `eslint.config.mjs` has a scoped
   `no-restricted-imports` rule over `lib/**/*.{ts,tsx}` forbidding `react`, `react-dom`,
   `next`, and their subpaths (added by T-001-02-02). Any `lib/` file importing a framework
   fails `npm run lint`. The AC's "no React/Next import" is therefore machine-checked.
2. **Zero-warning lint gate.** `package.json` `lint` script is `eslint --max-warnings 0`
   (T-001-01-02). Any warning fails CI.
3. **`next build` type-checks the whole tree.** `tsconfig.json` `include` is `**/*.ts` /
   `**/*.tsx` with `strict: true`. Every `.ts` file — including any new test file — is
   type-checked at build. So a test file that imports a test runner needs that runner's types
   resolvable, or the build breaks.
4. **No test runner exists.** `package.json` has `dev`/`build`/`start`/`lint` scripts only —
   **no `test` script, no vitest/jest, no jsdom** in dependencies. Prior review artifacts
   (T-001-03-01, T-001-02-02) repeatedly and explicitly deferred standing up a runner to
   "when E-002's pure `lib/` logic lands" and named **Vitest** as the intended runner. This
   ticket is that moment: its AC *requires* a unit test, so a runner must be introduced here.
5. **`@/*` path alias** → repo root (`tsconfig.json` `paths`). `lib/` modules can be imported
   as `@/lib/...`; tests can use the same.

## Toolchain facts

- Next 16.2.9, React 19.2.4, TypeScript 5, ESLint 9 (flat config), Tailwind v4.
- `target: ES2017`, `module: esnext`, `moduleResolution: bundler`, `strict: true`,
  `isolatedModules: true`, `esModuleInterop: true`.
- npm registry is reachable in this environment; `vitest@4.1.9` resolves. Baseline
  `npm run lint` exits 0 (verified).

## Domain facts relevant to the types (SRS / classic Tetris)

- Playfield is `COLS × ROWS` = 10 × 20 (matrix; classic guideline uses a 20-row visible field
  plus hidden spawn rows, but this codebase's constants model a 10×20 field — kept as-is).
- The 7 tetrominoes are `I, O, T, S, Z, J, L` — a fixed 7-member id set the whole engine keys
  on (referenced by T-002-01-02 "all 7 pieces" and T-002-01-03 "all 7 tetromino ids").
- SRS rotation has exactly **4 rotation states** per piece (0/R/2/L, i.e. 0–3). T-002-01-02
  owns the actual per-rotation cell offsets; this ticket only owns the *types* those data
  will inhabit.
- A settled/locked cell needs to remember **which piece color** filled it (for rendering and
  for nothing-vs-something line-fullness checks) — so a cell is naturally "empty **or** a
  tetromino id", not a bare boolean.

## Boundary with sibling tickets (what is NOT this ticket)

- **Shape/offset data** for the 7 pieces and their 4 rotations → T-002-01-02. This ticket may
  define the *types* a `Piece` and rotation state inhabit, but must not encode shape tables.
- **RNG / 7-bag** → T-002-01-03. No randomness here.
- **Collision, movement, gravity, clear, scoring** → later stories S-003/S-004. `emptyBoard`
  is a pure constructor only; no operations on the board beyond construction.

## Open assumptions to resolve in Design

- Board orientation: row-major `board[y][x]` vs column-major; `emptyBoard(w,h)` arg order.
- `Cell` representation: `TetrominoType | null` vs a boolean vs a tagged object.
- How much of `Piece` to define now (identity + rotation + position) without stepping on
  T-002-01-02's shape data.
- File split: one module vs `types.ts` + `board.ts`; test file location under the lint/build
  constraints above.
- Test runner choice and wiring (Vitest, per prior artifacts) and its interaction with
  `next build`'s whole-tree type-check.
