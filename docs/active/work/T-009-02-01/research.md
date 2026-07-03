# T-009-02-01 — Research: retone-piece-oklch-palette-for-clay

## Ticket ask

Retune the seven `--color-piece-*` oklch values in the `@theme static` block from
high-chroma neon to muted-but-distinct hues that read correctly on cream clay, keeping the
existing `bg-`/`ring-piece-*` utility family so every consumer keeps working unmodified.

Acceptance criterion: the seven `--color-piece-*` oklch chroma values in `app/globals.css`
are measurably lower than today's neon set (still one hue per I/O/T/S/Z/J/L, still visually
distinguishable) when checked against the pre-change values.

## Where the tokens live

`app/globals.css`, `@theme static` block (lines 33-41 in the current working tree):

```css
@theme static {
  --color-piece-i: oklch(0.80 0.13 75);   /* amber  */
  --color-piece-o: oklch(0.78 0.11 190);  /* teal   */
  --color-piece-t: oklch(0.72 0.16 10);   /* rose   */
  --color-piece-s: oklch(0.66 0.17 300);  /* violet */
  --color-piece-z: oklch(0.82 0.16 120);  /* chartreuse */
  --color-piece-j: oklch(0.70 0.17 40);   /* coral  */
  --color-piece-l: oklch(0.75 0.12 240);  /* sky    */
}
```

`@theme static` (not `@theme` or `@theme inline`) forces Tailwind v4 to emit these as real
custom properties plus the full `bg-`/`text-`/`border-`/`ring-piece-*` utility family
regardless of whether a component references them yet — documented in the block's own header
comment. This is a hard constraint the retone must preserve: changing to `@theme` (non-static)
would let Tailwind tree-shake the utilities away.

## IMPORTANT: two baselines exist, not one

`git log --oneline -- app/globals.css` shows the last **committed** state (from E-004,
`a678a1f feat(T-004-01-01)`) used a much hotter palette:

```css
--color-piece-i: oklch(0.85 0.15 195); /* cyan   */
--color-piece-o: oklch(0.87 0.17 100); /* yellow */
--color-piece-t: oklch(0.7 0.2 310);   /* purple */
--color-piece-s: oklch(0.85 0.21 145); /* green  */
--color-piece-z: oklch(0.68 0.23 25);  /* red    */
--color-piece-j: oklch(0.62 0.2 260);  /* blue   */
--color-piece-l: oklch(0.75 0.19 55);  /* orange */
```

Chroma range: **0.15–0.23**. This is the true committed pre-change state.

