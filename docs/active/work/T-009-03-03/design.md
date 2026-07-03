# T-009-03-03 — Design: hold-box-raised-clay-tile

## Decision up front

Three edits to `components/HoldBox.tsx`, all chrome/label-only:

1. **Panel container** — replace `rounded-lg border border-white/10 bg-white/5 shadow-2xl` with
   the kit's `.clay-chip` primitive, keeping the layout utilities and the conditional dim class:

   ```tsx
   className={`clay-chip flex flex-col gap-2 p-2 ${canHold ? "" : "opacity-40"}`}
   ```

2. **'Hold' label** — replace `text-white/50` with `text-foreground/70`:

   ```tsx
   <span className="text-xs uppercase tracking-wide text-foreground/70">Hold</span>
   ```

3. **Blank mini-grid squares** — replace `bg-white/5` with the same recess pair `Cell.tsx`'s empty
   square already established:

   ```tsx
   <div key={i} className="rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10" />
   ```

Nothing else in the file changes: `PIECE_FILL`, `cellsFor`/`BOUNDING_BOX` usage, the `box`/
`filled` computation, `data-hold`/`data-can-hold` attributes, and the 72px sizing are all
untouched.

## Options considered

### A — `.clay-chip` for the panel, `foreground`-token reuse for label + blank squares (chosen)

As above. Uses the kit's purpose-built primitive (`.clay-chip` — its own header comment names
"next/hold tiles") for the one thing it was vendored for, and reuses the already-wired
`foreground` token for the two smaller, component-local decisions (label tint, blank-cell recess)
exactly the way `Cell.tsx` and `GameOverlay.tsx` already do.

**Why this wins:**
- **Panel:** `.clay-chip` is not a judgment call between competing options the way `Cell.tsx`'s
  empty-square treatment was (Research: that ticket rejected `.clay-well` as *wrong scale* for a
  single grid cell). Here the scale match is exact — `.clay-chip` is sized and shadowed for
  "small raised token... next/hold tiles" and `HoldBox` *is* a hold tile. Using it is the smallest
  change that satisfies the AC's literal ask (removes all three forbidden strings at once, since
  `.clay-chip` supplies background+radius+shadow together) and its visual intent ("raised," not
  "recessed" — `.clay-chip` uses `--clay-shadow-raised`, the same recipe `Board.tsx`'s `.clay-well`
  deliberately does *not* use).
- **Label:** `text-foreground/70` mirrors `GameOverlay.tsx`'s own muted-subtext idiom
  (`text-background/70` next to a full-opacity heading) — "muted label = base ink token at reduced
  opacity" is now used in two places, not one, reinforcing it as the site convention rather than a
  one-off choice. `/70` (vs. the original `/50`) is chosen because ink-on-light-clay needs more
  opacity than white-on-dark-glass did to stay legible as a "muted but readable" label; a straight
  `/50` swap was checked against `--clay-surface-raised` (`#f7f3eb`, L≈0.95) and reads as too faint
  for an uppercase 12px label at that lightness.
- **Blank squares:** identical treatment to `Cell.tsx`'s already-shipped empty-square fix
  (T-009-03-02) — same scale (small grid squares), same "warm ink-tinted recess" ask from that
  ticket's Context, same token pair. Zero new decisions to make; this is a straight precedent
  application, and `Cell.tsx`'s design doc explicitly anticipated this exact reuse
  ([[e-009-clay-retone-conventions]]).
- All three edits are independently the smallest correct change for their own sub-problem — no
  single stylistic idiom (kit primitive vs. token reuse) is force-fit onto a case it doesn't suit.

### B — Token-reuse only; no `.clay-chip`, hand-compose `bg-background`/`shadow`/`rounded` utilities for the panel

Keep the E-009 "reuse `background`/`foreground` tokens, avoid the kit's opaque primitives" idiom
uniform across *all* three edits, including the panel — e.g.
`bg-background rounded-[0.6rem] shadow-[...]` hand-assembled from `--clay-*` values.

**Rejected.** The `background`/`foreground`-only idiom was established specifically for
**overlay** cases (`GameOverlay.tsx`) where the kit's opaque `.clay-well`/`.clay-surface`
primitives were rejected *because* they'd hide content that must stay visible underneath
(Research: [[e-009-clay-retone-conventions]] — "rejected... because they're opaque and would hide
whatever they're placed over"). `HoldBox` is not an overlay; it never needs to show anything
through itself, so the opacity objection doesn't apply. `Board.tsx` already set the precedent for
non-overlay surfaces: it uses the kit's own `.clay-well` primitive class directly, not a hand-
assembled token composition. Hand-rolling a raised-shadow recipe here would duplicate
`--clay-shadow-raised`'s multi-layer `box-shadow` value as a Tailwind arbitrary-value string —
harder to read, easy to typo, and the exact "second styling idiom" the E-009 memory note warns
against, just in the opposite direction (avoiding the kit primitive where the kit primitive is
the *right* fit, not the wrong one).

### C — `.clay-chip` for the panel; leave the blank mini-grid squares as `bg-white/5`

Read the AC as being about the *panel* only ("no longer contains `border-white/10 bg-white/5
shadow-2xl`" as one chrome-class group), leave the inner grid untouched since the sentence reads
naturally as describing the panel's own former className string.

**Rejected.** The AC is a literal substring check, not a scoped-to-one-element one — `bg-white/5`
still appears in the file (on the blank squares) even after fixing only the panel, so the file
would still "contain" the forbidden string. It also leaves a real visual defect: a dark-glass
`bg-white/5` blank square sitting inside a now-light `.clay-chip` panel would render nearly
invisible against `--clay-surface-raised` (`#f7f3eb`, very light) or, worse, read as a faint dark
smudge — the same "invisible/wrong against a light clay background" problem `T-009-03-02`'s
ticket Context named for `Cell.tsx`'s identical old fill. No reason to reintroduce that defect
here when the fix is already proven and one line.

### D — Reuse `.clay-well` (recessed) for the blank squares instead of the `foreground`-token pair

Since a blank hold-slot square is, arguably, an "empty recess" conceptually similar to a board's
empty cell, apply `.clay-well` directly to each blank square instead of the token-pair fill.

**Rejected** for the same reason `Cell.tsx`'s own design doc rejected it for board cells:
`.clay-well`'s shadow recipe (two multi-pixel inset blurs, 5px/11px and 4px/9px spreads) is tuned
for room-sized surfaces. At an ~18px mini-grid square (a 4-wide box inside a 72px slot) those
blurs would clip into a solid smudge rather than read as a recess. `HoldBox`'s blank squares are
the same order of magnitude as `Cell.tsx`'s board cells (Research), so the same rejection applies
verbatim.

## What stays untouched (explicit non-goals)

- `PIECE_FILL` map and the filled-square render branch (T-009-02-01's job, already done).
- `NextPreview.tsx` — structurally identical old chrome, separately ticketed (T-009-03-04).
- `cellsFor`/`BOUNDING_BOX`-derived sizing, `box`/`filled` computation, the 72px slot dimensions,
  `data-hold`/`data-can-hold`/`aria-label` attributes — no behavioral or data-flow change.
- No new `app/globals.css` token, `@theme` binding, or `@layer components` class.
