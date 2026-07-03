# T-009-03-01 — Review: board-as-recessed-clay-well

## Summary

Retoned `Board.tsx`'s cell-grid container from the dark-glass treatment
(`rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl`) to the b28-clay kit's
`clay-well` primitive (`className="clay-well grid h-full w-full gap-px p-2"`), so the board now
reads as a warm, ink-shadowed recess pressed into the clay page rather than a translucent glass
panel over dark background. As a required companion (not an independent change), the flash
overlay's matching `border border-transparent` was also removed, keeping the overlay's box
geometry pixel-identical to the cell grid's now-borderless box — the overlay's own doc comment
requires it to "mirror the cell grid's exact geometry," and it would have silently drifted by
the old border-width otherwise.

## Files changed

- `components/Board.tsx` — 2 lines changed (both `className` string literals), committed in
  isolation as `c52de13`. Verified via `git show --stat` that only these 2 lines plus the new
  RDSPI artifact directory are in the commit — no other line of `Board.tsx`'s pre-existing
  uncommitted diff (the `TetrominoType`→`PieceType` rename, the `"RowClear board"` aria-label
  string) was swept in.
- `docs/active/work/T-009-03-01/{research,design,structure,plan,progress}.md` — this ticket's
  RDSPI artifacts, committed alongside.

No component, hook, lib, or test file was modified. `BoardProps`, the render tree shape, the
`data-cell`/`data-ghost`/`data-flash-row` attribute contracts, and every call site
(`GameContainer.tsx`'s single `<Board .../>` usage) are all unchanged — this was a chrome-only
edit on a presentational leaf.

## An important pre-existing condition, handled the same way T-009-02-01 documented

At session start, `components/Board.tsx` and several sibling files already carried a large
uncommitted diff spanning multiple other in-flight S-009 tickets (global `TetrominoType`→
`PieceType` rename, `"Tetris"`→`"RowClear"` branding strings, kit import/token wiring, font
loading, piece-palette retone) — consistent with the RDSPI concurrency model (multiple threads
on one branch, file-lock serialization only). Unlike T-009-02-01's case, this ticket's two target
lines sat *hunk-adjacent* to one of those unrelated lines (the aria-label string, on the line
immediately above the container's `className`), so a plain `git add -p`/hand-authored
`git apply --cached` patch could not isolate them (verified: `git apply --cached --check` failed
against the interleaved hunk). Resolved by constructing the target blob directly — HEAD's file
content with only the two `className` lines replaced — hashing it and staging it via
`git update-index --cacheinfo`, bypassing hunk-based patching entirely. Verified
`git diff --cached` showed exactly the two intended hunks before committing, and confirmed the
working tree's other uncommitted lines (aria-label, type rename) remained unstaged and untouched
afterward.

**Flag for a human reviewer:** the same broad set of pre-existing uncommitted hunks flagged by
T-009-02-01's review is still sitting in the working tree after this session (now joined by a
couple more, e.g. `T-009-04-01`'s in-progress work). Not this ticket's job to resolve, but
repeating the flag since it hasn't been addressed between sessions.

## Test coverage

- No new automated test added. Both AC-named test files were run and pass unchanged:
  `Board.test.tsx` and `Board.flash.test.tsx` (12 tests, 2 files). Neither asserts on the
  container's `className` string — both are structural/attribute assertions (`[data-cell]`
  counts, `[data-flash-row]` `gridRow`, `aria-label` element lookup) that this change doesn't
  touch, confirmed by reading both files line-by-line in Research before editing.
- Full suite: 32 files / 302 tests, before and after, identical count, all passing.
- `npm run lint` (`--max-warnings 0`) and `npm run build` (`vinext build`) both clean.
- **Gap, same shape as T-009-02-01's:** no automated check exists (here or previously) that would
  catch a future accidental re-introduction of `bg-white/5`/`shadow-2xl` on `Board.tsx`, or a
  regression of the flash-overlay geometry parity. A test asserting
  `container.className.includes("clay-well")` was considered and rejected (Plan) as
  implementation-detail coupling with low value; a *behavioral* regression test (e.g. asserting
  the flash bar's bounding rect matches the corresponding cell's) would be more meaningful but is
  disproportionate to this ticket's scope — worth naming as a known gap, not silently absent.

## Verification performed

1. `npm run test -- --run components/Board.test.tsx components/Board.flash.test.tsx` — 12/12
   passing.
2. `npm run test -- --run` — 302/302 passing (pre- and post-change baseline identical).
3. `npm run lint` — clean.
4. `npm run build` — clean, all 5 vinext build stages complete.
5. Dev-server check — `npm run dev`; `curl`'d `/` and confirmed the rendered board element's
   `class` attribute is exactly `"clay-well grid h-full w-full gap-px p-2"`, with none of
   `bg-white/5`/`shadow-2xl`/`border-white/10` present on it (those strings remain elsewhere in
   the page from `HoldBox`/`NextPreview`, out of scope, confirmed by source location — not a
   regression from this change). Fetched the served `app/globals.css` and confirmed the compiled
   `.clay-well` rule resolves to `background: var(--clay-well)` plus an ink-tinted, dual inset
   `box-shadow` (`--clay-shadow-well`) — the recipe that produces the "recessed, warm-shadowed"
   read, not a flat/gray box.

## Open concerns / limitations

- **Visual verification is reasoned from computed CSS, not observed as a rendered screenshot.**
  Same shape of residual risk T-009-02-01 flagged for the piece-palette retone: no
  headless-browser/screenshot tooling exists in this repo (confirmed absent from
  `package.json`), so nobody has looked at actual rendered pixels this session. The served-CSS
  confirmation (background token + inset dual-shadow, ink-tinted not gray) is a strong proxy —
  `clay-well` is a pre-existing, already-designed kit primitive, not a hand-tuned value this
  session invented — but a human glancing at `npm run dev` would close this gap in seconds.
- **`HoldBox.tsx`/`NextPreview.tsx` still carry the old dark-glass chrome** (`bg-white/5
  shadow-2xl border-white/10`), sitting directly beside the now-retoned board. This is expected
  and correctly out of scope (T-009-03-03/T-009-03-04 own those files per their own tickets'
  `depends_on`), but until those land, a `npm run dev` look at the full game will show a visually
  inconsistent mix — one recessed clay panel next to two dark-glass ones. Not a defect in this
  ticket's own work; worth knowing so it isn't mistaken for one mid-epic.
- **The flash-overlay border removal (companion change) has no dedicated regression test** beyond
  the existing `Board.flash.test.tsx` assertions on `gridRow`/bar count, which don't measure
  pixel alignment. The reasoning for why removing both borders together preserves geometry is
  sound (Design/Structure) and was sanity-checked by re-running `Board.flash.test.tsx`, but a
  true pixel-alignment check would require rendered-layout measurement this repo has no tooling
  for.
- The broader pre-existing uncommitted-hunks situation flagged above remains unresolved — not
  this ticket's job to fix, but noted so it doesn't get lost across sessions.

## Nothing else outstanding

Implementation matches the plan exactly, with one anticipated-in-spirit deviation in *mechanism*
only (blob-crafting instead of `git add -p` for commit isolation, Progress) — the outcome (a
commit scoped to exactly this ticket's two hunks) matches the plan's intent. Ready for hand-off.
