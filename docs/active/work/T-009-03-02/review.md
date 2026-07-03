# T-009-03-02 — Review: cell-empty-state-clay-retone

## Summary

Retoned `Cell.tsx`'s empty-square fill off the dark-glass `bg-white/5 ring-white/5` treatment
(invisible/wrong against the light clay palette and `Board.tsx`'s `.clay-well` recess) onto a
warm ink-tinted recess: `bg-foreground/5 ring-1 ring-inset ring-foreground/10`. `--foreground`
resolves through `app/globals.css`'s existing `@theme inline` binding to `--clay-ink`
(`#1c1917`), so the new fill is, by construction, an ink tint — no new CSS token or file was
needed. This follows the same named-token-reuse idiom `GameOverlay.tsx` established in
T-009-04-01 ([[e-009-clay-retone-conventions]]), rather than the kit's raw `--clay-*` custom
properties via Tailwind arbitrary-value syntax.

## Files changed

- **`components/Cell.tsx`** (only file with a functional/visual change):
  - Empty-square branch className: `bg-white/5 ring-1 ring-inset ring-white/5` →
    `bg-foreground/5 ring-1 ring-inset ring-foreground/10` (fill and ring opacities
    deliberately asymmetric — see `design.md` Option A rationale: a `/5` ring nearly
    disappears against the well's `#ece7dd` background, so the ring alone was bumped to `/10`
    to stay legible as a recess edge across the 1px `gap-px` grid seams).
  - `CELL_COLOR`, `GHOST_COLOR`, the settled branch, and the ghost branch are all unchanged.
  - No prop/interface/logic change — still stateless, props-driven, same `data-cell`/
    `data-ghost` contract.
- **`docs/active/work/T-009-03-02/{research,design,structure,plan,progress,review}.md`** — RDSPI
  artifacts (this phase run).

No other source file was modified. `Board.tsx`'s own `.clay-well` container chrome
(T-009-03-01, a sibling ticket already in flight) and `HoldBox.tsx`/`NextPreview.tsx`'s
structurally-identical `bg-white/5` chrome (separately ticketed, per `T-009-03-01/design.md`'s
scope notes) were deliberately left untouched.

## AC verification

- [x] `Cell.tsx`'s empty-square branch no longer uses `bg-white/5 ring-white/5` — verified by
      direct grep (`grep -n "bg-white/5\|ring-white/5" components/Cell.tsx`, no match), not just
      visual inspection.
- [x] It uses a warm ink-tinted recess treatment — `bg-foreground/5 ring-foreground/10`, where
      `--foreground` is `--clay-ink` (`#1c1917`, the kit's warm near-black) via the pre-existing
      `@theme inline` binding in `app/globals.css`.
- [x] `Cell.test.tsx` still passes — 4/4, unmodified. Its empty-square test asserts only
      `data-cell`/`data-ghost`/absence of `bg-piece-*`, never the specific fill class, so the
      retone couldn't have broken it by construction (confirmed live, not just by inspection).
- [x] `Board.test.tsx` still passes — unmodified, same reasoning (asserts `data-cell === "empty"`
      and absence of `bg-piece-*` on empty cells, never the fill class).

## Test coverage

- Existing `Cell.test.tsx` (4 tests) and `Board.test.tsx` suites already cover this branch's
  observable contract (empty `data-cell`, no `data-ghost`, no piece-fill leakage) end-to-end;
  both still pass unmodified.
- `Board.flash.test.tsx` run as an adjacent-path regression check (asserts flash-overlay
  behavior, which composes with but doesn't overlap the empty-cell fill) — still passes.
- **No new test was added.** Same judgment call `T-009-04-01`'s review made and this ticket's
  Design/Plan phases anticipated: a pure className/token substitution introduces no new prop,
  branch, or conditional, so there is no new *behavior* to pin. A test asserting the literal
  `bg-foreground/5` string would be brittle against the next palette iteration and would
  contradict this suite's deliberate choice to assert only on `data-*` attributes and the
  presence/absence of `bg-piece-*`. Flag if project convention disagrees.
- Full repo suite run as a regression check: 32 files / 302 tests, all green — identical
  file/test counts to the pre-change baseline (no test added or removed). Lint clean
  (`eslint --max-warnings 0`).

## Open concerns / limitations

1. **No browser-rendered visual verification.** Same limitation `T-009-04-01`'s review flagged:
   this session had no screenshot/browser-automation tool available. I reasoned about contrast
   from the token values (`--clay-ink` `#1c1917` at 5%/10% opacity over `--clay-well` `#ece7dd`,
   itself sitting on `--clay-bg` `#faf8f5`) and confirmed the className resolves through
   Tailwind's existing `background`/`foreground` theme pipeline (already proven live by
   `GameOverlay.tsx`'s shipped retone), but did not visually inspect the rendered board in a
   browser. A human should eyeball the empty board squares (start a game, watch the grid before
   any pieces settle) before calling this fully done.
2. **Ring opacity (`/10`) was a judgment call, not derived from a spec.** Design's Option A
   rejected symmetric `/5`/`/5` because the ring would be nearly invisible against the well
   background; `/10` was chosen as "clearly present but still faint" without a numeric contrast
   target from the ticket or the kit (the kit's own primitives don't define a per-cell recess
   opacity — `.clay-well`'s shadow recipe operates at a different scale, per `design.md` Option
   B). If a human's visual check finds `/10` too strong or too faint, it's a one-value tweak,
   not a structural change.
3. **Sibling components (`HoldBox.tsx`, `NextPreview.tsx`) still carry the identical stale
   `bg-white/5` pattern** on their own container chrome and empty preview-cell divs. Once this
   ticket lands, the main board's empty squares will visually diverge from those panels' empty
   slots until their own retone tickets (noted as T-009-03-03/-04 in `T-009-03-01/design.md`)
   land. Cosmetic-only divergence, not a regression from this ticket, but worth flagging so it
   isn't mistaken for inconsistent work within this ticket's own scope.

## Nothing else outstanding

No TODOs left in the diff. No known logic risk — this is a leaf-branch, presentation-only,
single-className-string change with a pure token-substitution design (no new tokens, no new
files, no interface change) and a green full test suite + lint.
