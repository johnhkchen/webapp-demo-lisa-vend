# Research — T-004-04-01: throwaway-probe-all-effects

Map the terrain for a *verification* ticket. Descriptive only — what exists, where, and the
constraints this ticket inherits. No solution proposed here.

## The ask

This is the **final** ticket of epic E-004 (`neon-glass-design-system`) and the sole ticket of story
S-004-04 (`vocabulary-probe-verification`). Unlike its five predecessors it authors **no new
vocabulary**. Its job is to *prove* the vocabulary those tickets shipped is live and on-brand
end-to-end, in one shot, via a **single throwaway probe** that exercises every token/utility/keyframe
**simultaneously**, and to confirm the epic's hard boundary held (no `components/`, `lib/`, or
app-tick files were edited to build the theme). The probe is removed before the ticket closes — it is
scaffolding for a proof, not a deliverable.

## The acceptance criterion, decomposed

> A throwaway probe renders all seven piece hues, a glass panel, a neon glow, the row-clear flash,
> and a 60fps transition simultaneously; `git diff --stat` shows only theme/globals changes and zero
> component/lib/app-tick edits; probe is removed before close.

Three separable obligations:
1. **Render everything at once** — seven hues + glass + glow + flash + motion in one frame.
2. **Boundary proof** — final `git diff --stat` over `app components lib` shows only `app/globals.css`
   (or nothing), never a component/lib/app-tick edit.
3. **Throwaway** — the probe leaves no trace in the tracked tree at close.

## What already exists (the thing under test)

The complete E-004 vocabulary lives in **one file**: `app/globals.css`. There is no Tailwind config
file — Tailwind v4, configured CSS-first via `@import "tailwindcss"` + `@theme` blocks.
`postcss.config.mjs` wires `@tailwindcss/postcss`. Top to bottom the file now holds all five
vocabulary items, each shipped and committed by a dependency ticket:

- **Seven piece hues** — `@theme static { --color-piece-i … --color-piece-l }` (T-004-01-01). oklch
  authored; emits `--color-piece-*` custom props **and** the `bg-/text-/border-/ring-piece-*` utility
  family. `static` forces them past Tailwind's tree-shaking with no consumer.
- **Glass panel** — `@layer components { .glass { … } }` (T-004-02-01): backdrop blur+saturate,
  translucent fill, hairline border, depth shadow + lit top rim.
- **Neon glow** — `@layer components { .glow, .glow-i … .glow-l { … } }` (T-004-02-02): 3-layer
  0-offset bloom geometry written once reading `var(--glow-color, currentColor)`; each `.glow-{piece}`
  only sets `--glow-color` to the matching token.
- **Row-clear flash** — bare `@keyframes flash` + `@layer components { .flash { … } }` (T-004-03-01):
  neon-tinted bloom → fade + slight `scaleY` collapse, played once.
- **60fps transition** — `@layer components { .motion, .motion-fast, .motion-slow { … } }`
  (T-004-03-02): `transition-property: transform, opacity` — the compositor-only guarantee.

All five `depends_on` tickets (`T-004-01-01, T-004-02-01, T-004-02-02, T-004-03-01, T-004-03-02`) are
committed on `main` (git log: commits `f44ea9a`, `42cd048`, `11cce2d`, et al.). This ticket runs
against a settled file.

## The load-bearing invariant every predecessor documented

