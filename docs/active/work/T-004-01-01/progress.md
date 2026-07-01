# Progress — T-004-01-01: per-tetromino-neon-color-tokens

Execution log against `plan.md`. All steps complete; one deviation noted.

## Completed

- **Step 1 — baseline absence.** Grepped the current production chunk: **0** `--color-piece-*`
  matches. "Absent at baseline" recorded.
- **Step 2 — add block.** Appended the `@theme static` block (7 oklch tokens + doc comment) to
  `app/globals.css`, after the existing `@theme inline` bridge. Deliverable is this one block.
- **Step 3 — emission grep (committed state).** `npm run build` → exit 0. All seven
  `--color-piece-{i,o,t,s,z,j,l}` present in the emitted CSS chunk, **7 distinct** values. The
  build's CSS minifier (lightningcss) resolves oklch → sRGB hex in output:
  i=`#00ebeb` cyan, o=`#efd62f` yellow, t=`#c474f9` purple, s=`#63f06f` green, z=`#ff4f4f` red,
  j=`#3480fc` blue, l=`#ff8a1d` orange. All visibly distinct.
- **Step 4 — throwaway swatch.** Added `app/_swatch/page.tsx` rendering seven `bg-piece-*`
  squares; built; confirmed all seven `bg-piece-*` utilities generate and each resolves to
  `background-color: var(--color-piece-*)`. **Reverted** the swatch (`rm -rf app/_swatch`).
- **Step 4 (revert proof).** Rebuilt with no consumer: all seven `--color-piece-*` tokens
  **still emit**, zero `bg-piece-*` utilities present → the swatch was not load-bearing; `static`
  carries emission. This is the crux the design hinged on.
- **Step 5 — final gate.** `npm run lint` (`eslint --max-warnings 0`) → exit 0. `npm run build`
  → exit 0. `git status` source diff = **only `app/globals.css`**; no `components/`, `lib/`, or
  `app/*.tsx` change. Boundary held.
- **Step 6 — commit.** See review.md for the SHA.

## Deviation from plan

- **Swatch class names must be literal, not `bg-piece-${p}`.** The first swatch built the class
  name via a template string in a `.map()`; Tailwind's static extractor only picks up **literal**
  class strings, so only two utilities coincidentally emitted. Rewrote the swatch with seven
  explicit literal `bg-piece-*` classes → all seven generated. No change to the deliverable; this
  affected only the verification probe. **Downstream note:** the later rendering epic cannot build
  piece classes dynamically without a safelist — it must map piece→literal-class or use inline
  `style={{ background: "var(--color-piece-t)" }}`. Captured in review.md open concerns.

## Not done (intentionally, per scope)

- No Cell/Board/panel wiring; no glow/glass/keyframe/transition tokens (sibling future work).
- No safelist added (would be premature — belongs with the consuming epic that decides the
  dynamic-vs-literal strategy).
