# T-009-03-04 — Plan: next-preview-raised-clay-tile

## Steps

1. **Edit `components/NextPreview.tsx`: panel `className`.**
   Replace the outer `<div aria-label="Next" ...>`'s className from
   `"flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl"` to
   `"clay-chip flex flex-col gap-2 p-2"`.
   Verify: file still parses (TypeScript/JSX), no other className on that element.

2. **Edit `components/NextPreview.tsx`: 'Next' label `className`.**
   Replace `"text-xs uppercase tracking-wide text-white/50"` with
   `"text-xs uppercase tracking-wide text-foreground/70"` on the `<span>Next</span>`.

3. **Edit `components/NextPreview.tsx`: `PreviewTile`'s blank-square `className`.**
   Replace `"rounded-[2px] bg-white/5"` (the `else` branch of `filled.has(i) ? ... : ...`) with
   `"rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10"`. Confirm the sibling
   filled-square branch (`` `rounded-[2px] ${PIECE_FILL[type]}` ``) is untouched.

4. **Grep-verify the AC's forbidden strings are gone.**
   `grep -n "border-white/10\|bg-white/5\|shadow-2xl" components/NextPreview.tsx` returns nothing.

5. **Run `components/NextPreview.test.tsx`.**
   `npx vitest run components/NextPreview.test.tsx` — expect all 7 tests green, no changes needed
   to the test file (per Structure's test-impact analysis).

6. **Run the full test suite** (`npx vitest run`) as a regression check — this change touches only
   `NextPreview.tsx`, but confirms nothing else (e.g. `GameContainer.test.tsx`, which renders the
   full tree) incidentally asserted on the old chrome classes.

7. **Visual sanity check.** No dev server / browser render available in this pass (non-interactive
   session); rely on (a) the byte-for-byte precedent already shipped in `Board.tsx` (T-009-03-01)
   and `Cell.tsx` (T-009-03-02) using the identical `.clay-chip`-sibling / `foreground`-token
   patterns without visual regression, and (b) the fact that `.clay-chip` and the `foreground` token
   are already proven-in-repo (vendored kit CSS, already-bound `@theme inline` alias) — no new CSS
   is introduced, only a substitution of already-working primitives. Flag as an open concern in
   Review for a human to eyeball in a dev-server render.

8. **Commit.** One commit for this ticket's full change (single file, three related edits — no
   reason to split).

## Testing strategy

- **Unit tests:** `NextPreview.test.tsx` (existing, unmodified) is the full safety net — it already
  exercises every DOM-observable contract this component makes (`aria-label`, `data-next` per tile,
  tile ordering, empty-queue rendering, no stray `data-cell`). Structure's analysis confirms zero
  className assertions exist, so the suite is a clean pass/fail signal for "did I break behavior"
  without needing to be touched for "did I change chrome."
- **No new tests needed.** This is a pure presentational chrome swap with no new conditional logic,
  no new prop, no new data-attribute — nothing new to assert on. Adding a test that asserts
  `.toContain("clay-chip")` was considered and rejected: `HoldBox.test.tsx`/`NextPreview.test.tsx`'s
  existing convention (confirmed in Research for both tickets) is to test DOM structure/attributes,
  not literal chrome className strings — a className-content test would be the first of its kind in
  either file and would immediately go stale the next time the palette is retuned (the same fragility
  E-009's other retone tickets have consistently avoided introducing).
- **Verification criteria (= the AC, restated as checks):**
  - [ ] `grep` confirms `border-white/10`, `bg-white/5`, `shadow-2xl` are absent from
        `components/NextPreview.tsx`.
  - [ ] `.clay-chip` appears on the panel `<div>`.
  - [ ] `text-foreground/70` appears on the label `<span>`.
  - [ ] `NextPreview.test.tsx` passes unmodified (7/7).
  - [ ] Full suite passes (no incidental regressions elsewhere).

## Commit granularity

Single atomic commit: `feat(T-009-03-04): retone NextPreview panel onto raised clay-chip tile`.
All three edits are one cohesive chrome change to one file: splitting into three commits (panel /
label / blank-square) would fragment a change that only makes visual sense applied together and
that Structure already confirmed has no internal ordering dependency worth serializing on.

## Rollback

If `NextPreview.test.tsx` or the full suite fails after the edit, the change is a pure string
substitution in one file — revert is `git checkout -- components/NextPreview.tsx` before the commit,
or `git revert` after. No migration, no data change, nothing else depends on the old classNames.
