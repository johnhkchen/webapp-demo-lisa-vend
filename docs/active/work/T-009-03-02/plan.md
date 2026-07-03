# T-009-03-02 — Plan: cell-empty-state-clay-retone

## Steps

1. **Edit `components/Cell.tsx`'s empty-square branch.**
   Replace the className literal on the empty-square `<div>` (currently
   `"motion rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5"`) with
   `"motion rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10"`.
   No other line in the file changes.
   *Verification:* `grep -n "bg-white\|ring-white" components/Cell.tsx` returns nothing.

2. **Run the three tests named in Research/Structure as touching this path.**
   `npm test -- --run components/Cell.test.tsx components/Board.test.tsx components/Board.flash.test.tsx`
   Expect all previously-passing tests (16 across the two named files, plus whatever
   `Board.flash.test.tsx` contains) to still pass unmodified — Research found none of them pin
   the literal fill/ring class string.
   *Verification:* exit code 0, no failed/skipped tests reported.

3. **Run the full repo test suite as a regression check.**
   `npm test`
   Confirms no other component/test incidentally depended on `bg-white/5 ring-white/5` (e.g. a
   snapshot test elsewhere, though Research found no such file). Matches `T-009-04-01`'s review
   practice of a full-suite pass before calling a leaf-level style change done.
   *Verification:* all files/tests green, same pass count as the pre-change baseline
   (established before Design began: 3 files / 16 tests for the targeted subset — full-suite
   count to be captured live at execution time, expect no change in count since no test is
   added or removed).

4. **Run lint.**
   `npm run lint` (`eslint --max-warnings 0`)
   *Verification:* zero warnings/errors.

5. **Grep-verify the AC's literal negative condition.**
   `grep -n "bg-white/5\|ring-white/5" components/Cell.tsx` — expect no output, mirroring how
   `T-009-04-01`'s review.md verified its AC by direct grep rather than visual inspection alone.

6. **Commit.**
   One commit for the `Cell.tsx` change plus the completed RDSPI artifact set (`research.md`,
   `design.md`, `structure.md`, `plan.md`, `progress.md`) — `progress.md` and `review.md` are
   written/finalized after this commit per the RDSPI phase order, so `review.md` lands in the
   working tree but the commit boundary is "code + supporting artifacts through Plan," matching
   observed prior-ticket commit shape (`git log`: `feat(T-009-04-01): retone GameOverlay banner
   onto clay palette` was a single commit for the component edit; a second `docs(...)` commit
   followed separately for the review artifact). This ticket is small enough that a single
   commit covering the code change is sufficient; `progress.md`/`review.md` may be included in
   that same commit or a fast-follow `docs(...)` commit — decided at Implement time based on
   whether Review surfaces anything worth a separate commit boundary.

## Testing strategy

- **Unit-level:** no new unit test is planned. This is a pure className substitution on an
  existing, already-tested render branch (`Cell.test.tsx`'s "renders an empty square with no
  fill and no ghost marker" test already covers the branch's observable contract:
  `data-cell`, no `data-ghost`, no `bg-piece-*`). Design's chosen option introduces no new prop,
  branch, or conditional — there is no new *behavior* to pin, only a new visual token, and
  `T-009-04-01`'s review.md already established the project's precedent that class-string
  pinning tests are considered brittle and not added for pure palette edits (flagged there as a
  judgment call, not overturned since).
- **Integration-level:** `Board.test.tsx` and `Board.flash.test.tsx` already exercise `Cell`
  through `Board`'s full grid-rendering path (including alongside ghost/flash overlays) — these
  serve as the integration check that the new empty-cell fill doesn't break `Board`'s existing
  `data-cell`/`data-ghost` invariants when composed with the rest of the grid.
  ~200 lines end.
- **Manual/visual:** not performed in this session (no browser-automation tool available, per
  `T-009-04-01`'s precedent) — flagged as an open concern in `review.md`, not a blocking gap for
  completing the ticket's coded AC.

## Rollback

Single-line className revert if anything regresses; no migration, no data, no multi-file
coordination — lowest-risk change shape in this codebase.
