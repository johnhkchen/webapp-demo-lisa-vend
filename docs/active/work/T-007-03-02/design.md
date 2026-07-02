# Design — T-007-03-02 hold-key-and-display

Grounded in `research.md`. The core (`hold`/`canHold`, `step`'s `"hold"` case) is done and
tested; this ticket is the render seam only. Two decisions: (A) how to bind C, (B) how to display
the held piece.

## Decision A — key binding

**Chosen: add `c` and `C` to `KEY_TO_INPUT`.** One-line extension of the existing dispatch table.
`onKeyDown` then routes it through the same `preventDefault()` + `dispatch("hold")` path as every
other mapped key.

- Mirror the case-pair idiom already used for `x`/`X` and `z`/`Z` — map both `"c"` and `"C"` so a
  held Shift/CapsLock doesn't swallow the key.
- **Auto-repeat:** hold does **not** need the `hardDrop` edge-trigger guard. A held C auto-repeats,
  but the *second* `"hold"` is already a core no-op (`if (!canHold) return state`, returns the same
  reference → no re-render). So machine-gunning is impossible by construction; no special-casing in
  the handler. (Contrast hard-drop, where each repeat *would* lock a new piece — hence its guard.)
- Rejected: a separate handler/branch for C. Unnecessary — the generic table + dispatch already
  does exactly the right thing, and the core's no-op is the natural repeat guard.

## Decision B — the hold display

The held piece must be **visible** and the spent-hold block must be **felt**. Options:

### B1 — new `HoldBox` component drawing the piece in a mini-grid *(chosen)*

A small presentational component `HoldBox({ type, canHold })`:
- `type: TetrominoType | null` — the held id (`state.hold`); `null` renders an empty slot.
- `canHold: boolean` — `state.canHold`; drives the "spent" visual (dim the box when `false`).
- Draws the piece's **spawn** cells (`cellsFor(type, 0)`) onto a bounding-box grid
  (`BOUNDING_BOX[type]`), reusing the `bg-piece-*` neon tokens, in the same grid idiom as `Board`.
- Labelled `aria-label="Hold"`; filled squares carry `data-hold={type}` — **not** `data-cell` —
  so the board test helpers (`cells`/`filledCoords`, which assume every `[data-cell]` is a
  row-major board square) stay exact.

**Why chosen:** matches the codebase's presentational-component discipline (`Board`/`Cell`/
`GameOverlay` — props-driven, logic-free), reuses `cellsFor`/`BOUNDING_BOX`/`bg-piece-*` rather
than re-deriving anything, and establishes the mini-preview pattern a future `NextPreview` can
copy. It reads `state.hold`/`state.canHold` straight off the hook — no hook change.

### B2 — reuse `Board` for a small matrix

Build a tiny `Cell[][]` for the held piece and hand it to `<Board>`. Rejected: `Board` hard-codes
playfield chrome/sizing and its cells carry `data-cell`, which would **pollute** the board test
helpers (extra `[data-cell]` nodes shift the flat-index math and break every existing assertion).
Fighting that (scoping every query) is more work than a purpose-built 4×4 preview.

### B3 — text label only ("Hold: T")

Rejected: the AC says "swaps the active piece into a **visible hold box**" — a colored piece glyph
is the intent, not a letter. Text alone under-delivers the "juice" epic's spirit.

**Decision: B1.**

## Sub-decision B-i — where the color map lives

The `bg-piece-*` fills must be **literal** strings (Tailwind v4 tree-shakes computed classes).
`Cell.tsx` has a local `CELL_COLOR` but does **not** export it.

- **Chosen: a local `PIECE_FILL: Record<TetrominoType, string>` literal map inside `HoldBox`.**
  Consistent with the codebase's established pattern — each rendering module owns its own static
  literal map (Cell's comment explicitly frames this as the tree-shaking-safe idiom). Keeps `Cell`
  untouched (no new export surface, no coupling), and the DAG edge on `Cell.tsx` stays clean.
- Rejected: exporting `CELL_COLOR` from `Cell` and importing it. Adds a cross-component coupling
  for a 7-line map and edits a file this ticket otherwise needn't touch. The tiny duplication is
  the lesser cost and matches precedent (Cell itself duplicates the fill vs. ghost maps).

## Sub-decision B-ii — the "felt" spent-hold signal

`canHold === false` means a hold was already used this drop. To make the block observable:
- **Chosen:** dim the whole box (reduced opacity, e.g. `opacity-40`) and reflect it in an
  attribute (`data-can-hold={canHold}` / `aria-disabled`) so it's both visible to players and
  assertable in tests. When `canHold` is `true` the box is full-strength.
- This is a pure function of the prop — no animation/timing (that's E-004's territory, out of
  scope). A later ticket can add a flash; here it's a legible static state, matching
  `GameOverlay`'s "plain but legible" scope note.

## Sub-decision B-iii — layout

- **Chosen:** wrap the existing `relative` board stack and the `HoldBox` in a flex row
  (`<div className="flex gap-4 items-start">`), hold box first (left), board second. The
  game-over `relative` wrapper stays intact around `Board`+`GameOverlay` so the overlay still
  covers exactly the board.
- Rejected: absolute-positioning the hold box over the board — it would overlap play and fight the
  game-over overlay. A side panel is the conventional Tetris layout and keeps concerns separate.
- `page.tsx` needs no change: `GameContainer` still renders one root node; only its internal
  structure grows. (The header copy "Live board — starting position" is cosmetic and left as-is.)

## What is explicitly out of scope

- No core/logic changes (`lib/**` untouched) — hold rules are done and tested.
- No hook change (`useGame` already returns `state.hold`/`state.canHold` and a generic `dispatch`).
- No `NextPreview`, no next-queue display, no animation/flash juice, no level/scoring changes.
- No new color tokens (reuse `bg-piece-*`).

## Risks / mitigations

- **Test-helper pollution** (the one real risk): mitigated by `data-hold` (not `data-cell`) on
  hold squares — verified against `filledCoords`'s flat-index assumption in Research.
- **Tailwind tree-shaking**: mitigated by the literal `PIECE_FILL` map (no interpolation).
- **Empty-slot render**: `type === null` must render a stable placeholder box (no piece), so the
  box is present from first paint and the layout doesn't jump when the first hold happens.
