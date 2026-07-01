# Review — T-004-01-01: per-tetromino-neon-color-tokens

Handoff document. What changed, how it was verified, and what a reviewer needs to know without
reading every diff.

## Outcome

Seven signature neon color tokens — one per tetromino — now live in the Tailwind theme layer as
pure config, with **no** component or logic edits. Each piece owns one central, reusable color
that the rest of the E-004 neon vocabulary and the later Cell/Board rendering epic reference by
name. **Acceptance criterion met**: all seven `--color-piece-{i,o,t,s,z,j,l}` tokens resolve to
distinct neon values, emit into the production CSS build (grep-verified present; absent at
baseline), and a throwaway swatch rendered seven visibly distinct hues.

Committed as `a678a1f`.

## What changed

### Modified
- **`app/globals.css`** — added one `@theme static { … }` block (7 tokens + doc comment) after
  the existing `@theme inline` bridge. Nothing else in the file changed; the `background`/
  `foreground` bridge and base styles are untouched.

### Added
- `docs/active/work/T-004-01-01/{research,design,structure,plan,progress,review}.md` — RDSPI
  artifacts.

### Not touched (deliberately — epic hard boundary)
- `components/Cell.tsx`, `components/Board.tsx`, `lib/constants.ts`, `app/layout.tsx`,
  `app/page.tsx`, and all config files. The consuming work (applying `bg-piece-*` to cells) is a
  later rendering epic's scope, not this one.

## The tokens

| Token | Piece | Hue | Source (oklch) | Built (sRGB hex) |
|---|---|---|---|---|
| `--color-piece-i` | I | cyan   | `oklch(0.85 0.15 195)` | `#00ebeb` |
| `--color-piece-o` | O | yellow | `oklch(0.87 0.17 100)` | `#efd62f` |
| `--color-piece-t` | T | purple | `oklch(0.7 0.2 310)`   | `#c474f9` |
| `--color-piece-s` | S | green  | `oklch(0.85 0.21 145)` | `#63f06f` |
| `--color-piece-z` | Z | red    | `oklch(0.68 0.23 25)`  | `#ff4f4f` |
| `--color-piece-j` | J | blue   | `oklch(0.62 0.2 260)`  | `#3480fc` |
| `--color-piece-l` | L | orange | `oklch(0.75 0.19 55)`  | `#ff8a1d` |

Canonical Tetris Guideline mapping; hues spread around the wheel for guaranteed separation.
Exposes both `:root` custom properties and the auto-generated `bg-/text-/border-/ring-piece-*`
utility family.

## Why `@theme static` (the load-bearing decision)

Tailwind v4 **tree-shakes unused theme variables** — proven empirically in this repo: a plain
`@theme` token with no consumer is absent from the production CSS. Since the epic forbids any
component consumer, usage-driven emission was structurally impossible. `@theme static` forces
emission regardless of usage, so the vocabulary exists ahead of its consumers. See `design.md`
Decision 1. This is the single choice a reviewer should sanity-check.

## Verification

| Check | Command | Result |
|---|---|---|
| Absent at baseline | grep prod CSS `--color-piece-` (pre-change) | 0 matches |
| All seven emit | `npm run build` + grep chunk | **7 present**, 7 distinct hex values |
| Distinct values | `sort -u` of `--color-piece-*` | 7 unique |
| Swatch renders 7 hues | throwaway `app/_swatch` with literal `bg-piece-*` | 7 utilities generated, each → its token; reverted |
| Emission survives swatch removal | rebuild with no consumer | 7 tokens still present, 0 `bg-piece-*` utilities |
| Lint clean | `npm run lint` (`--max-warnings 0`) | exit 0 |
| Production build | `npm run build` | exit 0 |
| Boundary held | `git status` source diff | only `app/globals.css` |

No unit tests exist in this repo (no test runner configured); verification is build- and
grep-based, matching the acceptance criterion's wording and the prerequisite ticket's approach.

## Open concerns / notes for downstream

1. **Dynamic class names won't extract.** The rendering epic **cannot** build piece classes as
   `bg-piece-${letter}` — Tailwind's static extractor only sees literal class strings (this bit
   the first swatch attempt; only coincidental matches emitted). Options for that epic: a fixed
   piece→literal-class map, a Tailwind safelist, or inline
   `style={{ background: "var(--color-piece-t)" }}`. Not this ticket's job to decide.
2. **oklch → hex at build time.** The bundler's CSS minifier (lightningcss) resolves oklch to
   sRGB hex in the output; the wide-gamut oklch source is not preserved in the emitted chunk. On
   this repo's target that means slightly less saturated neon than a P3 display could show. The
   `@theme static` doc comment references the intent; if wider gamut matters later, that's a
   build-target/browserslist concern, not a token change.
3. **No consumer yet, by design.** These tokens render nothing on screen until a component applies
   them. That is correct for E-004's theme-only mandate; do not read "nothing visible in the app"
   as a defect.

## Bottom line

Smallest correct change: one additive `@theme static` block, fully verified, boundary-clean.
Ready for the neon vocabulary's next ticket (glass/glow/keyframe utilities) and, eventually, the
rendering epic that consumes these seven colors.
