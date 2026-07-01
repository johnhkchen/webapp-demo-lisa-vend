# T-003-01-02 — Design

Decisions, with rationale, grounded in Research. Three questions to settle: **(A)** where/what is the
overlay, **(B)** the client-boundary shape, **(C)** the seed policy. Then the hook's shape.

## A. The board+active overlay

The core keeps `active` separate from `board` and expects "a renderer [to] overlay the active piece."
No such function exists. The AC forbids "a local reimplementation of rules," so the hook must not
re-derive shape offsets — it must go through the core.

### Options

- **A1 — generic pure primitive `overlayPiece(board, piece): Board` in a new `lib/overlay.ts`.**
  Copies the board, paints `piece.type` into the cells returned by `pieceCells(piece.type,
  piece.position, piece.rotation)`, returns the new matrix. Framework-free, unit-testable in node,
  reuses `pieceCells` (the core API). Generic over any board+piece, so it also serves a future ghost
  piece / next-preview cell. The hook calls `overlayPiece(state.board, state.active)`.
- **A2 — `GameState → Board` selector `composeView(state)` in `lib/game.ts`.** Slightly more
  convenient at the call site, but couples the view helper to the whole `GameState` and grows
  `game.ts` (the reducer) with a rendering concern. Less reusable (can't overlay an arbitrary piece).
- **A3 — overlay inline inside the React hook.** Rejected outright: it would put rule-shaped logic
  (offset resolution, bounds) in `components/`, is harder to unit-test, and reads as "a local
  reimplementation" even if it calls `pieceCells` — the exact thing the AC warns against. Also, the
  `lib/**` boundary can't help here, but the spirit of the layout (pure logic in `lib/`) says no.

**Decision: A1.** A new `lib/overlay.ts` exporting `overlayPiece(board, piece): Board`.

*Why:* it is the minimal, generic, pure primitive; it reuses `pieceCells` (satisfying "read from the
core API"); it keeps `game.ts` focused on the reducer; and it is trivially node-testable independent
of React. The hook's use of it is a single call with zero rule logic — the AC's "not a local
reimplementation" is met structurally, not just by convention.

*Semantics:* copy-on-write (never mutate the input `board` or the shape tables); paint active cells
**over** whatever is there (at spawn there is no overlap, but overlay-wins is the correct rendering
rule and keeps the function total); **bounds-guard** each cell (skip any `x/y` outside the matrix) so
the function never throws on a piece partially off-grid — defensive, though the starting piece is
fully in-bounds. Returns a fresh matrix of the same dimensions.

## B. Client boundary: keep `page.tsx` server, add a `'use client'` container

The hook needs `useState`/`useMemo` → a client component. Two placements:

- **B1 — add `components/GameContainer.tsx` (`'use client'`)** that calls the hook and renders
  `Board`; `page.tsx` stays a server component and renders `<GameContainer />` alongside the static
  header.
- **B2 — mark `page.tsx` itself `'use client'`.** Simpler file count, but pushes the whole page
  (header included) to the client for no benefit and mixes the route entry with stateful UI.

**Decision: B1.** Keep the client surface minimal and the header server-rendered; `GameContainer` is
the single, well-named client island. This also mirrors the target layout (stateful UI in
`components/`, route entry in `app/`) and matches T-003-01-01's own suggestion.

## C. Seed policy: a stable default seed (hydration-safe)

A `'use client'` component still SSRs its first HTML; a non-deterministic seed (`Date.now()`) would
diverge server↔client and trip hydration. The core is deterministic in `seed`.

- **C1 — a fixed default seed constant**, `useGame(seed = DEFAULT_SEED)`. Deterministic, identical on
  server and client, no mismatch. Randomization (per-load variety) is deferred — the AC only needs
  *a* live starting board, and variety belongs with the game-loop/new-game ticket.
- **C2 — random seed on mount** (`useState(() => createInitialState(Date.now()))`). Rejected:
  guaranteed hydration mismatch on the first paint, and unnecessary now.

**Decision: C1.** `useGame(seed?: number)` defaulting to a module constant `DEFAULT_SEED`. Documented
as an intentional deferral; the parameter is already there for the loop ticket to pass a real seed.

## The hook: `components/useGame.ts`

- Signature: `useGame(seed: number = DEFAULT_SEED): { state: GameState; view: Board }`.
- Body: `const [state] = useState(() => createInitialState(seed));` (lazy initializer → the bag/spawn
  run once, not every render). `const view = useMemo(() => overlayPiece(state.board, state.active),
  [state]);`. Return `{ state, view }`.
- No `setState` is exposed yet — there is no loop/input this ticket. Returning `state` (not just
  `view`) gives the next ticket the handle it needs and lets tests assert against the core state. The
  setter will be surfaced when `step`-dispatch lands; leaving it out now keeps the surface honest
  about what this ticket does (render a static starting frame).
- Lives in `components/` (not `lib/` — the eslint boundary forbids React there). Carries `'use
  client'` for clarity even though its only consumer is already a client component.

## `GameContainer` and `page.tsx`

- `components/GameContainer.tsx` (`'use client'`): `const { view } = useGame();` → `<Board
  board={view} />`. Nothing else. Keeps `Board` untouched and dumb.
- `app/page.tsx`: swap `<Board board={emptyBoard(COLS, ROWS)} />` for `<GameContainer />`; drop the
  now-unused `emptyBoard`/`COLS`/`ROWS`/`Board` imports. Update the subtitle copy ("placeholder
  board" is no longer true) — minor, keeps the UI honest.

## Rejected alternatives (summary)

- Overlaying in the hook / re-deriving offsets (A3) — violates the AC's spirit, untestable in node.
- `composeView` on `GameState` in `game.ts` (A2) — less reusable, bloats the reducer module.
- Client-ifying the whole page (B2) — needless client surface.
- Random seed now (C2) — hydration mismatch, premature.

## Consequences

- One new pure module (`lib/overlay.ts`) with its own node test; one new hook + one new client
  container; a three-line `page.tsx` edit. `Board`/`Cell`/`game.ts` are untouched.
- The overlay is generic, so ghost-piece and next-preview rendering reuse it later.
- No game loop yet: the rendered frame is static (the starting position). This is exactly the AC and
  is called out as such so the next ticket knows the loop is its job.
