# Structure — T-007-06-02 row-flash-and-60fps-transitions

The blueprint: file-level changes, module boundaries, and public shapes. No `lib/` changes — the
data seam is complete and pure; all work is in the `components/` render/seam layer + one CSS knob.

## Files

### CREATE — `components/useClearFlash.ts`

The latch that gives the transient one-frame `clearedRows` a full, deterministic animation lifetime.

- `"use client"` (uses `useState`/`useEffect`/`useRef`).
- Public API:
  ```ts
  export interface ClearFlash {
    rows: number[];      // rows currently flashing ([] when idle)
    generation: number;  // bumps on each new burst — a React key to restart the CSS animation
  }
  export function useClearFlash(clearedRows: number[], durationMs: number): ClearFlash;
  ```
- Behaviour:
  - Idle → returns `{ rows: [], generation: 0 }`.
  - When `clearedRows` becomes non-empty (a clear frame), capture those rows into state, bump
    `generation`, and arm a `setTimeout(durationMs)` that resets `rows` to `[]`.
  - A new clear before the timer fires cancels the prior timer, re-captures, and bumps generation
    again (back-to-back clears restart cleanly).
  - Timer cleared on unmount and before each re-arm (no leak, no post-teardown setState).
- Detection of "became non-empty": key off the **identity** of `clearedRows` (the pass-through is
  the exact reducer reference per T-007-06-01's test) combined with `length > 0`. An effect with
  `clearedRows` in its deps fires whenever the reducer produced a new array; inside, act only when
  `clearedRows.length > 0`. (Empty resets are ignored — they must NOT cancel an in-flight flash,
  which is the whole point of the latch.)
- Docstring covers: why the latch exists (transience, Research §critical timing), why timing lives
  here not in `lib/`, and the generation-key rationale.

### MODIFY — `components/Board.tsx`

Add an advisory flash overlay channel, mirroring the existing ghost-channel pattern.

- Props (additive, both optional — existing callers/tests unchanged):
  ```ts
  flashRows?: number[];  // cleared-row indices to flash (default [])
  flashKey?: number;     // burst generation, keys the overlay to restart the animation
  ```
- Compute the shared grid style object once (template columns/rows, `aspectRatio`, `width`) and use
  it for both the cell grid and the overlay grid so geometry can't drift.
- Wrap in a `relative` container; render the existing cell grid, then — only when
  `flashRows.length > 0` — an absolutely-positioned overlay grid (`absolute inset-0`, same template,
  `gap-px p-2`, `pointer-events-none`), keyed by `flashKey`, whose children are one bar per row:
  ```
  <div
    key={y}
    data-flash-row={y}
    className="flash glow rounded-[2px]"
    style={{ gridRow: `${y + 1}`, gridColumn: "1 / -1" }}
  />
  ```
- Invariants preserved: bars carry `data-flash-row`, **never** `data-cell`/`data-ghost`; the cell
  grid still emits exactly `rows*cols` `[data-cell]` nodes in row-major order.
- Docstring: add a "Flash channel (T-007-06-02)" paragraph paralleling the ghost-channel note —
  advisory overlay, geometry-shared, logic-free, invariant-safe.

### MODIFY — `components/Cell.tsx`

Add compositor-only motion to the leaf so state changes ease rather than snap.

- Append `motion` to the root `className` of all three render branches (settled / ghost / empty).
  The class only sets `transition-property: transform, opacity` + duration/easing (globals.css), so
  no visual regression and no `bg-piece-` substring impact — existing Cell assertions hold.
- Docstring: one line noting `.motion` gives every square a compositor-only (60fps) transition hook
  for the clear/collapse redraw (T-007-06-02), and why `background-color` is deliberately NOT
  transitioned (paint, off-compositor).

### MODIFY — `components/useGame.ts`

Add the timing constant (seam-layer feel policy, like its neighbours).

- ```ts
  export const FLASH_DURATION_MS = 500; // must equal globals.css --flash-duration default
  ```
- Docstring paragraph in the same style as `GRAVITY_INTERVAL_MS`: why it lives in the seam, and the
  one-source-of-truth tie to the CSS `.flash` default.
- No change to `GameView` (it already surfaces `clearedRows`).

### MODIFY — `components/GameContainer.tsx`

Wire the seam field → latch → Board overlay.

- Destructure `clearedRows` from `useGame()` (currently omitted).
- `const flash = useClearFlash(clearedRows, FLASH_DURATION_MS);`
- Import `FLASH_DURATION_MS` from `useGame` and `useClearFlash`.
- Pass to Board: `<Board board={view} ghost={ghost} ghostType={state.active.type}
  flashRows={flash.rows} flashKey={flash.generation} />`.
- Docstring: add a "Row-clear flash (T-007-06-02)" paragraph — the transient core field is latched
  by `useClearFlash` so the flash plays its full `FLASH_DURATION_MS` regardless of subsequent input.

### MODIFY — `app/globals.css`

No structural change required — `.flash`, `.glow`, `.motion` already exist. The `.flash` default
`--flash-duration: 500ms` is the number `FLASH_DURATION_MS` mirrors. (If Implement finds the mixed-
piece neutral tint reads poorly on the collapsed board, the only permitted tweak is retuning the
existing `--flash-*` defaults — no new rules.)

## Test files

### CREATE — `components/useClearFlash.test.ts`

`renderHook` + `vi.useFakeTimers()`:
- idle returns `{ rows: [], generation: 0 }`;
- a non-empty input latches those rows and bumps generation;
- rows persist across an empty-input re-render (latch not cancelled by the reset frame);
- rows clear after `durationMs` (`vi.advanceTimersByTime`);
- a second clear before expiry re-captures and bumps generation again;
- unmount mid-flash clears the timer (no post-unmount setState warning).

### CREATE — `components/Board.flash.test.tsx`

`render` Board with `flashRows`:
- renders one `[data-flash-row]` bar per index, with `.flash` class and correct `gridRow`;
- bars do **not** carry `data-cell` — `[data-cell]` count stays `ROWS*COLS`;
- no `flashRows` (or `[]`) → zero `[data-flash-row]` nodes;
- changing `flashKey` remounts the overlay (new key) — assert via a fresh node.

### MODIFY — `components/GameContainer.test.tsx`

Add one integration test: construct a real clear through the render path and assert flash bars
appear. The default seed never clears via play, so drive it deterministically — render
`<GameContainer />` is insufficient alone. Approach: use fake timers + a fabricated full-row start
is not reachable through props (GameContainer owns its own `useGame`). Instead assert the wiring at
the unit level (useClearFlash + Board tests cover the mechanism) and keep the existing GameContainer
suite green; add only a light assertion that a freshly-rendered container shows **no** `[data-flash-
row]` bars (idle state), guaranteeing the overlay is absent during normal play. (Full end-to-end
clear-to-flash is not deterministically reachable from GameContainer's fixed seed without a seam to
inject board state — documented as a coverage note in Review.)

### MODIFY — `components/Cell.test.tsx`

No change needed (motion class doesn't affect asserted substrings); optionally add one assertion
that a rendered cell's className contains `motion`.

## Ordering of changes

1. `globals.css` — confirm/retune `.flash` defaults (likely no-op).
2. `useGame.ts` — add `FLASH_DURATION_MS`.
3. `useClearFlash.ts` + test — the latch, in isolation.
4. `Board.tsx` + `Board.flash.test.tsx` — the overlay channel, in isolation.
5. `Cell.tsx` (+ optional test line) — the motion class.
6. `GameContainer.tsx` (+ test) — wire it all together.
7. Full suite + build + lint.

Each of 2–6 is independently committable and independently green.

## Boundaries honored

- `lib/` untouched — purity boundary intact.
- Board/Cell stay logic-free — flash is advisory props zipped onto the grid (ghost precedent).
- Feel/timing (`FLASH_DURATION_MS`, the latch) lives in `components/`, not `lib/constants.ts`.
- Tailwind literal-class rule — `.flash`/`.glow`/`.motion` are literals already emitted by
  `@layer components`.
