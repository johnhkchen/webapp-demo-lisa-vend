# T-009-03-04 — Research: next-preview-raised-clay-tile

## Ticket

`NextPreview.tsx`'s panel currently carries the same dark-glass chrome
(`border-white/10 bg-white/5 shadow-2xl`) that `HoldBox.tsx` had, left over from the pre-E-009
neon/glass theme. The AC asks for "the same raised-clay-tile treatment as HoldBox," plus keeping
`NextPreview.test.tsx` green.

## Current state of `components/NextPreview.tsx`

Presentational, props-driven (`queue: PieceType[]`), no state/logic — same discipline as
`Board`/`Cell`/`HoldBox`/`GameOverlay`. Structure:

```tsx
<div
  aria-label="Next"
  className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl"
>
  <span className="text-xs uppercase tracking-wide text-white/50">Next</span>
  <div className="flex flex-col gap-2">
    {queue.map((type, i) => <PreviewTile key={i} type={type} />)}
  </div>
</div>
```

`PreviewTile` (a local sub-component, not `HoldBox`'s inline JSX) renders each queued piece on its
own 64px×64px grid:

```tsx
{Array.from({ length: box * box }, (_, i) =>
  filled.has(i) ? (
    <div key={i} className={`rounded-[2px] ${PIECE_FILL[type]}`} data-next={type} />
  ) : (
    <div key={i} className="rounded-[2px] bg-white/5" />
  ),
)}
```

Two occurrences of `bg-white/5` exist: the outer panel and `PreviewTile`'s blank squares. Unlike
`HoldBox` (one inline grid, `type | null`), `NextPreview` renders **N tiles** — one
`PreviewTile` per `queue` entry, no empty-slot state (an empty `queue` renders zero tiles, already
covered by the "present but empty panel" test). The blank-square treatment inside each tile is
otherwise the identical sub-problem `HoldBox`'s blank squares are.

`PIECE_FILL` (filled-tile color map) is untouched territory — T-009-02-01 already retoned the
`bg-piece-*` tokens it references; this ticket only touches chrome (panel background/border/shadow,
blank-square fill, label color), never the piece palette.

## Sibling components: precedent and status

- **`Board.tsx`** (T-009-03-01, done): swapped its outer panel's `border-white/10 bg-white/5
  shadow-2xl` wholesale for the kit's `.clay-well` primitive (recessed read — a "well," not a
  raised tile).
- **`Cell.tsx`** (T-009-03-02, done): retoned its empty-square fill from `bg-white/5 ring-1
  ring-inset ring-white/5` to `bg-foreground/5 ring-1 ring-inset ring-foreground/10` — rejected
  `.clay-well` at that scale (shadow math tuned for room-sized surfaces, clips into a smudge on a
  small grid square) in favor of the existing `background`/`foreground` token pair.
- **`HoldBox.tsx`** (T-009-03-03): **not yet implemented.** Its ticket is at `phase: plan` — only
  `research.md`/`design.md`/`structure.md` exist in `docs/active/work/T-009-03-03/`, no
  `plan.md`/`progress.md`, and `components/HoldBox.tsx` on disk still carries the old
  `border-white/10 bg-white/5 shadow-2xl` chrome verbatim (confirmed by reading the file and by
  `git diff HEAD -- components/HoldBox.tsx`, which shows only an unrelated import/type rename, no
  chrome edit). T-009-03-04 depends only on `T-009-02-01`/`T-009-01-03` in its frontmatter — not on
  `T-009-03-03` — so per the RDSPI concurrency model these two tickets are siblings Lisa may run in
  parallel, and this ticket cannot literally copy already-shipped `HoldBox` code.
  T-009-03-03's `design.md`/`structure.md` (already written, unimplemented) fully specify the
  intended `HoldBox` treatment: `.clay-chip` for the panel, `text-foreground/70` for the label,
  `bg-foreground/5 ring-1 ring-inset ring-foreground/10` for blank squares. This is the concrete
  "same treatment" the AC refers to — Design will apply the identical decision to `NextPreview.tsx`
  so both panels converge on one clay family regardless of implementation order.
- **`GameOverlay.tsx`** (T-009-04-01, done): retoned via `background`/`foreground` tokens only,
  explicitly rejecting kit primitives because the banner must stay see-through over the board. Does
  not apply here — `NextPreview` is a standalone side panel, not an overlay.

## The kit primitive

`styles/vendor/b28-clay.css` (vendored, T-009-01-01):

```css
/* A small raised token — chips, badges, next/hold tiles. */
.clay-chip {
  background: var(--clay-surface-raised);
  border-radius: var(--clay-radius-sm);
  box-shadow: var(--clay-shadow-raised);
}
```

The kit's own comment names "next/hold tiles" — `NextPreview` is explicitly one of the two
intended consumers. No component in the repo currently uses `.clay-chip` (grep confirms). It is
hand-authored CSS in the vendored file, not a Tailwind `@utility`/`@theme` class, so it is not
subject to Tailwind v4's unused-utility tree-shaking.

`--clay-surface-raised` (`#f7f3eb`) and `--clay-shadow-raised` give the "raised" read, distinct
from `.clay-well`'s recessed, inset-only shadow that `Board.tsx` uses.

## The 'Next' label

`<span className="text-xs uppercase tracking-wide text-white/50">Next</span>` — structurally
identical to `HoldBox`'s old 'Hold' label. `app/globals.css`'s `@theme inline` binds
`--color-foreground` to `--clay-ink` (`#1c1917`); `GameOverlay.tsx` and (per its design doc)
`HoldBox` both land on `text-foreground/70` for muted sub-labels over clay
([[e-009-clay-retone-conventions]]).

## Test coverage (`NextPreview.test.tsx`)

Seven `it` blocks (read in full). None assert on the panel's or tile's className string content —
they check `[aria-label="Next"]` presence, `data-next` count/values/order via `cellsFor`, grid
count via `.grid` selector, empty-queue rendering, and absence of `data-cell`. Zero className
assertions exist (unlike `HoldBox.test.tsx`, which asserts `opacity-40`; `NextPreview` has no
analogous dim state). Zero test risk from swapping panel/tile chrome classes — chrome and test
assertions are fully decoupled (both files already independently note this same decoupling).

## Constraints / non-goals

- `PIECE_FILL` map and filled-square rendering: untouched (T-009-02-01's job, already done).
- `HoldBox.tsx`: separately ticketed (T-009-03-03), not touched by this ticket even though it
  shares the identical old chrome pattern and target treatment.
- No new `app/globals.css` token or `@theme` binding needed — the kit's vendored `.clay-chip` and
  the existing `foreground` token cover everything.
- `GameContainer.tsx`'s layout/wrapping of `<NextPreview/>`: out of scope, no chrome there.
