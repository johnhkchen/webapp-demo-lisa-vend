# T-009-03-03 — Research: hold-box-raised-clay-tile

## Ticket

`HoldBox.tsx`'s panel currently carries dark-glass chrome (`border-white/10 bg-white/5
shadow-2xl`) left over from the pre-E-009 neon/glass theme. The AC asks for a "raised clay tile"
treatment plus an ink-toned 'Hold' label, with `HoldBox.test.tsx` still green.

## Current state of `components/HoldBox.tsx`

Presentational, props-driven (`type: PieceType | null`, `canHold: boolean`), no state/logic —
same discipline as `Board`/`Cell`/`GameOverlay`. Structure:

```tsx
<div
  aria-label="Hold"
  data-can-hold={canHold}
  className={`flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl ${
    canHold ? "" : "opacity-40"
  }`}
>
  <span className="text-xs uppercase tracking-wide text-white/50">Hold</span>
  <div className="grid gap-px" style={{ ... 72px x 72px ... }}>
    {/* filled squares: rounded-[2px] + PIECE_FILL[type], data-hold={type} */}
    {/* blank squares:  rounded-[2px] bg-white/5 */}
  </div>
</div>
```

Two occurrences of `bg-white/5` exist in the file: the outer panel (line 65) and the inner blank
mini-grid squares (line 83). The AC's forbidden-string list (`border-white/10 bg-white/5
shadow-2xl`) is a literal substring check — both `bg-white/5` sites must be gone, not just the
panel's.

`PIECE_FILL` (the filled-square color map) is untouched territory — T-009-02-01 already retoned
the `bg-piece-*` tokens it references; this ticket only touches chrome (panel background/border/
shadow, blank-square fill, label color), never the piece palette.

## Sibling components already retoned (precedent)

- **`Board.tsx`** (T-009-03-01, done): swapped `rounded-lg border border-white/10 bg-white/5
  shadow-2xl` on the board's outer grid div wholesale for the kit's `.clay-well` primitive class
  (`className="clay-well grid h-full w-full gap-px p-2"`), keeping only layout/sizing utilities
  alongside it. Chose the kit's own primitive over token-reuse because it is the exact structural
  problem (dark-glass panel chrome → clay chrome) with a purpose-built kit class already covering
  background+radius+shadow in one name. That design doc (`T-009-03-01/design.md`) explicitly
  flags `HoldBox.tsx`/`NextPreview.tsx`'s `bg-white/5`/`shadow-2xl` chrome as "structurally
  identical to Board's old treatment ... separately ticketed" — i.e. this ticket is the intended
  next step of the exact same pattern.

- **`Cell.tsx`** (T-009-03-02, done): retoned the *empty-square* fill (a different, smaller-scale
  problem — a single 2px-radius grid cell, not a panel) from `bg-white/5 ring-1 ring-inset
  ring-white/5` to `bg-foreground/5 ring-1 ring-inset ring-foreground/10`. Explicitly rejected
  applying `.clay-well` to individual cells as "shadow math tuned for room-sized surfaces," and
  rejected inventing a new token, in favor of reusing the existing `background`/`foreground`
  Tailwind aliases already wired in `app/globals.css`. Its design doc **explicitly named
  `HoldBox.tsx`/`NextPreview.tsx`'s own blank-slot divs** as "structurally similar, separately
  ticketed" (i.e. this ticket, T-009-03-03/-04) — the inner blank mini-grid squares in HoldBox are
  the same shape of problem as Cell's empty square, at a similar visual scale (mini-grid squares
  are ~18px at a 4-wide box in a 72px slot — the same order of magnitude as board cells).

- **`GameOverlay.tsx`** (T-009-04-01, done): retoned a full-bleed banner using
  `background`/`foreground` token utilities (`bg-foreground/70`, `text-background`), explicitly
  *rejecting* `.clay-well`/`.clay-surface` kit primitives for that case because they are opaque
  and the banner deliberately needs the frozen board to remain visible underneath it (E-003/E-007
  semantics). This does not apply to `HoldBox`: it is not an overlay, it never needs to show
  anything through itself — it is a standalone side panel, same category as `Board`'s well.

## The kit primitive built for exactly this

`styles/vendor/b28-clay.css` (vendored copy of `https://b28.dev/kit/b28-clay.css`, T-009-01-01):

