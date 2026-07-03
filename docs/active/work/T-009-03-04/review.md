# T-009-03-04 — Review: next-preview-raised-clay-tile

## Summary

Retoned `components/NextPreview.tsx`'s panel chrome from the pre-E-009 dark-glass idiom
(`border-white/10 bg-white/5 shadow-2xl`) onto the b28 clay kit, matching the same design decision
already documented for `HoldBox.tsx` in T-009-03-03 (that ticket's implementation has not landed
yet — see Design/Research for why this ticket did not block on it). All 6 RDSPI artifacts for this
ticket live in `docs/active/work/T-009-03-04/`.

## Files changed

- **`components/NextPreview.tsx`** (modified, one commit: `89feb09`) — three className edits, no
  logic/prop/import changes:
  1. Panel `<div>`: `flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2
     shadow-2xl` → `clay-chip flex flex-col gap-2 p-2`.
  2. 'Next' label `<span>`: `text-xs uppercase tracking-wide text-white/50` → `text-xs uppercase
     tracking-wide text-foreground/70`.
  3. `PreviewTile`'s blank-square `<div>`: `rounded-[2px] bg-white/5` → `rounded-[2px]
     bg-foreground/5 ring-1 ring-inset ring-foreground/10`.
- **`docs/active/work/T-009-03-04/{research,design,structure,plan,progress,review}.md`** — this
  ticket's full RDSPI trail (new).

No other files touched. `components/NextPreview.test.tsx`, `components/HoldBox.tsx`,
`app/globals.css`, `styles/vendor/b28-clay.css` all untouched, as planned.

## Test coverage

- `components/NextPreview.test.tsx`: 7/7 passing, unmodified — no className assertions exist in
  this file (verified by reading it in Research), so the chrome swap is invisible to it by design;
  it still fully covers `aria-label`, `data-next` placement/count/order via `cellsFor`, empty-queue
  rendering, and absence of stray `data-cell`.
- Full suite: `npx vitest run` → 32 files / 302 tests passing, no regressions elsewhere.
- No new tests added. This is a pure presentational chrome substitution with no new branch, prop,
  or data-attribute — nothing new to assert. Considered and rejected adding a `.toContain("clay-
  chip")`-style assertion: neither this file nor `HoldBox.test.tsx` tests literal chrome className
  strings today, and doing so here would be the first instance of that fragile pattern (breaks the
  next time the palette/kit class name is retuned) — see `plan.md`'s testing-strategy section for
  the full reasoning.
- **Gap:** grep-based verification (`border-white/10`/`bg-white/5`/`shadow-2xl` absent) and the
  automated suite are the only checks that ran; there is no automated check that `.clay-chip`
  actually *renders* the intended raised-tile look (that's a CSS/visual property, not something
  jsdom + vitest observes). See Open concerns below.

## Open concerns

1. **No visual/dev-server confirmation.** This was a non-interactive session with no browser
   available. The AC is satisfied on its literal terms (forbidden strings gone, `NextPreview.test.tsx`
   green), and the exact same primitive (`.clay-chip`) plus the exact same `foreground`-token pair
   are already proven working in shipped code (`Board.tsx`'s `.clay-well` sibling primitive,
   `Cell.tsx`'s identical blank-square token pair) — but nobody has looked at `NextPreview` rendered
   with this change. **Recommend a human (or a future session with dev-server access) load the app
   and eyeball the Next panel** before considering this fully done, per this repo's CLAUDE.md
   guidance to verify UI changes in a browser.

2. **`HoldBox.tsx` (T-009-03-03) has not shipped the matching treatment yet.** As of this commit,
   `HoldBox.tsx` still carries the old `border-white/10 bg-white/5 shadow-2xl` chrome — only its
   research/design/structure artifacts exist. This ticket's AC ("keeping the two side panels
   visually consistent as one clay family") is satisfied *in design intent* (both design docs
   independently specify the identical `.clay-chip`/`text-foreground/70`/`bg-foreground/5 ring-1
   ring-inset ring-foreground/10` treatment) but **not yet in the running app** — until
   T-009-03-03's Implement phase lands, `NextPreview` will visually be clay while `HoldBox` sits
   next to it still dark-glass. This is expected/by-design per the ticket DAG (the two are
   independent siblings), not a defect in this ticket's own scope, but worth flagging so nobody is
   surprised by the transient visual mismatch between the two panels until T-009-03-03 also ships.

3. **No new `app/globals.css` or kit changes were needed or made** — confirmed non-issue, noting it
   only because the ticket touches a shared visual system and it's worth being explicit that this
   ticket introduced zero new tokens/primitives, only consumed existing ones.

## Nothing else flagged

- No TODOs left in the touched code.
- No behavioral change: `queue` prop handling, `PreviewTile` sizing/positioning, `data-next`
  attribute discipline, and the `PIECE_FILL` piece-color map are all byte-identical to before.
- Commit `89feb09` is the sole commit for this ticket, as planned (single atomic chrome change).
