# Progress — T-004-03-01: row-clear-flash-keyframes

Tracks execution against `plan.md`. All steps completed as planned; no deviations.

## Step 1 — Baseline (done)

- `grep -rni flash app components lib` → no matches.
- Built chunk grep for `flash` → no matches.
- Confirms absent-at-baseline; any post-change match is attributable to this ticket.

## Step 2 — Add flash region to `app/globals.css` (done)

- Appended the doc comment + bare top-level `@keyframes flash { 0% / 35% / 100% }` + `@layer
  components { .flash { animation: flash var(--flash-duration,500ms) var(--flash-ease,ease-out)
  both } }`, placed after the `.glow` block and before `html, body` — exactly per Structure.
- Nothing above the new region changed (verified by diff: `+43` lines, no deletions).

## Step 3 — Prove both halves emit, no consumer (done)

- `rm -rf .next && npm run build` → exit 0.
- Built chunk (`.next/static/chunks/*.css`) contains:
  - `@keyframes flash{0%{…}35%{…}to{…}}` — present. Lightning CSS emitted it **twice** by design:
    once with the sRGB fallback (`--flash-tint,#d3ffff`) and once with the wide-gamut `lab(...)`
    equivalent. This is the same gamut-fallback duplication `.glass`'s `color-mix` produced — a
    minifier feature, not a defect.
  - `.flash{animation:flash var(--flash-duration,.5s) var(--flash-ease,ease-out) both}` — present,
    referencing `flash` by name. (`500ms` normalized to `.5s` by the minifier.)
- `grep -rn flash app components lib` → only `app/globals.css` (the definition); **no consumer** in
  `components/` or `lib/`.
- **Result:** the new empirical question is answered — a bare top-level `@keyframes` survives to the
  production build and the always-emitted `.flash` rule keeps it referenced. No rollback needed.

## Step 4 — Visual probe: single neon bloom-then-fade (done, reverted)

- The probe was built entirely in the scratchpad (standalone HTML linking the **actual emitted CSS
  chunk**), so nothing was ever added to the repo — the boundary is clean by construction, no
  in-repo revert needed.
- Method: headless Chrome. `--virtual-time-budget` did **not** reliably advance the CSS-animation
  clock (all sampled frames looked alike), so switched to a deterministic technique — three swatches
  each `animation-play-state: paused` with a negative `animation-delay` pinning it to a fixed
  progress point:
  - **t=0ms** — bright neon-cyan fill, no bloom (box-shadow none). The flash begins.
  - **t=175ms (35%)** — bright fill + wide neon bloom halo. The peak "clear!" pop.
  - **t=499ms (end)** — faded to near-nothing (opacity→0) with the slight `scaleY(0.85)` collapse.
- Confirms neon-tinted bloom → fade-and-collapse. Iteration count defaults to **1** and `both` fill
  holds the faded end frame → **plays once, no loop back to bright**. AC's "plays the neon
  flash-and-fade once" satisfied.

## Step 5 — Gates + boundary (done)

- `npm run lint` (`eslint --max-warnings 0`) → exit 0.
- `npm run build` → exit 0.
- `git diff --stat -- app components lib` → `app/globals.css | 43 +++`; **only** source file changed.
  No `components/`, `lib/`, `app/layout.tsx`, `app/page.tsx`, or config edits — E-004 boundary held.

## Step 6 — Commit

- Committed as a single feat: see `review.md` for the hash.

## Deviations

None. The only method adjustment (paused/negative-delay pinning instead of virtual-time sampling for
the probe) was a verification-technique choice, not a change to the deliverable.