```css
/* A small raised token — chips, badges, next/hold tiles. */
.clay-chip {
  background: var(--clay-surface-raised);
  border-radius: var(--clay-radius-sm);
  box-shadow: var(--clay-shadow-raised);
}
```

The kit's own header comment names "next/hold tiles" as the intended consumer of `.clay-chip` —
this is a purpose-built primitive for exactly `HoldBox.tsx` (and `NextPreview.tsx`, T-009-03-04).
No component in the repo currently uses `.clay-chip` (confirmed via grep across `app/`/
`components/`) — this ticket would be its first consumer. It is plain hand-authored CSS in the
vendored file (not a Tailwind `@utility`/`@theme` generated class), so it is **not** subject to
Tailwind v4's unused-utility tree-shaking — no `@layer components` wrapper or scanned-consumer
concern applies here, unlike the `.glow`/`.motion`/`.flash` vocabulary in `app/globals.css`.

`--clay-surface-raised` (`#f7f3eb`, "a touch lighter [than `--clay-surface`], catches the
top-left light") and `--clay-shadow-raised` (a warm drop-shadow + inset top-left highlight +
inset bottom-right shade) are the tokens that give `.clay-chip` its "raised" read — distinct from
`.clay-well`'s inset-only, "recessed" read that `Board.tsx` uses. This distinction (raised vs.
recessed) is the whole point of the ticket's title, "hold-box-**raised**-clay-tile."

`.clay-chip` has no border and sets its own `border-radius` (`--clay-radius-sm`, 0.6rem) —
smaller than `.clay-well`'s `--clay-radius` (1rem), appropriate for a small side-panel tile vs. a
room-sized board.

## The 'Hold' label

Currently `<span className="text-xs uppercase tracking-wide text-white/50">Hold</span>` — white
at 50% opacity, a muted label over the old dark-glass panel. The AC wants it "in the new ink
tone." `app/globals.css`'s `@theme inline` binds `--color-foreground` to `--clay-ink` (`#1c1917`,
warm near-black) — the same `foreground` token `Cell.tsx`'s empty-square fill and
`GameOverlay.tsx`'s banner text already reuse (E-009 convention, [[e-009-clay-retone-conventions]]).
`GameOverlay.tsx` uses `text-background/70` for its own muted sub-text (the main heading is full
`text-background`, no opacity) — a precedent for "muted label = base token at reduced opacity,"
not a new token.

## Test coverage (`HoldBox.test.tsx`)

Seven `it` blocks. None assert on the panel's className string content (no `.toContain("border")`
/`bg-white`/`shadow` assertions) — they check: `aria-label="Hold"` presence, `data-hold` count/
values via `cellsFor`, `data-can-hold` + `.toContain("opacity-40")` for the dim state (both
directions), and absence of `data-cell`. The only className assertion is
`box.className).toContain("opacity-40")` / `.not.toContain("opacity-40")` — both survive any
chrome-class rewrite as long as `opacity-40` stays a literal, separate class in the template
string. Zero test risk from swapping panel/blank-square chrome classes.

## Constraints / non-goals

- `PIECE_FILL` map and filled-square rendering: untouched (T-009-02-01's job, already done).
- `NextPreview.tsx`: separately ticketed (T-009-03-04), not touched even though it shares the
  identical old chrome pattern.
- No new `app/globals.css` token or `@theme` binding needed — the kit's vendored `.clay-chip` and
  the existing `foreground` token cover everything this ticket needs.
- `GameContainer.tsx`'s layout/wrapping of `<HoldBox/>`: out of scope, no chrome there.
