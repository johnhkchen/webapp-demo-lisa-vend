# Structure — T-007-03-02 hold-key-and-display

The blueprint. Two production files (one new, one modified) + two test files (one new, one
extended). No `lib/**` changes, no hook change, no `page.tsx` change.

## Files

### CREATE — `components/HoldBox.tsx`

Presentational, props-driven, logic-free (in the `Board`/`Cell`/`GameOverlay` discipline). Draws
the held tetromino as a mini neon grid and signals the spent-hold state.

**Public interface**

```ts
interface HoldBoxProps {
  /** The held piece id, or null before the first hold (renders an empty slot). */
  type: TetrominoType | null;
  /** Whether a hold is still allowed this drop; false dims the box (block "felt"). */
  canHold: boolean;
}
export default function HoldBox({ type, canHold }: HoldBoxProps): JSX.Element
```

**Internal organization**

- `const PIECE_FILL: Record<TetrominoType, string>` — literal `bg-piece-*` strings (same map as
  `Cell.CELL_COLOR`, duplicated locally per the Tailwind-literal / per-module-map pattern; see
  design B-i). Comment references the tree-shaking rationale.
- Render:
  - Outer wrapper: fixed-size panel, neon/glass chrome mirroring `Board`
    (`rounded-lg border border-white/10 bg-white/5 p-2`), a small "HOLD" caption
    (`text-xs uppercase tracking-wide text-white/50`), `aria-label="Hold"`,
    `data-can-hold={canHold}`, and `opacity-40` applied when `!canHold`.
  - Inner grid: a `box × box` CSS grid where `box = type ? BOUNDING_BOX[type] : 4` (stable 4×4
    when empty). Build the filled-cell set from `cellsFor(type, 0)` keyed by `y * box + x`.
  - Each square: a `<div>`; filled squares get `` `rounded-[2px] ${PIECE_FILL[type]}` `` and
    `data-hold={type}`; empty squares get the faint empty style (`bg-white/5`) and **no**
    `data-hold` / **no** `data-cell`.
- When `type === null`: render the `box=4` empty grid (no filled squares, no `data-hold` nodes),
  so the slot is present from first paint.

**Imports:** `cellsFor`, `BOUNDING_BOX` from `@/lib/tetrominoes`; `TetrominoType` from
`@/lib/types`. No React state, no hook, no `lib/game` import.

**Key invariant:** hold squares must NOT carry `data-cell` — that attribute is reserved for board
squares and load-bearing for `GameContainer.test`'s flat-index helpers (Research CONSTRAINT).

### MODIFY — `components/GameContainer.tsx`

1. Extend `KEY_TO_INPUT` with `c: "hold"` and `C: "hold"` (mirror the `x`/`X`, `z`/`Z` pairs).
   Update the JSDoc above the map to mention C = hold.
2. Import `HoldBox`.
3. Restructure the returned JSX: wrap the existing `relative` board+overlay stack and a new
   `<HoldBox type={state.hold} canHold={state.canHold} />` in a flex row:

   ```tsx
   return (
     <div className="flex items-start gap-4">
       <HoldBox type={state.hold} canHold={state.canHold} />
       <div className="relative">
         <Board board={view} ghost={ghost} ghostType={state.active.type} />
         <GameOverlay visible={state.gameOver} score={state.score} lines={state.lines} />
       </div>
     </div>
   );
   ```

   The `relative` wrapper stays wrapped tightly around `Board`+`GameOverlay` so the game-over
   overlay keeps covering exactly the board.
4. Update the module JSDoc to note the hold key + hold display seam (one sentence).

No change to the gravity loop, the `onKeyDown` guard logic (hold needs no edge-trigger — the
core's `!canHold` no-op is the repeat guard, design A), or the effect deps.

### CREATE — `components/HoldBox.test.tsx`

Unit tests for the presentational component in isolation (jsdom, `@testing-library/react`):
- Empty slot (`type={null}`): renders the labelled box, zero `[data-hold]` nodes.
- A held piece (e.g. `type="T"`): renders exactly 4 `[data-hold="T"]` squares (the spawn cells).
- Each of the seven types renders 4 filled squares with the matching `data-hold`.
- `canHold={false}` marks the box `data-can-hold="false"` and applies the dim class;
  `canHold={true}` does not.
- Filled-square coordinates equal `cellsFor(type, 0)` mapped to the box (reuse, not hard-coded).

### MODIFY — `components/GameContainer.test.tsx`

Add a `describe("GameContainer — hold")` block (does not disturb existing tests):
- **C dispatches `'hold'`**: press `c`; the board's active piece equals `expectedAfter("hold")`
  (ground-truth via the core), and the hold box shows the stashed piece (`data-hold` present).
- **Held piece is visible in the box**: after `c`, `[aria-label="Hold"]` contains 4 `[data-hold]`
  squares whose id = the pre-hold active type.
- **Ignored until next lock**: press `c` twice; the second is a no-op — board unchanged from the
  single-hold state, box still shows the same held id, and `data-can-hold="false"`.
- **`C` (capital) also holds**: parity with the lowercase mapping.
- Existing board helpers keep working because hold squares carry `data-hold`, not `data-cell`
  (assert `cells(container)` still length `ROWS*COLS` after a hold).

## Change ordering

1. `components/HoldBox.tsx` (new component, no dependents yet) + its test.
2. `components/GameContainer.tsx` (key map + layout) — imports HoldBox.
3. Extend `components/GameContainer.test.tsx`.
4. Full `lint` + `test` + `build` gate.

Order matters only in that HoldBox must exist before GameContainer imports it; tests can follow
each production file.

## Boundaries preserved

- `lib/**` purity untouched (no import of React into lib; no game rules in components).
- `Cell.tsx` untouched (local map duplication instead of a new export — design B-i).
- `useGame.ts` untouched (`state.hold`/`state.canHold` already exposed; `dispatch` already generic).
- `data-cell` remains exclusively a board-square attribute.
