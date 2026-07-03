# T-009-04-01 — Review: overlay-banners-clay-retone

## Summary

Retoned `GameOverlay.tsx`'s shared game-over/paused banner chrome off the app's former neon
gradient-clip heading + `bg-black/70 backdrop-blur-sm` dark-glass scrim onto the vendored clay
kit's palette, reusing the `--color-background`/`--color-foreground` Tailwind tokens
(`app/globals.css`) that already alias `--clay-bg`/`--clay-ink`. Heading now renders in `font-bold`
(matching the actually-loaded Lora weight, 600/700 — the old `font-black`/900 wasn't a loaded
weight) and inherits Lora via the pre-existing global `h2 { font-family: var(--font-lora), ... }`
rule; no per-component font class was needed.

## Files changed

- **`components/GameOverlay.tsx`** (only file with a functional/visual change):
  - Outer scrim: `bg-black/70 backdrop-blur-sm` → `bg-foreground/70` (glass/blur removed entirely).
  - Heading: dropped `bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text
    text-transparent` + `font-black`; added `text-background` + `font-bold`.
  - Subtext: `text-white/70` → `text-background/70`.
  - One doc-comment sentence updated to name the clay tokens and E-009.
  - No prop/interface/logic change — still stateless, props-driven, same two-`role` contract.
- **`docs/active/work/T-009-04-01/{research,design,structure,plan,progress,review}.md`** — RDSPI
  artifacts (this phase run).

No other source file was modified. `StartOverlay.tsx` and `app/page.tsx` carry the same
gradient/glass idiom and were deliberately left untouched — out of this ticket's AC (noted in
Research and Design as a sibling-ticket concern, presumably `T-009-04-02`/`-03` in `S-009-04`).

## AC verification

- [x] `GameOverlay.tsx` contains none of `from-cyan-400`, `via-fuchsia-400`, `to-violet-400`,
      `bg-black/70` — verified by direct grep (empty match), not just visual inspection.
- [x] Banner renders in clay tones — `bg-foreground/70` (ink-tinted scrim) / `text-background`
      + `text-background/70` (cream text), both resolving through the already-wired clay tokens.
- [x] Lora heading — the `<h2>` inherits Lora via the existing global selector; unchanged
      mechanism, `font-bold` corrected to match the only weights actually loaded.
- [x] `GameOverlay.test.tsx` still passes — 6/6, file unmodified (its assertions are role/
      textContent only, never className, so the retone couldn't have broken it by construction).

## Test coverage

- Existing `GameOverlay.test.tsx` suite (6 tests) covers: hidden-state null render (both modes),
  game-over alert role + text, paused status role + text, and the mode-default. All still pass,
  unmodified.
- **No new test was added.** This is a pure style/class edit — no new prop, branch, or
  conditional was introduced, so there's no new *behavior* to assert on. Adding a test that
  pins specific Tailwind class strings would be brittle (breaks on the next palette iteration)
  and would contradict the existing suite's deliberate choice to assert only on role/text.
  Judged proportionate for a leaf-level palette swap; flag if project convention disagrees.
- Full repo suite run as a regression check: 32 files / 302 tests, all green. Lint clean
  (`eslint --max-warnings 0`).

## Open concerns / limitations

1. **No browser-rendered visual verification.** This session had no screenshot/browser-automation
   tool available. I confirmed the dev server compiles and serves the page with the new classes
   (rules out a Tailwind syntax error) and reasoned about contrast from the token values
   (`--clay-ink` #1c1917 vs `--clay-bg` #faf8f5 — the kit's own base ink/paper pair, near-maximum
   contrast in the palette), but did not visually inspect the rendered banner in a browser. A
   human should eyeball both variants (trigger game-over via top-out, pause via `P`) before
   calling this fully done — this is the one CLAUDE.md-recommended verification step I could not
   perform end-to-end.
2. **`StartOverlay.tsx` and `app/page.tsx` still use the old neon gradient/glass idiom.** Once
   this ticket lands, the game-over/paused banner will visually diverge from the "Press Start"
   attract-mode overlay and the app title until their own retone tickets land. Cosmetic-only
   divergence, not a regression, but worth flagging so it isn't mistaken for inconsistent work
   within this ticket.
3. **`--clay-shadow-well`/`.clay-well` primitive not used.** Design considered and rejected
   wrapping the banner in the kit's opaque well/surface primitives because they'd fully hide the
   board (breaking the component's documented "frozen board stays visible beneath" intent). If a
   future design wants the overlay to read as a more literal clay object (not just a tinted
   scrim), that's a bigger, deliberate redesign — not something this ticket should have
   silently done.

## Nothing else outstanding

No TODOs left in the diff. No known logic risk — this is a leaf-component, presentation-only,
class-string change with a pure token-substitution design (no new tokens, no new files) and a
green full test suite + lint.
