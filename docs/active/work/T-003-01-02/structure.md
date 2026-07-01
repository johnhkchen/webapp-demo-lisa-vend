# T-003-01-02 — Structure

The blueprint: file-level changes, interfaces, boundaries, ordering. Not code — the shape of it.

## Change set

| File | Action | Purpose |
|------|--------|---------|
| `lib/overlay.ts` | **create** | Pure `overlayPiece(board, piece): Board` — paint active over settled. |
| `lib/overlay.test.ts` | **create** | Node unit tests for the overlay primitive. |
| `components/useGame.ts` | **create** | `'use client'` hook holding `createInitialState` state + composed view. |
| `components/GameContainer.tsx` | **create** | `'use client'` island: `useGame()` → `<Board>`. |
| `components/GameContainer.test.tsx` | **create** | jsdom render test: starting board + active piece overlaid, sourced from core. |
| `app/page.tsx` | **modify** | Replace stopgap static `Board` with `<GameContainer />`; fix imports + subtitle. |

No deletions. `components/Board.tsx`, `components/Cell.tsx`, and all of `lib/` except the new overlay
file are **untouched**.

## Module details

### `lib/overlay.ts` (new, pure — no React/Next; obeys the `lib/**` boundary)

```
import type { Board, Piece } from "./types";
import { pieceCells } from "./collision";

/** Return a copy of `board` with `piece` painted over it (piece cells set to piece.type).
 *  Copy-on-write: never mutates `board`. Out-of-bounds piece cells are skipped. Overlay wins
 *  over any settled cell it covers. */
export function overlayPiece(board: Board, piece: Piece): Board
```

- **Implementation shape:** `const next = board.map((row) => row.slice());` (fresh rows — mirrors the
  independent-row discipline in `board.ts`). For each `{x, y}` in `pieceCells(piece.type,
  piece.position, piece.rotation)`, if `y` and `x` are in range (`0 ≤ y < height`, `0 ≤ x < width`),
  set `next[y][x] = piece.type`. Return `next`.
- **Reuse:** offsets come **only** from `pieceCells` (the core API) — no shape math here.
- **Purity:** input `board` and the shared shape tables are never written.
- **Bounds:** guard is defensive; the spawned piece is fully in-bounds, but a total function is
  cheaper to reason about than a precondition.

### `components/useGame.ts` (new, `'use client'`)

```
'use client';
import { useMemo, useState } from "react";
import type { Board } from "@/lib/types";
import { createInitialState, type GameState } from "@/lib/game";
import { overlayPiece } from "@/lib/overlay";

export const DEFAULT_SEED = <constant>;   // stable → hydration-safe

export interface GameView { state: GameState; view: Board }

export function useGame(seed: number = DEFAULT_SEED): GameView
```

- `const [state] = useState(() => createInitialState(seed));` — lazy init (spawn/bag run once).
- `const view = useMemo(() => overlayPiece(state.board, state.active), [state]);`
- `return { state, view };`
- No setter exposed this ticket (no loop/input). `seed` param + returning `state` are the seams the
  next ticket consumes.

### `components/GameContainer.tsx` (new, `'use client'`)

```
'use client';
import Board from "@/components/Board";
import { useGame } from "@/components/useGame";

export default function GameContainer() {
  const { view } = useGame();
  return <Board board={view} />;
}
```

- The single client island. Holds no logic beyond wiring hook → `Board`.

### `app/page.tsx` (modify — stays a server component)

- Remove imports: `Board`, `emptyBoard`, `COLS`, `ROWS`.
- Add import: `GameContainer`.
- Replace `<Board board={emptyBoard(COLS, ROWS)} />` → `<GameContainer />`.
- Subtitle copy: `"Scaffold — placeholder board"` → something honest (e.g. `"Live board — starting
  position"`). Header/gradient markup otherwise unchanged.

## Interfaces / boundaries (who imports whom)

```
app/page.tsx (server)
  └─ components/GameContainer.tsx ('use client')
       ├─ components/useGame.ts ('use client')
       │    ├─ lib/game.ts        (createInitialState, GameState)
       │    └─ lib/overlay.ts     (overlayPiece)
       │         └─ lib/collision.ts (pieceCells)
       └─ components/Board.tsx   (unchanged, props-driven)
            └─ components/Cell.tsx (unchanged)
```

- **Direction:** `app → components → lib`. `lib/overlay.ts` imports only other `lib/` modules → the
  eslint boundary is satisfied.
- **Client boundary:** exactly one island (`GameContainer` + `useGame`). `page.tsx`, `Board`, `Cell`,
  and all `lib/` stay server/framework-neutral.

## Test structure

- **`lib/overlay.test.ts`** (node, relative imports like the rest of the lib suite):
  1. paints the active piece's 4 cells with its type (derive expected cells via `pieceCells`);
  2. does **not** mutate the input board (deep-equality / reference check on the original);
  3. preserves settled cells not covered by the piece; overlay wins on overlap;
  4. bounds-guard: a piece placed partly off-grid drops only the off-grid cells, no throw.
- **`components/GameContainer.test.tsx`** (jsdom via docblock, `@testing-library/react`):
  1. renders exactly `ROWS×COLS` cells (grid intact);
  2. exactly 4 non-empty `[data-cell]` squares (one tetromino) at start;
  3. those non-empty cells match the piece from `createInitialState(DEFAULT_SEED)` overlaid via
     `overlayPiece` — i.e. the view is sourced from the **core API**, not reinvented. Compare the set
     of filled `(x,y,type)` against `pieceCells` of the spawned piece.

## Ordering of changes (for atomic commits)

1. `lib/overlay.ts` + `lib/overlay.test.ts` — pure, self-contained, green before any React.
2. `components/useGame.ts` — depends on overlay + game.
3. `components/GameContainer.tsx` + its test — depends on the hook + Board.
4. `app/page.tsx` — the mount; last, so the app compiles against finished pieces.

Each step is independently type-checkable/testable; steps 1 and 3 add tests with their code.
