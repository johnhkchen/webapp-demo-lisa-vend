# T-009-03-02 — Research: cell-empty-state-clay-retone

## Ticket scope

`Cell.tsx`'s empty-square branch (the `cell === null && ghost === null` fallthrough) renders:

```tsx
<div
  className="motion rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5"
  data-cell="empty"
/>
```

`bg-white/5 ring-white/5` is a leftover from the dark-glass/neon theme (translucent white on a
near-black page). Since E-009's clay retone landed on `app/globals.css` (light `--clay-bg`
`#faf8f5` page) and `Board.tsx` now wraps the grid in `.clay-well` (background `--clay-well`
`#ece7dd`, a warm tan-gray), `bg-white/5` over `#ece7dd` renders as a barely-perceptible lighter
fleck — visually "invisible/wrong" per the ticket's Context, not a recess at all. AC requires
replacing it with "a warm ink-tinted recess treatment" and requires `Cell.test.tsx` /
`Board.test.tsx` keep passing. Settled/ghost fills (`CELL_COLOR`/`GHOST_COLOR` maps,
`bg-piece-*`/`ring-piece-*`) already read correctly against clay and are explicitly out of
scope (T-009-02-01 already retoned the underlying oklch tokens).

## Current file: `components/Cell.tsx`

Three render branches, in order: settled (`cell !== null`) → ghost (`ghost !== null`) → empty
(fallthrough). Only the third (lines 83–88) is in scope. All three share the `motion
rounded-[2px]` prefix and a `data-cell` attribute; empty carries no `data-ghost`. `CELL_COLOR`/
`GHOST_COLOR` are literal Tailwind-class lookup tables (deliberately not computed strings — see
the file's doc comment on tree-shaking) — not directly relevant here since the empty branch
doesn't consult either map, but establishes the file's "literal class string" idiom I should
follow if I introduce any new lookup.

## Where the empty cell sits visually

`Board.tsx` (`components/Board.tsx:72`) already wraps the grid in `.clay-well` (from the vendored
kit, `styles/vendor/b28-clay.css`): `background: var(--clay-well)` (`#ece7dd`) plus an inset
box-shadow recipe (`--clay-shadow-well`, two inset shadows simulating a pressed-in surface). Every
`Cell` (all three branches) is a grid item inside that well, with `gap-px p-2` on the parent. So
an empty cell's own fill sits *on top of* the well's background and *inside* its shadow — the
cell doesn't need to reproduce the well's shadow recipe itself, just supply a fill order/ring that
reads as "part of the recess" rather than "a hovering chip." (`T-009-03-01`, a sibling in-flight
ticket, owns the well-wrapper itself; not touched here.)

## Established retone idiom (from `app/globals.css` + prior E-009 tickets)

`app/globals.css:15-23` bridges the kit's raw `--clay-bg`/`--clay-ink` custom properties into
Tailwind's `background`/`foreground` theme tokens:

```css
:root {
  --background: var(--clay-bg);
  --foreground: var(--clay-ink);
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

This is what `bg-background`/`text-foreground`/`bg-foreground/NN` (opacity-modified) utilities
resolve to. `GameOverlay.tsx` (T-009-04-01, already merged) retoned an analogous `bg-black/70` →
`bg-foreground/70` and `text-white/70` → `text-background/70`, deliberately choosing named-token
reuse over the kit's raw `--clay-*` custom properties via Tailwind arbitrary-value syntax
(`bg-(--clay-ink)`). My own memory of that ticket's Design phase (`[[e-009-clay-retone-conventions]]`)
records this as the established idiom for the rest of E-009: no component in the repo uses
arbitrary CSS-variable Tailwind syntax; every other themed token (`--color-piece-*`) is likewise
consumed via named utilities (`bg-piece-i`), never `bg-[var(--color-piece-i)]`.

`--foreground` resolves to `--clay-ink` = `#1c1917`, a warm near-black — so `bg-foreground/5`
(5% opacity ink over the clay-well's warm tan) is, by construction, a "warm ink-tinted" fill:
the same mechanism the ticket's own Context phrase describes, and it requires no new token.

## Sibling components with the same stale pattern (out of scope, but relevant precedent)

`HoldBox.tsx:65,83` and `NextPreview.tsx:68,87` both still carry `bg-white/5`/`border-white/10`/
`shadow-2xl` — the same dark-glass idiom, on their own container chrome and their own empty
preview-cell divs. `docs/active/work/T-009-03-01/design.md` (Board's sibling ticket, already
written) explicitly calls these out as separately-ticketed (T-009-03-03, T-009-03-04) and not to
be touched incidentally. This ticket's Cell.tsx change does not affect either file — they render
their own literal `bg-white/5` divs, not `Cell`.

## Tests touching the empty-cell branch

- `Cell.test.tsx:17-24` — "renders an empty square with no fill and no ghost marker": asserts
  `data-cell === "empty"`, no `data-ghost`, and `className` does not contain `"bg-piece-"`. Does
  **not** assert on `bg-white/5` or any specific fill class — any non-`bg-piece-*` fill satisfies
  it as written.
- `Board.test.tsx` — several tests assert `dataset.cell === "empty"` and that empty cells'
  `className` excludes `"bg-piece-"`Q(`Board.test.tsx:56-58`, `:94`, `:109`). Same shape: no
  assertion pins the specific empty-fill class string.
- `Board.flash.test.tsx` — not grepped for `bg-white`/`ring-white`; likely asserts on
  `data-flash-row`/animation classes only (same file-level pattern as `Board.test.tsx`), per
  `T-009-03-01`'s design notes ("neither test asserts on the container's className string").

**Net finding: no existing test pins the literal `bg-white/5 ring-white/5` string.** The AC's
"Cell.test.tsx / Board.test.tsx still pass" is achievable by construction as long as the new fill
still excludes any `bg-piece-*` substring and the `data-cell`/`data-ghost` attributes are
unchanged — both true for any pure className swap on this branch.

## Constraints / assumptions carried into Design

- Single file to edit: `components/Cell.tsx` (the empty-square branch only, lines 83-88).
- Must not touch `CELL_COLOR`/`GHOST_COLOR` or the settled/ghost branches (explicitly out of
  scope per Context).
- Must not introduce arbitrary-value Tailwind syntax (`bg-(--clay-*)`) — established convention
  is named `background`/`foreground` token reuse.
- No new `@theme`/CSS-file token appears necessary: `--foreground` (→ `--clay-ink`) already
  exists and is already wired through `@theme inline`, satisfying "ink-tinted" without adding a
  new custom property.
- Existing tests are not brittle against a fill-class change; still must re-run both suites
  (and the flash suite) after the edit as a regression check, per the AC's explicit phrasing.
