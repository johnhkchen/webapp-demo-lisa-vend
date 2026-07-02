# T-007-04-02 — Structure: next-preview-component

## Files

| File | Action | Purpose |
|------|--------|---------|
| `components/NextPreview.tsx` | **create** | The presentational next-queue panel |
| `components/NextPreview.test.tsx` | **create** | Component test (render + reuse + attr discipline) |
| `components/GameContainer.tsx` | **modify** | Pull `queue` from the hook; render `<NextPreview>` |

No `lib/` changes. No changes to `useGame.ts` (the `queue` seam is already in place). No changes
to `HoldBox`/`Cell` (duplication over shared abstraction — see design D2).

## `components/NextPreview.tsx` (new)

Presentational, props-driven leaf. Structure mirrors `HoldBox.tsx`.

### Public interface

```ts
interface NextPreviewProps {
  /** Upcoming piece ids, next-to-spawn first. Sourced from useGame's `queue`
      (sized by PREVIEW_COUNT). Rendered verbatim — one tile per entry. */
  queue: TetrominoType[];
}
export default function NextPreview({ queue }: NextPreviewProps): JSX.Element
```

### Internals

- `PIECE_FILL: Record<TetrominoType, string>` — **local literal** map of `bg-piece-*` tokens
  (copied from HoldBox; Tailwind tree-shaking requires literals). Module-scope const.
- `PreviewTile({ type }: { type: TetrominoType })` — internal (non-exported) helper drawing one
  piece:
  - `box = BOUNDING_BOX[type]`
  - `filled = new Set(cellsFor(type, 0).map(c => c.y * box + c.x))`
  - renders a `box × box` CSS-grid of `box*box` squares; filled → `data-next={type}` + neon
    fill, blank → `bg-white/5`. Fixed pixel size (e.g. `64px`) so all tiles share a column width.
- `NextPreview` — the outer glass panel:
  - `<div aria-label="Next" className="flex flex-col gap-2 rounded-lg border border-white/10
    bg-white/5 p-2 shadow-2xl">`
  - `<span>` uppercase tracking-wide "Next" label (same class as HoldBox's).
  - `queue.map((type, i) => <PreviewTile key={i} type={type} />)` in a `flex flex-col gap-2`.
    Key by index — the queue is positional (slot 0 is "next"), and ids repeat across the bag, so
    index is the stable positional key here.

### Attribute contract (load-bearing)

- Container: `aria-label="Next"` (a11y + test target).
- Filled squares: `data-next={type}` — **never** `data-cell` (reserved for board; keeps
  `GameContainer.test`'s `ROWS*COLS` count intact) and never `data-hold` (HoldBox's).
- Blank squares: no data attribute (matches HoldBox blanks).

## `components/GameContainer.tsx` (modify)

Two edits, both minimal:

1. **Import** (near the `HoldBox` import, line ~36):
   ```ts
   import NextPreview from "@/components/NextPreview";
   ```
2. **Destructure `queue`** from `useGame()` (line 64):
   ```ts
   const { state, view, ghost, queue, dispatch } = useGame();
   ```
3. **Render** as the third child of the existing flex row, right of the board wrapper
   (lines 90–102):
   ```tsx
   <div className="flex items-start gap-4">
     <HoldBox type={state.hold} canHold={state.canHold} />
     <div className="relative"> …board + overlay… </div>
     <NextPreview queue={queue} />
   </div>
   ```
   Also extend the file's top-of-file doc comment with a one-line note that the next-queue is now
   surfaced (parallel to the Hold note), keeping the component's header current.

## Change ordering

1. Create `NextPreview.tsx` (leaf, no dependents yet — compiles standalone).
2. Create `NextPreview.test.tsx` (targets the leaf in isolation).
3. Modify `GameContainer.tsx` to import, destructure, and render.

Each step is independently verifiable: the leaf + its test are green before touching the
container, so a wiring bug can't be confused with a component bug.

## Invariants preserved

- `[data-cell]` squares remain exactly `ROWS*COLS` (no `data-cell` in the preview) →
  `GameContainer.test` board-count assertions stay green.
- No `lib/` or hook logic touched → all pure-core and `useGame` tests unaffected.
- Deterministic render (seed-fixed queue) → no hydration mismatch.
- Production build stays green (AC) → verified by `npm run build`.
