# Review — T-001-03-01: render-placeholder-board-css-grid

Handoff document. What changed, how it was verified, and what a reviewer needs to know
without reading every diff.

## Outcome

The placeholder board renders on the page as a 10×20 CSS grid of cell `div`s, the production
build passes, and the presentational skeleton named in CLAUDE.md (Board **and** Cell) is now
complete. The scaffold (`516981b`) had already rendered the 200-cell grid and shipped a green
build — so, as with T-001-02-02, the **literal acceptance criteria were met before this
ticket began**. What this ticket adds is the piece its Context and the epic demand —
"*completing the visible skeleton*": the atomic `Cell` component that CLAUDE.md lists but the
scaffold folded into an anonymous inline `div`. **Acceptance criteria met; skeleton
completed.** Committed as `d68c42c`.

## What changed

### Added
- `components/Cell.tsx` — a stateless, props-less, default-exported Server Component
  rendering one empty placeholder cell `div`
  (`rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5`). It is the CLAUDE.md-named
  atomic unit of the board grid and the reserved seam where the playability epic will add
  per-cell fill/color state.
- `docs/active/work/T-001-03-01/{research,design,structure,plan,progress,review}.md`.

### Modified
- `components/Board.tsx` — imports `Cell` and renders `<Cell key={i} />` for each of the
  `COLS*ROWS` grid positions instead of an inline `div`; the cell-level classes moved to
  `Cell`. The grid **container** (template from `COLS`/`ROWS`, `width`/`aspectRatio` sizing,
  chrome classes, `aria-label`) and the `Array.from({length: COLS*ROWS})` map are unchanged.
  Doc comment updated to reflect the Board∘Cell composition.

### Not changed (deliberately)
- `app/page.tsx` — already mounts `<Board />` under the gradient TETRIS header; satisfies "on
  the page" as-is.
- `lib/constants.ts` — remains the single source of truth for `COLS`/`ROWS`; no `10`/`20`
  literal enters JSX or class strings.
- `app/layout.tsx`, `app/globals.css`, `eslint.config.mjs`, `tsconfig.json`, `next.config.ts`,
  `postcss.config.mjs`, `package.json`/lockfile — untouched. **No new dependency.**
- Ticket/story/epic frontmatter — left for Lisa to advance.

## Why a change at all (not just "verify")

The AC checks the grid *renders*; the ticket **Context** and epic "Done looks like" ask to
"complete the visible skeleton." The skeleton was demonstrably incomplete: CLAUDE.md's
component list names `Board, Cell, NextPreview, …`, and only `Board` existed — the cell, the
literal unit of the grid this ticket exists to prove, was an anonymous inline `div`. Naming
it (a) delivers the stated "complete the skeleton" deliverable, (b) removes the per-cell class
duplication, and (c) hands the Playability epic a clean seam so it adds state to `Cell` rather
than re-cutting `Board`. This mirrors T-001-01-02 (tightened the lint script) and T-001-02-02
(enforced the purity boundary): when the scaffold pre-satisfies the letter, deliver the
Context's intent with a small, bounded, reversible change.

## Verification

| Check | Command | Result |
|---|---|---|
| Baseline clean (pre-change) | `npm run lint` / `npm run build` | exit 0 / exit 0 |
| Lint after change (zero-warning gate) | `npm run lint` | exit 0, zero warnings |
| Production build passes | `npm run build` | exit 0; `/` + `/_not-found` prerendered static |
| **DOM contract: 200 cells / 1 grid** | count markers in prerendered `.next/server/app/index.html` | 400 cell markers ÷ 2 grid containers = **200 cells per grid** (Next emits the markup 2×; ratio is uniform) = `COLS*ROWS` ✓ |
| `lib/` purity rule not tripped | `npm run lint` (no `lib/` change) | exit 0 |
| Commit scope | `git show --stat` | 6 files: `Cell.tsx`, `Board.tsx`, + this ticket's 4 prior artifacts; no frontmatter, no sibling/unrelated files |

The DOM-count evidence confirms the extraction preserved the exact renderer contract the AC
cares about: `COLS*ROWS` cell `div`s inside one CSS-grid container, dimensions driven by
`lib/constants`.

## Test coverage

- **No automated tests, by design** — consistent with T-001-01-01/02 and T-001-02-02. This
  ticket adds a stateless presentational component with zero branching logic. A DOM render
  test would require introducing jsdom + React Testing Library — a heavier, different
  dependency than the Vitest runner prior tickets deferred to the first pure-`lib/` logic
  epic — which is disproportionate for a static placeholder.
- **Gap carried forward (unchanged):** no `test` script/runner yet. Stand one up when E-002's
  pure `lib/` logic (tetromino/collision/scoring/RNG) lands — that is the code that will
  reward real unit coverage, and the boundary T-001-02-02 enforces exists to protect it.

## Open concerns / notes for the reviewer

1. **`Cell` is intentionally props-less.** Its value is a *named seam* + de-duplication, not
   an enforced invariant (unlike T-001-02-02's lint rule). A forward-looking `filled`/`color`
   prop was **rejected** (Design Option C): the state contract — boolean vs. tetromino id vs.
   a P2-theme color token — is genuinely owned by the Playability/Theme epics, and guessing
   it now risks shipping the wrong prop. The epic adds the prop when it has real state to
   drive it. This is honest scope restraint, not an oversight.
2. **Grid template stays inline `style`.** Tailwind v4 cannot ergonomically express
   `repeat(var, …)` from a JS constant without hardcoding `10`/`20` into class strings, which
   would break the `lib/constants` single-source-of-truth. Inline `style` keyed off
   `COLS`/`ROWS` is the correct renderer proof; changing it was rejected (Design Option D).
3. **No `lib/board.ts` model.** Rendering from a pure board representation was rejected
   (Design Option E) as E-002 ("board ops") scope; `lib/constants` supplies everything the
   placeholder needs. Avoids a future file collision with that epic.
4. **Visual pass was not run in a live browser** in this environment. Confidence rests on:
   the class move is verbatim, the map length is structurally unchanged, the build passes, and
   the prerendered HTML shows the exact 200-cell/1-grid contract. Low risk, but a reviewer who
   wants belt-and-suspenders can `npm run dev` and confirm the 10×20 neutral grid renders
   under the TETRIS header.
5. **Committed on shared `main`**, matching the RDSPI concurrency model. Only code + this
   ticket's artifacts were staged; sibling/unrelated working-tree files and all frontmatter
   were left untouched for Lisa.

## Critical issues

None. Two small presentational files (one added, one refactored), no dependency, no config or
`lib/` change, fully reversible (revert `d68c42c` or delete `Cell.tsx` and restore Board's
inline cell). Tree verified green: lint exit 0, build exit 0, `/` static, 200-cell contract
intact.

## Bottom line

The DOM/CSS-grid renderer fork is honored and *proven on the page*, and the visible skeleton
is complete: `Board` composes the CLAUDE.md-named `Cell`, dimensions flow from pure
`lib/constants`, the build passes, and no scaffolding work remains before the next signal is
pulled. The Playability epic inherits a ready Board∘Cell seam on guaranteed-green ground.
