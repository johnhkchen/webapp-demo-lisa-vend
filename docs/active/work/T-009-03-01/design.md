# T-009-03-01 — Design: board-as-recessed-clay-well

## Decision up front

Replace the cell-grid container's chrome classes wholesale with `clay-well`, dropping
`rounded-lg`, `border`, `border-white/10`, `bg-white/5`, and `shadow-2xl` entirely (`clay-well`
supplies background, radius, and shadow on its own; it has no border). Keep `grid h-full w-full
gap-px p-2` — pure layout/sizing utilities unrelated to chrome. Then, to preserve the flash
overlay's documented pixel-parity with the cell grid, drop the overlay's matching
`border border-transparent` in the same change (border-width 0 on both sides again, so both
grids' content boxes stay identical under `box-sizing: border-box`).

```tsx
<div
  aria-label="RowClear board"
  className="clay-well grid h-full w-full gap-px p-2"
  style={gridStyle}
>
  ...
</div>

{flashRows.length > 0 && (
  <div
    key={flashKey}
    aria-hidden
    className="pointer-events-none absolute inset-0 grid gap-px p-2"
    style={gridStyle}
  >
    ...
  </div>
)}
```

## Options considered

### A — Full chrome swap to `clay-well`, drop border entirely, fix overlay parity (chosen)

As above. `clay-well` is the kit's own named primitive for exactly this ("game boards ... things
you look INTO" — Research), so applying it wholesale is the smallest change that satisfies both
the AC's literal ask (no `bg-white/5`, no `shadow-2xl`, applies the kit's clay-well surface
classes) and its visual intent (reads as pressed into the page, not glass-over-dark).

**Why this wins:**
- Minimal, single-purpose: one class added (`clay-well`), four removed (`rounded-lg`, `border`,
  `border-white/10`, `bg-white/5`, `shadow-2xl` — five, technically), all of them chrome-only
  utilities. No layout/sizing/data-attribute/test-observable structure touched.
- `clay-well` already provides background (`--clay-well`), radius (`--clay-radius`, 1rem — larger
  than `rounded-lg`'s 0.5rem, consistent with the kit's "generous radii" identity note in
  `CLAUDE.md`'s Visual Identity section), and the inset dual-shadow that *is* the "recessed"
  read. Keeping any of the old chrome utilities alongside it would be redundant at best (another
  `rounded-lg` layered under a `border-radius: 1rem` from `clay-well`'s later-declared class —
  Tailwind's utility layer still wins by CSS source order in this codebase's `@layer` setup, so
  a leftover `rounded-lg` could silently fight or become dead weight) and visually wrong at worst
  (a lingering `border-white/10` hairline reads as glass-edge, undercutting "recessed into clay,"
  and the kit's own `.clay-well` deliberately has no border).
- Dropping the overlay's `border border-transparent` is not optional cosmetic cleanup — it is
  required to keep the two grids geometrically identical. Research established the overlay's
  border exists solely to match the main grid's former 1px border-width; leaving it after the
  main grid's border is removed would silently shift the flash-bar overlay by 1px on each edge
  relative to the cell grid. Symmetric removal is the only way to honor the overlay's own doc
  comment ("mirrors the cell grid's exact geometry") after this change.
- Zero test risk (Research): neither `Board.test.tsx` nor `Board.flash.test.tsx` asserts on the
  container's className string; both only touch `[data-cell]`/`[data-ghost]`/`[data-flash-row]`
  attributes, counts, and `gridRow`/`gridTemplate*` inline styles, none of which this change
  touches.

### B — Add `clay-well` alongside the existing classes, drop only `bg-white/5`/`shadow-2xl`

Minimal literal reading of the AC: remove exactly the two named classes, keep `rounded-lg
border border-white/10`, add `clay-well`.

**Rejected.** `clay-well` already sets `background`/`border-radius`/`box-shadow`; keeping
`rounded-lg` (0.5rem) alongside `clay-well`'s `border-radius: var(--clay-radius)` (1rem) leaves
two conflicting radius declarations in source with no clear winner communicated to a future
reader — whichever CSS layer wins is implicit, not designed. Keeping `border-white/10` also
directly undercuts the "recessed well" read (Research: the kit's own `.clay-well` has no border;
a translucent hairline border is a glass-panel signature, the exact treatment this ticket exists
to retire) and doesn't address the flash-overlay parity issue at all, since the main grid's
border-width would stay 1px and nothing forces a mismatch — but leaving stray dark-glass-era
utilities behind is exactly the "candidates to rewrite, not precedent to match" trap the
user-global brand guidance warns against for one-off patches. Rejected for leaving visual/source
ambiguity the ticket's job is to resolve, not merely satisfy the AC's letter.

### C — Wrap Board in an outer `<div className="clay-well p-2">` instead of editing the grid div directly

Add a new wrapping element carrying `clay-well`, leave the grid div's own classes untouched
(minus the two forbidden ones), so the well "container" and the "grid" are separate concerns.

**Rejected.** Adds a DOM node with no functional purpose — the existing grid div already *is*
the board's outer visual container (it owns `aria-label="RowClear board"`, sized by the
`gridStyle`/parent `aspectRatio`); wrapping it a second time duplicates padding/sizing concerns
across two elements for no benefit, and risks a maintenance trap where a future edit forgets
which of the two nested boxes owns which style. `Board.tsx`'s own file doc comment states it
"holds no state and no game logic" and should stay a thin, flat structure — an extra wrapper div
is exactly the kind of incidental complexity CLAUDE.md's project-wide "don't add abstractions
beyond what the task requires" guidance rules out here. Option A achieves the same visual result
by editing the existing container in place.

### D — Leave the flash overlay's `border border-transparent` as-is, accept the 1px drift

Only touch the main grid's className; treat the overlay's border as out of scope since the AC
names only `Board.tsx`'s chrome, not the flash overlay specifically.

**Rejected.** The overlay lives in the same file (`Board.tsx`), so it is in scope by the ticket's
own title/AC ("Board.tsx no longer contains..."). More importantly, silently introducing a 1px
geometric drift between the flash bars and the cells they're meant to sit exactly on top of is a
visual regression the AC's "board visually reads as a recessed well" bar would not catch (flash
only appears transiently on a line clear) but a careful dev-server check or a future contributor
would. Since Research already identified the coupling and the fix is a one-line symmetric
removal, there's no reason to leave a known, fixable drift in place.

## What stays untouched (explicit non-goals)

- `Cell.tsx`'s empty-square fill/ghost treatment (T-009-03-02).
- `HoldBox.tsx`/`NextPreview.tsx`'s own `bg-white/5`/`shadow-2xl` chrome (T-009-03-03,
  T-009-03-04) — structurally identical to Board's old treatment but explicitly out of this
  ticket's scope; not touched even though the pattern is visible.
- `GameContainer.tsx`'s `<div className="relative">` wrapper around `<Board/>` — no chrome to
  retone there.
- The `TetrominoType`→`PieceType` rename and `"RowClear board"` aria-label string already sitting
  uncommitted in `Board.tsx`'s working tree — pre-existing, unrelated, another ticket's work
  (Research); left exactly as found.
- `gridStyle`, the cell-mapping logic, ghost-key computation, ghost/cell rendering — no
  behavioral or data-flow change anywhere in this ticket, chrome-only.
