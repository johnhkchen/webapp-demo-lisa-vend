# T-009-03-01 — Plan: board-as-recessed-clay-well

## Steps

1. **Edit `components/Board.tsx` — cell-grid container className.**
   Replace `"grid h-full w-full gap-px rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl"`
   with `"clay-well grid h-full w-full gap-px p-2"` on the `aria-label="RowClear board"` div.
   Verification: `grep -n "bg-white/5\|shadow-2xl" components/Board.tsx` returns no match;
   `grep -n "clay-well" components/Board.tsx` matches this line.

2. **Edit `components/Board.tsx` — flash overlay className (parity fix).**
   Replace `"pointer-events-none absolute inset-0 grid gap-px border border-transparent p-2"`
   with `"pointer-events-none absolute inset-0 grid gap-px p-2"` on the `aria-hidden` overlay div.
   Verification: `grep -n "border-transparent" components/Board.tsx` returns no match; the
   overlay and cell grid share identical `gap-px p-2` and zero border-width, so `gridStyle`
   (shared inline style) is now the only geometry input to either grid — content boxes match.

3. **Run the targeted unit tests.**
   `npm run test -- --run components/Board.test.tsx components/Board.flash.test.tsx`
   Expect: all existing cases pass unchanged (no assertions target className strings — Research/
   Structure). This is the ticket's explicit AC clause ("Board.test.tsx and Board.flash.test.tsx
   still pass").

4. **Run the full suite as a regression check.**
   `npm run test -- --run`
   Expect: same file/test count as the pre-change baseline (32 files / 302 tests, captured this
   session before any edit), all passing. Two chrome-only className edits in one presentational
   component should not be able to move this number, but confirming is cheap and catches any
   surprise (e.g. an unrelated snapshot or a test elsewhere that greps rendered HTML).

5. **`npm run build` and `npm run lint`.**
   Expect both clean. `clay-well` is an existing, already-vendored class (no new CSS, no new
   Tailwind theme entry needed) — build should not need to resolve anything new; lint should not
   flag anything since no logic changed, only a literal className string.

6. **Manual dev-server visual check (the AC's qualitative bar).**
   `npm run dev`, load `/`, look at the board. Confirm by eye:
   - The board's fill reads as the warm `--clay-well` tone, not the old translucent-dark panel.
   - The board reads as recessed (inset shadow: darker top-left inset, lighter bottom-right
     inset) rather than raised or flat — the "pressed into the page" look the AC names.
   - No stray hairline border or drop-shadow remnant from the old dark-glass treatment.
   - The active/ghost/settled piece cells (unrelated `Cell.tsx`, out of scope) still render
     visibly on top of the new well background — a sanity check that contrast isn't accidentally
     broken by the background swap, even though `Cell.tsx` itself isn't edited here.
   - Trigger (or wait for, in attract mode) a line clear and confirm the flash bars still align
     exactly over their rows with no visible 1px seam — the geometry-parity fix from step 2.
   Document the observed result (and any deviation) in `progress.md`.

7. **Commit — isolated to this ticket's two hunks only.**
   Given the repo-wide pattern of pre-existing unrelated uncommitted diffs (Research/Structure),
   stage only the two className hunks inside `components/Board.tsx` (verify via
   `git diff -- components/Board.tsx` shows exactly these two lines changed, or use a partial
   `git add -p`/`git apply --cached` isolating just them if other unrelated hunks land in the
   same file region) plus this ticket's new `docs/active/work/T-009-03-01/` artifacts. Leave every
   other uncommitted hunk in the working tree untouched, matching T-009-02-01's documented
   approach. Confirm with `git show --stat` after committing that only the intended lines/files
   are included.

## Testing strategy

- **Unit (existing, no new tests):** `Board.test.tsx` and `Board.flash.test.tsx` are the AC's
  named regression guard and are re-run, not modified. No new unit test is warranted — there is
  no new logic, branch, or data path to cover; the change is a static className swap on a
  presentational leaf, and Tailwind class-string correctness isn't something this repo's test
  suite checks anywhere (confirmed in Research: no test asserts on chrome class strings for any
  component). Adding a test asserting `container.className.includes("clay-well")` would be
  low-value churn coupling a test to an implementation-detail string, not to behavior.
- **Integration:** none needed — `GameContainer.tsx`'s existing render path already exercises
  `Board` with real props in `GameContainer.test.tsx`-style coverage (unaffected here since no
  prop/interface changed).
- **Manual/visual:** the dev-server check in step 6 is the only way to verify the AC's
  qualitative "reads as a recessed well" language, per Research's confirmation that no visual-
  regression tooling exists in this repo. This mirrors T-009-02-01's precedent for the same gap.

## Atomic commit boundary

One commit: the two `Board.tsx` className hunks + this ticket's RDSPI artifact directory. Small
enough, and dependent-enough on each other (step 2 exists only to keep step 1 geometrically
correct), that splitting them into two commits would leave an intermediate broken-geometry state
in history for no benefit.
