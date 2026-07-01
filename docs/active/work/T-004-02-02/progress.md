# Progress — T-004-02-02: neon-glow-shadow-utilities

Executed the plan step by step. One cohesive additive change; no deviations from Design/Structure.

## Completed

- **Step 1 — Baseline.** Confirmed `glow` absent from the built chunk (`grep glow` → 0) and no
  `glow` in `app/components/lib` source. Clean slate.
- **Step 2 — Source change.** Appended the doc comment + `@layer components { … }` glow block to
  `app/globals.css`, after the `.glass` block and before `html, body`. Grouped-selector geometry
  (3-layer `0 0` box-shadow reading `var(--glow-color, currentColor)`) written once; seven
  `.glow-{piece}` rules each set `--glow-color: var(--color-piece-{piece})`. Matches Structure
  exactly. Nothing above the block changed.
- **Step 3 — Emission proof.** `npm run build` (exit 0). Built chunk contains:
  - the grouped rule `.glow,.glow-i,…,.glow-l{box-shadow:0 0 var(--glow-spread-1,4px) …, … , 0 0
    var(--glow-spread-3,24px) …}` — three layers intact;
  - all seven color rules, each `.glow-{p}{--glow-color:var(--color-piece-{p})}` — tokens
    referenced by name, not re-derived.
  No `glow` consumer in `app/components/lib` source. `@layer components` defeats tree-shaking here
  as it did for `.glass`.
- **Step 4 — Visual probe.** Added throwaway `app/glowprobe/page.tsx` (seven white swatches, one
  per piece class `glow-i…glow-l`, plus a bare `.glow` accent) on the dark canvas. `npm run dev`,
  captured a headless-Chrome screenshot. **Result:** each swatch radiates a bloom in its signature
  hue — I=cyan, O=yellow, T=purple, S=green, Z=red, J=blue, L=orange — matching the `--color-piece-*`
  tokens exactly. The bare `.glow` swatch inherits black `currentColor`, so shows no visible halo on
  the black background (expected — it demonstrates the default, not a piece hue). AC's
  "colored neon bloom matching its piece hue" satisfied. **Probe then deleted** (`rm -rf
  app/glowprobe`); `git status` source scope back to `app/globals.css` only.
- **Step 5 — Gates + boundary.** `npm run lint` (`--max-warnings 0`) exit 0. `npm run build`
  re-run after probe removal, exit 0, and glow rules **still present** with zero consumers —
  proving emission is definition-driven, not usage-driven. `git status` source diff =
  `app/globals.css` only; no `components/`, `lib/`, or app edits — epic hard boundary held.
- **Step 6 — Commit.** Single feat commit `feat(T-004-02-02): add per-piece neon glow/shadow
  utilities to theme` (source + this ticket's `work/` artifacts).

## Deviations from plan

- **Probe folder naming.** The plan tentatively named the probe `app/_glowprobe/`. Next.js App
  Router treats an underscore-prefixed folder as a *private* (non-routable) folder, so it would not
  render. Renamed to `app/glowprobe/` (routable) for the screenshot, then deleted. No effect on the
  deliverable — the probe was throwaway either way. Noted so the pattern is not repeated.

## Remaining

Nothing. Deliverable complete; Review is the last artifact.
