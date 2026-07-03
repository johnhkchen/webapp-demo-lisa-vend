# T-009-03-03 — Review: hold-box-raised-clay-tile

## Summary

Retoned `HoldBox.tsx`'s panel from the dark-glass treatment (`rounded-lg border border-white/10
bg-white/5 p-2 shadow-2xl`) to the b28-clay kit's `.clay-chip` primitive (`className="clay-chip
flex flex-col gap-2 p-2"`) — the kit's own header comment names `.clay-chip` for exactly this use
("small raised token... next/hold tiles"). Two companion edits complete the retone: the 'Hold'
label moved from `text-white/50` to `text-foreground/70` (the ink token, at the same muted-label
opacity idiom `GameOverlay.tsx` already established), and the blank mini-grid squares moved from
`bg-white/5` to `bg-foreground/5 ring-1 ring-inset ring-foreground/10` (identical treatment to
`Cell.tsx`'s already-shipped empty-square fix, T-009-03-02, applied at the same visual scale).

The AC's literal bar — no `border-white/10`, `bg-white/5`, or `shadow-2xl` substrings anywhere in
the file — is met (confirmed by grep, exit code 1 / zero matches).

## Files changed

- `components/HoldBox.tsx` — 2 hunks, 7 lines changed (both in the `return` JSX: the panel
  `className` + label `className` together, and the blank-square `className` separately),
  committed in isolation as `5e19aff feat(T-009-03-03): retone HoldBox panel as raised clay tile`.
  Verified via `git diff --cached` before committing that only these two hunks were staged — none
  of `HoldBox.tsx`'s pre-existing uncommitted diff (the `TetrominoType`→`PieceType` rename,
  `lib/tetrominoes`→`lib/pieces` import path, "tetromino"→"piece" doc-comment wording — another
  in-flight ticket's work) was swept in. Mechanism: constructed the target blob directly from
  `git show HEAD:...` plus only this ticket's three edits, hashed and staged via `git update-index
  --cacheinfo`, the same isolation technique T-009-03-01 used for the identical situation.
- `docs/active/work/T-009-03-03/{research,design,structure,plan}.md` — committed alongside the
  code in the same commit; `progress.md`/`review.md` (this file) follow in a second commit, per
  this branch's established two-commit-per-ticket pattern (`feat(...)` for code+early artifacts,
  `docs(...)` for progress+review).

No hook, lib, or test file was modified. `HoldBoxProps`, `PIECE_FILL`, `cellsFor`/`BOUNDING_BOX`
usage, `data-hold`/`data-can-hold`/`aria-label` attributes, and `GameContainer.tsx`'s single
`<HoldBox .../>` call site are all unchanged — this was a chrome-only edit on a presentational
leaf, matching the discipline `Board`'s (T-009-03-01) and `Cell`'s (T-009-03-02) own retones held
to.

## An important pre-existing condition, handled the same way T-009-03-01/T-009-03-02 documented

At session start, `components/HoldBox.tsx` already carried a large uncommitted diff spanning
another in-flight ticket's global rename work (`TetrominoType`→`PieceType`, `lib/tetrominoes`→
`lib/pieces`, "tetromino"→"piece" wording) — consistent with the RDSPI concurrency model
(multiple threads on one branch, file-lock serialization only, per `docs/knowledge/
rdspi-workflow.md`'s Concurrency section). Unlike T-009-03-01's board case, this ticket's three
target edits sat in hunks that did **not** interleave with the rename diff's hunks (confirmed via
`git diff`), so isolating the commit was mechanically simpler, though the same blob-crafting
technique was used for consistency and certainty.

**Flag for a human reviewer:** the same broad set of pre-existing uncommitted rename/branding
hunks flagged by T-009-02-01/T-009-03-01/T-009-03-02's reviews is still sitting in the working
tree after this session (`components/HoldBox.tsx` itself, plus `Board.tsx`, `Cell.tsx`, `lib/*`,
and others per `git status`). Not this ticket's job to resolve, but repeating the flag since it
spans several sessions now without being addressed.

Separately, mid-session, `docs/active/tickets/T-009-03-04.md`'s `phase` field advanced from
`ready` to `research` (observed via a file-change notification, not caused by this session) — that
ticket (`next-preview-raised-clay-tile`) is S-009-03's sibling ticket for `NextPreview.tsx`, and
its own frontmatter/artifacts are Lisa's/another thread's concern, not touched here.

## Test coverage

- No new automated test added. `HoldBox.test.tsx` (the AC-named test file) was run unmodified and
  passes: 7/7. None of its assertions touch className substrings other than the literal
  `opacity-40` token (`toContain`/`.not.toContain`), which this change preserves verbatim in the
  same position within the template string — confirmed by reading the test file line-by-line in
  Research before editing, and by the green run after.
- Full suite: 32 files / 302 tests, before and after, identical count, all passing.
- `npx eslint components/HoldBox.tsx --max-warnings 0`: clean.
- **Gap, same shape as T-009-03-01/T-009-03-02's:** no automated check exists (here or previously)
  that would catch a future accidental re-introduction of `bg-white/5`/`shadow-2xl`/
  `border-white/10` on `HoldBox.tsx`. A test asserting `container.className.includes("clay-chip")`
  was considered and rejected (implicitly, by following the same Plan-phase reasoning T-009-03-01
  documented) as implementation-detail coupling with low value relative to the existing
  attribute/dataset-based assertions. Worth naming as a known, accepted gap, not a silent omission.

## Verification performed

1. `npx vitest run HoldBox` — 7/7 passing.
2. `npx vitest run` (full suite) — 302/302 passing, same count as before the change.
3. `npx eslint components/HoldBox.tsx --max-warnings 0` — clean.
4. `grep -nE "border-white/10|bg-white/5|shadow-2xl" components/HoldBox.tsx` — zero matches (exit
   code 1), the AC's literal bar.
5. Dev-server check — `npm run dev`; curl'd `/` and confirmed the rendered `aria-label="Hold"`
   element's `class` attribute is exactly `"clay-chip flex flex-col gap-2 p-2 "`, the label span's
   class is `"text-xs uppercase tracking-wide text-foreground/70"`, and blank mini-grid squares
   carry `"rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10"` — none of
   `bg-white/5`/`shadow-2xl`/`border-white/10` present anywhere on the page's `HoldBox` output.
   Fetched the served `app/globals.css` (which inlines the vendored kit) and confirmed `.clay-chip`
   compiles to `background: var(--clay-surface-raised); border-radius: var(--clay-radius-sm);
   box-shadow: var(--clay-shadow-raised)`, with `--clay-surface-raised` resolving to `#f7f3eb` and
   `--clay-shadow-raised` resolving to the warm drop-shadow + inset top-left highlight/bottom-right
   shade recipe — the "raised, catches the light" read the ticket's title asks for, and visibly
   distinct from `Board`'s inset-only `.clay-well` recipe.

## Open concerns / limitations

- **Visual verification is reasoned from rendered `class` attributes and resolved CSS custom
  properties, not an observed screenshot.** Same residual-risk shape T-009-03-01/T-009-04-01
  flagged: no headless-browser/screenshot tooling is available in this environment. The
  served-CSS confirmation is a strong proxy — `.clay-chip` is a pre-existing, already-designed kit
  primitive (T-009-01-01), not a hand-tuned value this session invented — but a human glancing at
  `npm run dev` would close this gap in seconds.
- **`NextPreview.tsx` still carries the old dark-glass chrome** (`bg-white/5 shadow-2xl
  border-white/10`), sitting directly beside the now-retoned `HoldBox`. Expected and correctly out
  of scope (T-009-03-04 owns that file per its own ticket), but until it lands, `npm run dev` will
  show one clay tile next to one dark-glass panel in the side-panel row. Not a defect in this
  ticket's own work.
- The broader pre-existing uncommitted-rename-hunks situation (flagged above and by prior
  siblings) remains unresolved — not this ticket's job to fix, but noted again so it doesn't get
  lost across sessions.
- The `/70` opacity chosen for the label (vs. a straight `/50` swap) was a judgment call reasoned
  from `--clay-surface-raised`'s lightness and `GameOverlay.tsx`'s own `/70` muted-subtext
  precedent (Design), not measured against a contrast-ratio tool — a human reviewer with an actual
  rendered view may want to nudge this value, though it is not expected to be illegible.

## Nothing else outstanding

Implementation matches the plan exactly, with the same commit-isolation mechanism (blob-crafting
via `git update-index --cacheinfo`) T-009-03-01 used, applied here because the same pre-existing-
uncommitted-diff condition recurred. Ready for hand-off.
