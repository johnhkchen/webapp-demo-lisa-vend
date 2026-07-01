# T-003-01-02 — Plan

Ordered, independently-verifiable steps with a commit each. Testing strategy is inline per step.
Baseline before starting: 13 files / 122 tests green; `build`, `lint --max-warnings 0`, `tsc` clean.

## Step 1 — Pure overlay primitive (`lib/overlay.ts` + test)

**Do:**
- Create `lib/overlay.ts` exporting `overlayPiece(board: Board, piece: Piece): Board`:
  copy rows (`board.map(r => r.slice())`), paint `piece.type` at each in-bounds cell from
  `pieceCells(piece.type, piece.position, piece.rotation)`, return the copy. Module docstring in the
  house style (purpose, purity, reuse-of-`pieceCells`, bounds/overlay semantics).
- Create `lib/overlay.test.ts` (node env, relative imports):
  - overlays the 4 piece cells with its type, derived by comparing against `pieceCells`;
  - input board reference is unchanged and still deep-equals its pre-call snapshot (no mutation);
  - settled cells outside the piece survive; a piece cell over a settled cell wins;
  - a piece anchored partly off-grid paints only in-bounds cells and does not throw.

**Verify:** `npx vitest run lib/overlay.test.ts` green; `npx tsc --noEmit` clean.
**Commit:** `feat(T-003-01-02): add pure overlayPiece — paint active piece over a board copy`

## Step 2 — The state hook (`components/useGame.ts`)

**Do:**
- Create `components/useGame.ts` with `'use client'`. Export `DEFAULT_SEED` (stable constant),
  `interface GameView { state; view }`, and `useGame(seed = DEFAULT_SEED)`:
  `useState(() => createInitialState(seed))` + `useMemo(() => overlayPiece(state.board,
  state.active), [state])`. Docstring: holds core state, exposes the composed view, seed is stable
  for hydration, no setter yet (loop is a later ticket).

**Verify:** `npx tsc --noEmit` clean (no dedicated test yet — exercised via the container test in
Step 3, which is where the hook's behavior is observable through the DOM).
**Commit:** `feat(T-003-01-02): add useGame hook holding core state + composed board view`

## Step 3 — Client container + render test (`components/GameContainer.tsx` + test)

**Do:**
- Create `components/GameContainer.tsx` (`'use client'`): `const { view } = useGame();` →
  `<Board board={view} />`.
- Create `components/GameContainer.test.tsx` (`// @vitest-environment jsdom`,
  `@testing-library/react`, `afterEach(cleanup)`):
  - renders `ROWS×COLS` `[data-cell]` squares;
  - exactly 4 are non-empty at start;
  - the filled `(x, y, type)` set equals `pieceCells(active.type, active.position, active.rotation)`
    of `createInitialState(DEFAULT_SEED).active`, each carrying that type — proving the view is
    sourced from the core API, not a reimplementation. (Recompute the DOM `(x,y)` from the flat index
    via `cols`.)

**Verify:** `npx vitest run components/GameContainer.test.tsx` green; `npx tsc --noEmit` clean.
**Commit:** `feat(T-003-01-02): add GameContainer client island rendering the live starting board`

## Step 4 — Mount in the route (`app/page.tsx`)

**Do:**
- Replace `<Board board={emptyBoard(COLS, ROWS)} />` with `<GameContainer />`; remove the now-unused
  `Board`/`emptyBoard`/`COLS`/`ROWS` imports, add `GameContainer`. Update the subtitle copy away from
  "placeholder board". Keep the header/gradient.

**Verify:** `npm run build` succeeds (SSR of the client island has no hydration warning in build);
`npm run lint` clean; full `npm test` = 122 + new tests green.
**Commit:** `feat(T-003-01-02): mount GameContainer in page — live starting board on load`

## Final verification (before Review)

- `npm test` — whole suite green (expect 122 prior + ~5 new across two files).
- `npm run build` — production build passes.
- `npm run lint` — `--max-warnings 0` clean.
- `npx tsc --noEmit` — clean.
- Sanity: `app/page.tsx` renders `<GameContainer />`; the AC ("live starting board with the spawned
  active piece overlaid via the hook's state, from the core API") is demonstrably met by the
  container test.

## Testing strategy summary

- **Unit (node):** `overlayPiece` — the only new pure logic; full behavioral coverage incl.
  immutability and bounds.
- **Integration (jsdom):** `GameContainer` — proves mount + overlay-from-core end to end through the
  real `Board`/`Cell` render path.
- **Not tested (by design):** the hook in isolation (observed via the container), and any game-loop /
  input behavior (out of scope — no loop exists yet). Visual color fidelity stays out (jsdom can't
  compute styles; the class contract is asserted, as in T-003-01-01).

## Risks & mitigations

- **Hydration mismatch** from a non-deterministic seed → mitigated by a fixed `DEFAULT_SEED`.
- **Accidental board mutation** in the overlay → covered by the no-mutation test.
- **AC "reimplementation" trap** → the container test asserts the filled set equals `pieceCells` of
  the core-spawned piece, so any divergence from the core fails the test.
- **`'use client'` placement** → isolated to `GameContainer`/`useGame`; `page.tsx` stays server.
