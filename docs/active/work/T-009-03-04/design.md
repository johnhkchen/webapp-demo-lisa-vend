# T-009-03-04 — Design: next-preview-raised-clay-tile

## Decision up front

Three edits to `components/NextPreview.tsx`, all chrome/label-only, mirroring T-009-03-03's
`HoldBox` design decision (Research) so both panels land on the identical clay treatment
regardless of which ticket's implementation lands first:

1. **Panel container** — replace `rounded-lg border border-white/10 bg-white/5 shadow-2xl` with
   the kit's `.clay-chip` primitive, keeping the layout utilities:

   ```tsx
   className="clay-chip flex flex-col gap-2 p-2"
   ```

2. **'Next' label** — replace `text-white/50` with `text-foreground/70`:

   ```tsx
   <span className="text-xs uppercase tracking-wide text-foreground/70">Next</span>
   ```

3. **`PreviewTile`'s blank mini-grid squares** — replace `bg-white/5` with the same recess pair
   `Cell.tsx`'s empty square (and `HoldBox`'s planned blank squares) use:

   ```tsx
   <div key={i} className="rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10" />
   ```

Nothing else in the file changes: `PIECE_FILL`, `PreviewTile`'s `cellsFor`/`BOUNDING_BOX` usage,
the `box`/`filled` computation, `data-next` attributes, the 64px tile sizing, and the queue-mapping
`flex flex-col gap-2` wrapper are all untouched.

## Options considered

### A — `.clay-chip` for the panel, `foreground`-token reuse for label + blank squares (chosen)

As above. This is not an independent judgment call — it is the same decision T-009-03-03/design.md
already made for the structurally identical `HoldBox` panel, applied here so the two side panels
converge on one visual family (the AC's explicit ask: "keeping the two side panels visually
consistent as one clay family").

**Why this wins:**
- **Panel:** `.clay-chip`'s own doc comment names "next/hold tiles" as its intended consumers —
  `NextPreview` is literally one of the two components this primitive was vendored for. It supplies
  background + radius + shadow together, satisfying the AC's forbidden-string removal in one class
  and matching `.clay-chip`'s "raised" shadow recipe (`--clay-shadow-raised`), distinct from
  `.clay-well`'s recessed one that `Board.tsx` (a different kind of surface — a room-sized well, not
  a small tile) uses.
- **Label:** `text-foreground/70` reuses the same "muted label = base ink token at reduced opacity"
  idiom now established in `GameOverlay.tsx` and (pending) `HoldBox.tsx` — a third use makes it
  unambiguously the site convention, not a one-off. Using the identical `/70` (not re-deriving a
  new opacity) is itself part of what keeps the two panels visually matched.
- **Blank squares:** identical treatment to `Cell.tsx`'s shipped empty-square fix and `HoldBox`'s
  planned one — same scale (small grid squares, ~16px at a widest 4-wide box in a 64px slot, same
  order of magnitude as `HoldBox`'s ~18px squares in a 72px slot), same token pair. Zero new
  decisions.
- Consistency with `HoldBox`'s *design decision* (not its *shipped code*, which doesn't exist yet)
  is what the AC actually requires — "the same treatment as HoldBox" reads correctly as "the same
  design outcome," and that outcome is fully pinned down in T-009-03-03/design.md regardless of
  which ticket's Implement phase runs first.

### B — Token-reuse only; no `.clay-chip`, hand-compose panel chrome from `background`/`foreground` utilities

Rejected for the same reason T-009-03-03/design.md's Option B was rejected: the `background`/
`foreground`-only idiom is for **overlay** cases where the kit's opaque primitives would hide
content that must stay visible underneath ([[e-009-clay-retone-conventions]]). `NextPreview` is not
an overlay — it never needs to show anything through itself. `.clay-chip` is the purpose-built,
already-vendored primitive for exactly this case; hand-rolling its shadow recipe as an arbitrary
Tailwind value would duplicate `--clay-shadow-raised` and reintroduce the "second styling idiom"
the E-009 memory note warns against.

### C — Wait for T-009-03-03 to implement first, then copy its shipped diff verbatim

Block this ticket's Implement phase until `HoldBox.tsx`'s actual chrome edit lands, then transcribe
the same className strings.

**Rejected.** RDSPI's concurrency model (`docs/knowledge/rdspi-workflow.md`) computes the DAG from
each ticket's own `depends_on`; T-009-03-04 lists only `[T-009-02-01, T-009-01-03]`, both already
`done`. Introducing a soft dependency on a sibling ticket that isn't in the frontmatter would be
"a missing dependency edge... a safety net, not a substitute for correct dependency modeling" in
reverse — inventing a blocking relationship the ticket graph doesn't declare, which would stall
this ticket for no benefit: T-009-03-03's `design.md`/`structure.md` already fully specify the
target classNames, so there is nothing left to learn by waiting for its Implement phase. Applying
the same documented decision now produces byte-identical chrome to whatever `HoldBox.tsx` will
ship.

### D — `.clay-chip` for the panel; leave `PreviewTile`'s blank squares as `bg-white/5`

Read the AC as scoped to the panel wrapper only.

**Rejected**, same reasoning as T-009-03-03/design.md's Option C: the AC's forbidden-string list is
a literal substring check across the whole file, and `bg-white/5` on `PreviewTile`'s blank squares
would still match. It would also leave a real visual defect — a dark-glass blank square rendering
near-invisible or as a faint smudge inside a now-light `.clay-chip` panel, the same defect
`T-009-03-02` fixed for `Cell.tsx`.

### E — Reuse `.clay-well` (recessed) for `PreviewTile`'s blank squares

**Rejected** for the identical reason `Cell.tsx`'s and (pending) `HoldBox`'s design docs rejected
it: `.clay-well`'s shadow recipe is tuned for room-sized surfaces and would clip into a solid smudge
at mini-grid-square scale.

## What stays untouched (explicit non-goals)

- `PIECE_FILL` map and the filled-square render branch inside `PreviewTile` (T-009-02-01's job,
  already done).
- `HoldBox.tsx` — separately ticketed (T-009-03-03), not touched by this ticket.
- `cellsFor`/`BOUNDING_BOX`-derived sizing, `box`/`filled` computation, the 64px tile dimensions,
  `data-next`/`aria-label` attributes, the outer `flex flex-col gap-2` queue wrapper — no
  behavioral or data-flow change.
- No new `app/globals.css` token, `@theme` binding, or `@layer components` class.