But `git diff app/globals.css` (working tree vs. HEAD) shows the file has **already been
partially edited, uncommitted**, to the amber/teal/rose/violet/chartreuse/coral/sky set shown
above — chroma range **0.11–0.17**. This edit also renamed the block's header comment
("Per-tetromino" → "Per-piece") and retoned the unrelated `.flash` keyframe tint from
`oklch(0.97 0.06 200)` (cool cyan-white) to `oklch(0.97 0.03 90)` (warm cream-white, matching
`--clay-bg`'s hue ~78-84).

This matches a note left in `docs/active/work/T-009-01-02/progress.md` ("Note on working-tree
state"): that ticket's agent found the same uncommitted hunks already present in `globals.css`
before it started, attributed them to "a piece-palette-retoning ticket from S-009-02+
mid-flight on the same file," and left them alone since they didn't overlap its own edit
region. No `docs/active/work/T-009-02-01/` directory existed before this session (confirmed:
directory was empty until created for this research artifact) — so no prior RDSPI artifacts
document this intermediate edit. It is orphaned in-progress work, not a completed ticket.

**Consequence for this ticket:** the intermediate uncommitted values (0.11–0.17 chroma) are
themselves still a "neon set" relative to the clay aesthetic (see below) — they are a step in
the right direction (hue choices already shifted toward warmer, more clay-compatible hues:
amber/teal/rose/violet/chartreuse/coral/sky vs. the original cyan/yellow/purple/green/red/
blue/orange) but chroma has not been brought down to a level that reads as "muted" next to the
kit's own brand accent (see below). This ticket's job is to finish that job, not just verify
what's already there.

## The clay kit's own chroma vocabulary

`styles/vendor/b28-clay.css` (vendored via T-009-01-01, wired into `globals.css` via
T-009-01-02's `@import` on line 2) defines the palette this repo is retoning toward. Converting
its hex tokens to oklch (sRGB → linear → OKLab, standard matrices):

| Token | Hex | oklch (L, C, H) | Role |
|---|---|---|---|
| `--clay-primary` | `#44679b` | `0.511, 0.093, 258.1` | steel-blue accent (buttons/links) |
| `--clay-bg` | `#faf8f5` | `0.980, 0.005, 78.3` | page background |
| `--clay-surface` | `#f2eee6` | ~`0.95, 0.011, 84.6` | raised material |
| `--clay-ink` | `#1c1917` | `0.216, 0.006, 56.0` | body text |

The kit's only chromatic (non-neutral) color is `--clay-primary` at **C = 0.093**. Every other
token is near-achromatic (C ≤ 0.011). This is the ceiling the ticket's "muted-but-distinct"
language implies: the piece palette is a secondary/tertiary game-board vocabulary, not the
brand accent, so it should sit at or below `--clay-primary`'s chroma, not above it. The current
intermediate values (0.11–0.17) all exceed 0.093; none currently reads as "muted" by the kit's
own standard.

Background surfaces the pieces render on are all very high lightness (`--clay-bg` L=0.98,
`--clay-surface` L≈0.95) and near-achromatic — so hue/chroma contrast (not lightness contrast)
is what will make pieces read as distinct fills against a light, warm-neutral field. `--clay-well`
(recessed board surface, not yet computed above but visually similar order of L to `--clay-surface`)
is the backdrop the actual board cells sit on, per `Board.tsx`/`Cell.tsx` usage.

## Consumers — confirmed unmodified-by-design

Grep across `components/` and `app/` for `piece-` confirms three consumers, all reading the
utility classes as **literal strings**, never computed/interpolated:

- `components/Cell.tsx` — `CELL_COLOR` (`bg-piece-i` etc.) and a second map for ghost/outline
  cells (`bg-piece-i/15 ring-1 ring-inset ring-piece-i/60` etc.), lines 31-53.
- `components/HoldBox.tsx` — local `bg-piece-*` literal map, lines 37-43.
- `components/NextPreview.tsx` — local `bg-piece-*` literal map, lines 36-42.
- `app/globals.css` itself — `.glow-i` through `.glow-l` (lines 98-118) each set
  `--glow-color: var(--color-piece-i)` etc., so the glow halo automatically retones with the
  base token, no separate edit needed.

All three component files carry an identical comment explaining *why* the maps are literal
strings rather than `bg-piece-${type}`: Tailwind v4 only emits utilities it finds as literals in
source, so a template-interpolated class name would be tree-shaken. This is exactly why the
ticket's constraint ("keeping the existing utility family so every consumer keeps working
unmodified") is satisfiable purely by editing the `oklch(...)` values inside the `@theme static`
block — the utility *names* (`bg-piece-i`, `ring-piece-t`, etc.) never change, only what color
each one resolves to. No component file needs to be touched.

## Tests that reference `bg-piece-*`

`Board.test.tsx`, `Cell.test.tsx` assert on **class name substrings** (`"bg-piece-i"`,
`"bg-piece-s/15"`, `"ring-piece-t/60"`, etc.), never on resolved color values or oklch numbers.
Confirmed via grep — no test file asserts a specific oklch/hex value. Chroma/lightness changes
to the token definitions cannot break any existing test.

## Build / verification tooling available

Same as documented in T-009-01-02's research: `npm run build` (`vinext build`), `npm run dev`,
`npm run test` (vitest, 32 files / 302 tests as of that ticket), `npm run lint`. No visual
regression tooling exists in this repo; verification of "reads correctly on cream clay" and
"visually distinguishable" is necessarily manual/reasoned (oklch chroma/hue math + optional
dev-server screenshot), not automated.

## Constraints and assumptions surfaced

- Scope is strictly the seven `--color-piece-*` lines inside `@theme static`. The `.flash`
  keyframe tint retone and the "Per-tetromino"→"Per-piece" comment rename already sitting
  uncommitted in the working tree are **not** this ticket's doing and are left alone (out of
  scope; belongs to whatever ticket produced them, likely an E-004-cleanup or S-009-02
  sibling).
- Hue assignment (one signature hue per piece, I/O/T/S/Z/J/L) is explicitly preserved per the
  AC — this is a chroma/lightness retone, not a hue reassignment. The current intermediate
  hues (75/190/10/300/120/40/240) are reasonable and already warmer than the original neon set;
  no evidence in the ticket or epic docs that hue reassignment is wanted.
- "Measurably lower" and "when checked against the pre-change values" point at the **committed**
  baseline (0.15–0.23) as the reference point for "today's neon set," per the ticket's own
  Context line ("from high-chroma neon"). The safest design lands below *both* the committed
  baseline and the uncommitted intermediate baseline, so the AC holds under either reading.
- No numeric chroma ceiling/floor is specified in the ticket — "muted-but-distinct" and
  "visually distinguishable" are the only qualitative guardrails. `--clay-primary`'s C=0.093 is
  the most concrete anchor available in the codebase for what "muted" means in this kit.
