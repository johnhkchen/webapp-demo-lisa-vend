# T-009-03-02 — Design: cell-empty-state-clay-retone

## Decision up front

Replace `Cell.tsx`'s empty-square fill (`bg-white/5 ring-1 ring-inset ring-white/5`) with
`bg-foreground/5 ring-1 ring-inset ring-foreground/10`:

```tsx
return (
  <div
    className="motion rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10"
    data-cell="empty"
  />
);
```

Two changes from the original: `white` → `foreground` (both fill and ring), and the ring opacity
bumped `5` → `10` so the inset edge stays legible against the well's warm tan-gray background
(Research: `--clay-well` `#ece7dd`) rather than washing out at the same 5% as the fill.

## Options considered

### A — Swap `white` for `foreground`, keep both opacities at `/5` (minimal diff)

`bg-foreground/5 ring-1 ring-inset ring-foreground/5` — the smallest possible edit, one
find-replace.

**Rejected.** `--foreground` (`--clay-ink` `#1c1917`) at 5% opacity over `#ece7dd` (the well) is
a very subtle tint — plausible for the fill (empty squares should recede, not compete with
settled/ghost pieces), but at the same 5% the *ring* nearly disappears, and the ring is what
reads as "recess edge" rather than "flat fill." Board's grid uses `gap-px` between cells (1px
gaps show the well's background through), so without a legible ring each empty cell can blur
into its neighbors and into the well itself — closer to invisible-on-light (the exact problem
this ticket exists to fix) than to a "warm ink-tinted recess." Chosen Option A's asymmetric
opacity (fill 5%, ring 10%) fixes this with one extra keystroke, at effectively zero
complexity cost — still a pure literal className string, still no new token.

### B — Reuse the kit's `.clay-well` primitive directly on each cell

Apply `clay-well` (or a scoped variant) to the empty-cell div instead of ad-hoc opacity
utilities, so each empty square is its own miniature "well" with the kit's full inset-shadow
recipe (`--clay-shadow-well`: two inset box-shadows).

**Rejected.** `.clay-well`'s shadow recipe (Research: `styles/vendor/b28-clay.css`) is tuned for
room-sized surfaces (the board itself, `Board.tsx`'s outer grid, or a card) — two multi-pixel
inset blurs (5px/11px and 4px/9px spreads) on a ~2px-radius, sub-20px grid cell would either be
clipped into a solid smudge or dominate the cell's whole visible area, reading as noisy rather
than recessed at this scale. It would also duplicate the well effect the *board* already
provides (Research: `Board.tsx:72` already wraps the whole grid in `.clay-well`) — stacking a
second, smaller well recipe inside a well is redundant shadow math for a 2px square and directly
contradicts the "generous radii, calm" restraint the kit's own header comment asks for. `.clay-well`
is the right primitive for the *board container* (T-009-03-01's job), not for a leaf grid cell.

### C — Introduce a new dedicated token/utility, e.g. `--clay-cell-empty` or a `@layer components`
`.cell-empty` class

Follow the `.glow`/`.motion`/`.flash` pattern already established in `app/globals.css` (grouped
selector in `@layer components`, tunable via CSS custom properties) for a cell-specific recess
treatment, in case ghost/ring geometry needs per-call tuning later.

**Rejected — not yet.** Those `@layer components` utilities exist because Tailwind v4 tree-shakes
`@utility`/`@theme`-generated classes with no scanned consumer, and E-004's *hard boundary*
(logic-free `lib/`, no game-logic leakage) forced the animation/glow vocabulary out of any single
component. The empty-cell fill has no such constraint — `Cell.tsx` is the *only* consumer, single
literal className, no cross-component reuse today (Research found no other component renders a
bare "empty board square"). Adding a new custom property or component-layer class for a two-token,
single-consumer style is the exact premature abstraction CLAUDE.md's project-wide guidance rules
out ("don't design for hypothetical future requirements... three similar lines is better than a
premature abstraction"). If a second consumer appears, promoting the literal to a shared class is
a one-line follow-up, not lost work.

### D — Use `bg-well`/a new `--color-well` Tailwind token bound to `--clay-well` (match the fill to
the board background exactly, ring-only for definition)

Bind a `--color-well` theme token to `--clay-well` and use `bg-well ring-1 ring-inset
ring-foreground/10`, so the empty cell's fill is *literally* the well's own background color
(matching flush) with only the ring supplying edge definition.

**Rejected.** Adds a new `@theme` binding for a single one-off consumer (same premature-abstraction
concern as C), and functionally a flush-match fill plus `gap-px` grid gaps (which already show
the well's true background through) would make empty cells nearly indistinguishable from the
gaps between them — arguably *less* legible than a faint ink tint, not more. The ticket's own
Context phrase — "warm ink-tinted recess" — specifically wants an ink tint, not a flush
background match; Option A satisfies that phrasing directly using tokens that already exist.

## Why Option A wins

- Matches the ticket Context's own phrasing ("warm ink-tinted recess") almost verbatim:
  `--foreground` *is* `--clay-ink`, the kit's warm near-black — tinting with it is definitionally
  an "ink-tinted" fill, no new token needed.
- Follows the established E-009 idiom exactly ([[e-009-clay-retone-conventions]] /
  `GameOverlay.tsx` precedent): named `background`/`foreground` utility reuse, not `--clay-*`
  arbitrary-value syntax, not a new `@theme` binding.
- Zero risk to `CELL_COLOR`/`GHOST_COLOR` or the other two render branches — untouched.
- Zero test risk (Research): neither `Cell.test.tsx` nor `Board.test.tsx` pins the literal
  `bg-white/5`/`ring-white/5` string; both assert only `data-cell`/`data-ghost` and the absence
  of `bg-piece-*`, all still true.
- Stays a one-line literal className edit — no new file, no new CSS, consistent with `Cell.tsx`'s
  own established "literal string, not computed" idiom for its two lookup maps.

## What stays untouched (explicit non-goals)

- `CELL_COLOR`/`GHOST_COLOR` maps and the settled/ghost render branches (T-009-02-01's job,
  already done).
- `Board.tsx`'s own `.clay-well` container chrome (T-009-03-01, in flight, sibling ticket).
- `HoldBox.tsx`/`NextPreview.tsx`'s own `bg-white/5` chrome and empty-slot divs (T-009-03-03/-04
  per `T-009-03-01/design.md`'s scope notes — structurally similar, separately ticketed).
- No new `app/globals.css` token or `@layer components` class.
