# T-009-03-03 — Progress: hold-box-raised-clay-tile

## Completed

All Plan steps executed as written, no deviations:

1. **Panel container → `.clay-chip`** — `components/HoldBox.tsx`'s outer `<div>` className changed
   from `` `flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl ${canHold ? "" : "opacity-40"}` ``
   to `` `clay-chip flex flex-col gap-2 p-2 ${canHold ? "" : "opacity-40"}` ``.
2. **'Hold' label → ink token** — `text-white/50` → `text-foreground/70`.
3. **Blank mini-grid squares → recess pair** — `bg-white/5` → `bg-foreground/5 ring-1 ring-inset
   ring-foreground/10`.
4. **Grep check** — `grep -nE "border-white/10|bg-white/5|shadow-2xl" components/HoldBox.tsx`
   returns zero matches (exit code 1).
5. **Tests** — `npx vitest run HoldBox`: 7/7 passing, unmodified test file. Full suite:
   `npx vitest run`: 32 files / 302 tests, all passing.
6. **Lint** — `npx eslint components/HoldBox.tsx --max-warnings 0`: clean.
7. **Dev-server visual verification** — `npm run dev`, curl'd the rendered `/`:
   - Panel: `class="clay-chip flex flex-col gap-2 p-2 "` on the `aria-label="Hold"` element.
   - Label: `<span class="text-xs uppercase tracking-wide text-foreground/70">Hold`.
   - Blank squares: `rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10`.
   - Served `app/globals.css` (and vendored kit within it) confirms `.clay-chip` compiles to
     `background: var(--clay-surface-raised); border-radius: var(--clay-radius-sm); box-shadow:
     var(--clay-shadow-raised)`, and `--clay-shadow-raised`/`--clay-surface-raised` resolve to the
     warm raised recipe (`#f7f3eb` surface, ink-tinted drop + inset highlight/shade) — the "raised
     clay tile" read the ticket asks for, distinct from `Board`'s recessed `.clay-well`.
   - No screenshot/headless-browser tool is available in this environment (same gap
     T-009-03-01/T-009-04-01 flagged); verification is via rendered `class` attribute + resolved
     CSS custom properties, not an actual pixel screenshot.

## Deviations from the plan

None. All six steps executed in the order and manner Plan described.

## Pre-existing uncommitted state, handled like T-009-03-01

`components/HoldBox.tsx` already carried an unrelated uncommitted diff at session start (global
`TetrominoType`→`PieceType` rename, `lib/tetrominoes`→`lib/pieces` import path, "tetromino"→
"piece" wording in the doc comment and `PIECE_FILL`/`HoldBoxProps` type annotations) — another
in-flight ticket's work, consistent with the RDSPI concurrency model (multiple threads on one
branch, file-lock serialization only). Confirmed via `git diff` that this ticket's three edits sit
in separate hunks from that rename diff (the return-statement/JSX hunks vs. the import/type-
annotation hunks), so isolation was possible.

Committed only this ticket's three edits by constructing the target blob directly — took `git show
HEAD:components/HoldBox.tsx`, applied only the three className changes (Design/Structure) on top
of that HEAD content (leaving `TetrominoType`/`lib/tetrominoes`/"tetromino" wording exactly as
HEAD had them), hashed the result with `git hash-object -w`, and staged it via `git update-index
--cacheinfo` — the same mechanism T-009-03-01 used for the same reason. Verified `git diff --cached
-- components/HoldBox.tsx` showed exactly the two intended hunks (panel+label, blank square)
before committing. The working tree file itself is untouched by this staging trick — it still
carries both this ticket's edits and the pre-existing rename diff, so nothing is lost; only the
*commit* is scoped narrowly.

## Commit

Single commit, `feat(T-009-03-03): retone HoldBox panel as raised clay tile`, containing:
- `components/HoldBox.tsx` (the isolated 2-hunk diff above)
- `docs/active/work/T-009-03-03/{research,design,structure,plan,progress}.md`

`review.md` follows in the same session, added as the final artifact per the RDSPI workflow (no
ticket-frontmatter edits — phase/status transitions are Lisa's job).

## Remaining work

None for this ticket. `NextPreview.tsx`'s identical old chrome is T-009-03-04's separate scope,
untouched here as designed.