E-004's **HARD BOUNDARY** (epic text, not hidden scope): the epic defines classes/tokens ONLY and
edits **no** component/lib/app-tick file — because those files are the *consuming* render/loop epic's
job. That boundary collides with a Tailwind v4 behavior the siblings worked around: **v4 tree-shakes
`@utility` classes and `@theme`-generated utilities when no scanned source references them.** With no
component consumer allowed, such utilities silently vanish from the production build. The fix, applied
five times: author every class in **`@layer components`**, which emits **unconditionally** and sits
**below** the `utilities` layer (so a future consumer's utilities still compose). Piece color tokens
use `@theme static` for the same "emit-without-consumer" reason.

**Consequence for THIS ticket:** the whole point of a probe here is to confirm that invariant actually
held in the shipped build — i.e. that all five items are present in the *production* CSS with **zero**
component consumers. A probe that itself becomes a permanent consumer would defeat the boundary; hence
"throwaway."

## The tension unique to this ticket: consume-to-prove vs. don't-consume

The predecessors each faced "emit with no consumer." This ticket faces the inverse: to *render* the
vocabulary you must *consume* it (something has to apply `.glass`, `.glow-t`, `.flash`, `.motion`, and
the seven hues). But consuming it inside the tracked app (`app/`, `components/`) would (a) violate the
boundary if it lands in a component and (b) leave a trace, breaking "throwaway." So the probe must
consume the built vocabulary **outside** the tracked tree, or in a tracked file that is **reverted
before close**. The scratchpad (`/private/tmp/.../scratchpad`) is the natural home: it is isolated
from the repo, git never sees it, so "throwaway" and "boundary-clean" are satisfied by construction.

## Verification surface (how predecessors proved "emits, renders")

The proven recipe across all five siblings, which this ticket consolidates into one pass:
- **Build** — `npm run build` compiles `globals.css` → a chunk under `.next/static/chunks/*.css`.
- **Emit grep** — the built chunk contains every rule (piece tokens, `.glass`, `.glow*`, `@keyframes
  flash` + `.flash`, `.motion*`). Confirmed present at research time (grep below).
- **No-consumer grep** — no reference to the classes in `app/`/`components/`/`lib/`.
- **Visual probe** — a throwaway element applies the classes and renders the intended effect
  (screenshot / pinned frames), then is reverted.
- **Gates** — `npm run lint` (`--max-warnings 0`) and `npm run build` exit 0; `git diff --stat`
  over `app components lib` shows only `app/globals.css` (here: nothing, since we add no vocabulary).

### Ground truth captured at research time

A clean `npm run build` + `npm run lint` both exit 0. Grepping the built chunk
(`.next/static/chunks/*.css`) confirms **all five items present** with correct computed values:
- 7 piece tokens, e.g. `--color-piece-i:#00ebeb` (cyan) … `--color-piece-z:#ff4f4f` (red).
- `.glass{ backdrop-filter:blur(12px)saturate(1.4); … box-shadow:0 8px 32px…,inset 0 1px… }`.
- `.glow,.glow-i,…,.glow-l{ box-shadow:0 0 var(--glow-spread-1,4px) var(--glow-color,currentColor),… }`.
- `@keyframes flash{ 0% … 35% …bloom… to{opacity:0;transform:scaleY(.85)} }` + `.flash`.
- `.motion,.motion-fast,.motion-slow{ transition-property:transform,opacity; … }`.

A local headless-capable **Google Chrome** is present at `/Applications/Google Chrome.app/...`, so a
genuine rendered screenshot (not just computed-style assertion) is feasible for the visual half.

## Constraints & assumptions carried into Design

- **No new vocabulary.** The theme is under test, not under construction. Ideal net change to tracked
  source = **zero** (`git diff --stat` empty over `app components lib`), which is *stronger* than the
  AC's "only theme/globals changes."
- **Probe lives outside the tracked tree** (scratchpad) so throwaway + boundary are guaranteed by
  construction, not by remembering to delete.
- **Render against the real built CSS**, not a hand-rolled copy — otherwise the probe proves nothing
  about what actually shipped. Link the emitted `.next/static/chunks/*.css` chunk.
- **All five effects in one frame** — a single probe document, one screenshot, simultaneous.
- **Deterministic proof backs the visual one** — build+grep is the objective evidence; the screenshot
  is corroborating. Both, not either.
- Open question for Design: probe medium (standalone HTML linking the built chunk vs. a temp Next
  route vs. computed-style-only), and how to capture "flash" (a one-shot animation) in a still frame.
