# Design — T-004-01-01: per-tetromino-neon-color-tokens

Decisions, with rationale grounded in Research. Three questions to settle: (1) *how* the tokens
get into the build so they survive tree-shaking, (2) *what color format/values* the seven hues
take, (3) *how* emission and distinctness get verified without violating the epic's no-component
boundary.

## Decision 1 — Emit via `@theme static`, not plain `@theme`

**Chosen:** declare the seven tokens in a dedicated `@theme static { … }` block.

Research proved empirically (tailwindcss 4.3.2, this repo) that Tailwind v4 tree-shakes unused
theme variables: a plain `@theme` token with no consumer is **absent** from the production CSS.
The acceptance criterion demands the tokens emit in the *committed* build — where, per the epic's
hard boundary, **nothing** consumes them (no Cell/Board edits, swatch reverted). So usage-driven
emission is structurally impossible here without breaking the boundary.

`@theme static` forces every declared variable into `:root` regardless of usage — verified: the
probe token emitted, with a bonus sRGB `@supports` fallback for the oklch value. This is the
purpose-built mechanism for "token exists as vocabulary, consumer comes later," which is exactly
the epic's model ("define the vocabulary once… rendering work applies classes later").

**Rejected — plain `@theme inline` / `@theme` + rely on the swatch:** fails the committed-build
grep the instant the throwaway swatch is removed. Would only pass if the swatch were committed,
which violates both "throwaway" and the no-component boundary.

**Rejected — keep tokens as raw `:root` custom properties only (no `@theme`):** they'd emit, but
would generate **no Tailwind utilities** (`bg-piece-i` etc.). The epic's whole point is a
vocabulary components later apply *as classes*; raw vars give color values but not the utility
surface. `@theme static` gives both the `:root` variables *and* the utilities.

**Rejected — a committed dummy consumer (e.g. a hidden `<span className="bg-piece-i">`):** drags
a `components/`/`app/` edit into a theme-only ticket, violating the hard boundary, and is uglier
than the first-class `static` option.

## Decision 2 — oklch neon values on the canonical piece→hue mapping

**Chosen:** oklch, high chroma, keyed to the classic Tetris Guideline identities:

| Token            | Piece | Hue      | Value                   |
|------------------|-------|----------|-------------------------|
| `--color-piece-i`| I     | cyan     | `oklch(0.85 0.15 195)`  |
| `--color-piece-o`| O     | yellow   | `oklch(0.87 0.17 100)`  |
| `--color-piece-t`| T     | purple   | `oklch(0.70 0.20 310)`  |
| `--color-piece-s`| S     | green    | `oklch(0.85 0.21 145)`  |
| `--color-piece-z`| Z     | red      | `oklch(0.68 0.23 25)`   |
| `--color-piece-j`| J     | blue     | `oklch(0.62 0.20 260)`  |
| `--color-piece-l`| L     | orange   | `oklch(0.75 0.19 55)`   |

**Why oklch:** (a) it is Tailwind v4's own palette format, so these read as native theme values;
(b) oklch's perceptual lightness lets all seven sit at a similar visual brightness while each
holds maximum chroma — the essence of a *neon* set that reads as a coherent family rather than a
random assortment; (c) `@theme static` auto-emits an sRGB `@supports` fallback (observed in the
probe), so older engines still get a color. Hues are spread around the wheel
(195/100/310/145/25/260/55°) guaranteeing visible separation — the two closest, red (25°) and
orange (55°), are 30° apart and further separated by lightness (0.68 vs 0.75).

**Why the canonical mapping:** the epic says each piece owns a "signature hue"; I/O/T/S/Z/J/L have
well-known Tetris colors (cyan/yellow/purple/green/red/blue/orange). Matching them makes the
vocabulary self-documenting and what a downstream renderer will expect. There is **no** existing
piece/color data in the repo (Research), so nothing to reconcile — this sets the convention.

**Rejected — hex literals (matching `#0a0a0f`):** valid and simpler to eyeball, but loses the
uniform-brightness control that makes a neon set cohere, and diverges from Tailwind v4's palette
idiom. The scaffold's two hex vars are structural (bg/fg), not brand hues; the neon palette is
where oklch earns its place.

**Rejected — pulling colors from a JS/TS constants file (e.g. `lib/`):** violates the boundary
(that's a `lib/` edit) and inverts the epic's intent — the theme is the single source of truth
for color; logic later reads *from* the token, not the reverse.

## Decision 3 — Verify with a reverted throwaway swatch + production grep

**Chosen two-part verification, matching the acceptance criterion's two clauses:**

1. **Emission (committed state):** `npm run build`, then grep the emitted CSS chunk for all seven
   `--color-piece-*` names → expect all seven present; confirm all seven **absent** at baseline
   (`git stash`) → proves "emit into production build, absent at baseline." Also confirm each
   resolves to a distinct value string in the output.
2. **Distinct hues (render proof):** temporarily add a throwaway swatch (a small `app/` element
   or a scratch route) using `bg-piece-*` utilities, run the dev/build, observe seven visibly
   distinct squares, then **revert** it so the committed diff is `globals.css`-only.

**Why acceptable within the boundary:** clause 2 explicitly says *throwaway* swatch — a probe, not
a deliverable. It never lands in a commit, so the "no component edits" boundary holds in the
committed state. The `static` block (Decision 1) is what makes clause 1 pass *without* the swatch,
so the two clauses aren't in tension.

**Rejected — skip the swatch, trust the values:** the acceptance criterion names the swatch
explicitly; skipping it drops the human-visible distinctness proof. Cheap to add and revert.

## Non-goals (reaffirmed)

No Cell/Board/panel wiring; no glow/shadow, glass, keyframe, or transition tokens (sibling
future work); no new dependency or config file; no change to the existing `background`/
`foreground` bridge. This ticket is exactly seven color tokens plus their verification.
