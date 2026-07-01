# Design — T-001-03-01: render-placeholder-board-css-grid

## Problem restated

The scaffold already renders a 10×20 CSS grid of cell `div`s via `components/Board.tsx`,
mounted in `app/page.tsx`, with a passing build — so the **literal** acceptance criteria are
met. Design's job is to decide what (if anything) this ticket should *change* to honor the
Context's deeper intent — "prove the chosen renderer" and "**complete the visible
skeleton**" — without straying into downstream epic scope.

## Options considered

### Option A — Verify-only (change nothing but artifacts)

Confirm the AC holds (build + lint + visual), write the RDSPI artifacts, commit nothing but
docs.

- **Pros:** Zero risk. Honest that the scaffold did the work.
- **Cons:** Breaks with repo culture. T-001-01-02 and T-001-02-02 each faced a
  pre-satisfied literal AC and still delivered a small, justified change that realized the
  ticket's *intent* (a zero-warning lint gate; a lint-enforced purity boundary). "Complete
  the visible skeleton" is an explicit deliverable, and the skeleton is demonstrably
  *incomplete*: CLAUDE.md names `Cell` as a component and it does not exist. Verify-only
  leaves that gap open and pushes it onto the Playability epic.

### Option B — Extract the `Cell` component; Board composes it *(chosen)*

Create `components/Cell.tsx` as a presentational, stateless empty cell, and refactor
`Board.tsx` to render `<Cell />` for each of the `COLS*ROWS` grid positions. Board keeps
ownership of the grid *container* (template, sizing, chrome); Cell owns the *cell* visual.

- **Pros:**
  - Directly delivers "complete the visible skeleton" — the grid this ticket proves is a
    grid *of cells*, and `Cell` is the CLAUDE.md-named atomic unit. Board∘Cell is the
    natural, minimal decomposition.
  - Gives the Playability epic a ready seam: it will add per-cell fill/color state, and a
    named `Cell` is exactly where that prop lands — so this reduces future churn to `Board`
    rather than creating it.
  - Purely presentational and stateless — no encroachment on E-002 (pure logic) or the P2
    theme epic. No new dependency. Fully reversible.
  - Preserves the DOM contract the AC checks: still exactly 200 cell `div`s in one CSS grid.
- **Cons:**
  - A props-less `Cell` is a thin wrapper; its value is a *named seam*, not enforcement.
    This must be stated honestly in the review (it is decomposition, not an invariant like
    T-001-02-02's).
  - Mitigation: the cell's placeholder styling (currently duplicated per inline `div`) moves
    to one place, so the extraction also removes duplication, not only adds a name.

### Option C — Extract `Cell` **with a forward-looking prop** (e.g. `filled`/`color`)

Same as B but give `Cell` an optional prop anticipating the game state.

- **Pros:** "Ready for the game loop" out of the box.
- **Cons:** Violates the anti-premature-surface norm the repo has repeatedly chosen
  (T-001-02-02 review pt 4 rejected an un-gated barrel; the project prefers minimal, used
  surface). The state contract — what a filled cell *is* (boolean? tetromino id? color
  token tied to the P2 theme?) — is genuinely owned by the Playability/Theme epics. Guessing
  it now risks shipping the *wrong* prop and forcing a rename later. **Rejected**: add the
  prop when there is real state to drive it.

### Option D — Move the grid template out of inline `style` into Tailwind/CSS

Replace the inline `gridTemplateColumns/Rows` with Tailwind classes or a CSS module.

- **Cons:** Tailwind v4 cannot ergonomically express `repeat(var(--cols), …)` from a JS
  constant; arbitrary values would hardcode `10`/`20` into class strings, *breaking* the
  `lib/constants` single-source-of-truth. Inline `style` keyed off `COLS`/`ROWS` is the
  cleanest way to keep the renderer driven by the pure constant. **Rejected** — the current
  inline approach is correct; changing it would regress the boundary.

### Option E — Introduce `lib/board.ts` (empty-board model) and render from it

Make Board consume a pure board representation from `lib/`.

- **Cons:** "Board ops" is explicitly E-002 (pure game core) scope. Creating `lib/board.ts`
  now would collide with that epic and pre-empt its model design. `lib/constants` already
  supplies everything the placeholder needs. **Rejected** as scope encroachment.

## Decision

**Option B.** Extract a presentational, props-less `components/Cell.tsx` and have `Board`
compose it, keeping dimensions sourced from `lib/constants`. This completes the named visible
skeleton (Board + Cell), removes per-cell duplication, and hands the Playability epic a clean
seam — while staying stateless, dependency-free, reversible, and clear of E-002 / P2 scope.

Explicitly **declined**: game props on `Cell` (Option C), any `lib/` board model (E),
touching the grid-template mechanism (D), and standing up a DOM test runner (deferred, per
T-001-02-02, to when there is real logic to test).

## Design details

- **`components/Cell.tsx`** — default-exported function component, no props. Renders a single
  empty placeholder cell `div` carrying the cell-level Tailwind classes previously inlined in
  `Board` (`rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5`). Server Component (no
  `"use client"`; no state or hooks). A short doc comment states: presentational placeholder,
  the game epic adds fill/color state here.
- **`components/Board.tsx`** — unchanged responsibilities (grid container: template from
  `COLS`/`ROWS`, sizing, chrome, `aria-label`). The inline cell `div` inside `.map()` is
  replaced by `<Cell key={i} />`. The `Array.from({length: COLS*ROWS})` and the CSS-grid
  container stay exactly as-is, preserving the 200-cell DOM contract.
- **`app/page.tsx`** — no change. The mount + gradient header already satisfy "on the page".
- **`lib/constants.ts`** — no change; remains the dimension source of truth.

## How this maps to acceptance criteria

- "`components/Board` renders a 10×20 grid of cell `div`s via CSS grid on the page" — still
  true after the refactor: Board renders `COLS*ROWS` `<Cell>` `div`s in a CSS-grid container;
  page mounts Board. Now the *cell* is a first-class named component, completing the skeleton.
- "loading localhost:3000 shows the placeholder board" — unchanged visual output (same
  classes, same 200 cells); verified in dev.
- "`npm run build` passes … no scaffolding work remains" — verified via build + lint; with
  `Cell` present, the presentational skeleton named in CLAUDE.md has no remaining gap.

## Risks & mitigations

- **Risk:** visual regression from moving classes. **Mitigation:** classes are moved verbatim
  from Board's inline cell to `Cell`; diff is a straight extraction; verified in dev + build.
- **Risk:** perceived over-engineering (a thin wrapper). **Mitigation:** honest framing in
  review — this is bounded decomposition delivering the named skeleton + de-duplication, not a
  claimed invariant.
