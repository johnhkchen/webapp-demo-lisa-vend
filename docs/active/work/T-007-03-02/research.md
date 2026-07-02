# Research — T-007-03-02 hold-key-and-display

## Ticket in one line

Bind the **C** key in `GameContainer` to dispatch `'hold'`, and render the held piece in a
visible hold box so the swap and its once-per-drop block are observable. Advances P4.

## What already exists (the core is done)

T-007-03-01 (`phase: done`) landed the entire hold *logic* in the pure core. Nothing about the
rules needs to change here — this ticket is purely the React/render seam that surfaces it.

- **`lib/game.ts`**
  - `GameState` already carries `hold: TetrominoType | null` (held-piece identity, `null` until
    the first hold) and `canHold: boolean` (the once-per-drop lock flag).
  - `Input` union already includes `"hold"`.
  - `step(state, "hold")` → `hold(state)`: no-op when `!canHold`; otherwise stashes
    `active.type` into `hold`, spawns the incoming id fresh (held id, or a fresh bag draw when
    the slot is empty), sets `canHold = false`, and re-checks top-out via `collides`.
  - `canHold` resets to `true` only at the lock site inside `descend` (one hold per drop).
  - Once `gameOver` is set, every input — including `"hold"` — is a no-op.
- **`lib/game.test.ts`** — `describe("hold slot (AC)")` (lines 177–266) already asserts the full
  core behaviour: first hold on empty slot, occupied-slot swap, bag non-consumption on swap,
  second-hold no-op (same reference), allowance reset on lock, no reset on a non-locking tick,
  game-over no-op, and purity (input state untouched).

**Implication:** the core surface is complete and tested. This ticket adds (1) a key binding and
(2) a display component; it must not re-implement or duplicate any rule.

## The React seam

- **`components/useGame.ts`** — `useGame(seed)` returns `{ state, view, ghost, dispatch }`.
  - `state` is the raw `GameState`, so `state.hold` and `state.canHold` are already exposed to
    any consumer — no hook change is required to read the held piece or the lock flag.
  - `dispatch(input)` runs `step` via a functional `setState`; it is generic over `Input` and
    referentially stable. Dispatching `"hold"` needs **no** hook change (same as the drop inputs).
- **`components/GameContainer.tsx`** — the single `"use client"` island.
  - `KEY_TO_INPUT: Record<string, Input>` maps keys → inputs. Currently: arrows, `x`/`z`
    (rotate), `ArrowDown` (soft), `" "` (hard). **C is not mapped yet.**
  - `onKeyDown` looks up `KEY_TO_INPUT[event.key]`, returns if unmapped, special-cases
    `hardDrop` auto-repeat (edge-triggered), else `preventDefault()` + `dispatch(input)`.
  - Renders `<div className="relative"><Board .../><GameOverlay .../></div>`. The hold box must
    slot into this layout.

## Rendering primitives available

- **`components/Board.tsx`** — props-driven CSS grid; flattens `board[y][x]` into one `Cell`
  each. Not directly reusable for a small piece preview (it paints a full playfield matrix), but
  its grid idiom (inline `gridTemplateColumns/Rows`, neon/glass chrome classes) is the pattern to
  mirror.
- **`components/Cell.tsx`** — one square. Holds a **local** `CELL_COLOR: Record<TetrominoType,
  string>` of **literal** `bg-piece-*` class strings (Tailwind v4 only emits literals it finds in
  source — a computed `bg-piece-${type}` is tree-shaken away). `CELL_COLOR` is **not exported**.
  Marks squares with `data-cell` (`null` → `"empty"`).
- **`lib/tetrominoes.ts`** — `cellsFor(type, rotation)` returns the four `Point` offsets within
  the piece's bounding box; `BOUNDING_BOX[type]` is the box side (I→4, O→2, rest→3);
  `TETROMINO_CELLS[type][0]` is the spawn orientation. This is the data a hold preview draws.
- **`app/globals.css`** (E-004) provisions `--color-piece-*` tokens behind the `bg-piece-*`
  utilities. Any preview reuses these — no new color tokens needed.

## No NextPreview exists yet

There is **no** `NextPreview`/`PiecePreview` component in `components/` (the tetrominoes doc
comment mentions a future `NextPreview`, but none is built). So this ticket introduces the first
"draw a single piece in a mini-grid" component. There is no shared preview primitive to reuse;
the pattern must be established here (kept simple enough that a later NextPreview could reuse it).

## Test conventions & a sharp constraint

- **`components/GameContainer.test.tsx`** drives the real hook via `fireEvent.keyDown(window,
  {key})` and reads the DOM. Two helpers are load-bearing:
  - `cells(container)` = `container.querySelectorAll("[data-cell]")`.
  - `filledCoords(container)` maps each `[data-cell]` by **flat index** to `x = i % COLS`,
    `y = floor(i / COLS)` — it assumes **every** `[data-cell]` in the container is a board
    square in row-major order.
  - Ground truth is `expectedAfter(...inputs)` = apply `step` to the default-seed core and read
    the composed `overlayPiece` view.
- **CONSTRAINT:** if the hold box renders squares carrying `data-cell`, it will pollute
  `cells()`/`filledCoords()` and break every existing board assertion (extra nodes shift the flat
  index). The hold-box squares must therefore use a **different** attribute (e.g. `data-hold`)
  and the box a distinct `aria-label`, so board queries stay exact and hold queries can scope.
- Existing tests already cover `"c"` implicitly under "ignores unmapped keys"? — No: that test
  presses `Enter` and `a` only. But once `c` is mapped, nothing pre-existing breaks.
- Test env: `// @vitest-environment jsdom`, `@testing-library/react`, `afterEach(cleanup)`.

## Constraints / assumptions carried in

- Keep game logic in `lib/` pure; components stay presentational and logic-free (CLAUDE.md).
- Tailwind literal-class rule forces static `bg-piece-*` maps (no interpolation).
- Deterministic default seed (hydration-safe) — unchanged here.
- The AC wants the block "felt": the display should visibly signal when `canHold` is false
  (hold spent), not just silently no-op.
- `depends_on: [T-007-03-01]` is satisfied (done). No other in-flight ticket touches
  `GameContainer.tsx` per the DAG, so no lock contention expected.

## Open questions to resolve in Design

1. Where does the color map live — export `CELL_COLOR` from `Cell`, or a local map in the new
   component (consistent with the codebase's "static literal map per module" pattern)?
2. What signals the spent-hold state visually (dim/opacity vs. label)?
3. Layout: flex row (hold box beside board) vs. absolute-positioned panel.
4. Which key spellings to map — `"c"` and `"C"` (mirror the `x`/`X`, `z`/`Z` pattern).
