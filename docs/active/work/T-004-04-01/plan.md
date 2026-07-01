# Plan — T-004-04-01: throwaway-probe-all-effects

Ordered, independently-verifiable steps. Because no tracked source changes, there is nothing to commit
for code — the only commits are the RDSPI artifacts. Each step states its verification.

## Testing strategy

- **No unit tests.** The deliverable is a proof, not code; the repo's vitest suite covers `lib/` game
  logic only and is untouched. Adding a test here would test nothing this ticket owns.
- **Deterministic proof = build + grep + boundary.** The objective evidence, exactly the recipe all
  five E-004 siblings used, consolidated into one pass.
- **Visual proof = one headless-Chrome screenshot** of the throwaway probe rendering all five effects
  simultaneously, plus computed-style assertions in the same session.
- **Verification criteria** (all must hold):
  1. `npm run build` exits 0; `npm run lint` (`--max-warnings 0`) exits 0.
  2. Built chunk contains all five items with correct computed values (7 tokens, `.glass`, `.glow*`,
     `@keyframes flash` + `.flash`, `.motion*`).
  3. No vocabulary class is referenced in `app/`/`components/`/`lib/` (no consumer — boundary).
  4. `git diff --stat -- app components lib` is empty (no source change).
  5. The probe screenshot visibly shows: seven distinct neon hues, a frosted glass panel, an in-hue
     glow bloom, a row-clear flash frozen at peak bloom, and a mid-interpolation `.motion` element.
  6. Computed styles in Chrome match the emitted values (backdrop-filter, box-shadow, the seven
     `--color-piece-*`, `transition-property:transform,opacity`).

## Steps

### Step 1 — Clean production build (foundation)
`rm -rf .next && npm run build`. **Verify:** exit 0; `.next/static/chunks/*.css` exists.
*(Done in Research; re-run in Implement to be the canonical build the probe links.)*

### Step 2 — Deterministic emit proof (grep the chunk)
Grep the built chunk for each of the five items and capture the exact emitted rule/value:
`--color-piece-{i..l}`, `.glass{…}`, `.glow,.glow-i,…{box-shadow…}`, `@keyframes flash{…}` + `.flash`,
`.motion,.motion-fast,.motion-slow{transition-property:transform,opacity…}`.
**Verify:** all five present with expected values. *(Captured in Research; re-affirm.)*

### Step 3 — Boundary proof (no consumer, empty diff)
- `grep -rniE 'glass|glow|flash|motion|piece-[iotszjl]' app components lib` → only `app/globals.css`
  definitions, **no** consuming reference in a component/lib/app-tick file.
- `git diff --stat -- app components lib` → empty.
**Verify:** boundary held, positively (not just "diff empty" but "no consumer exists").

### Step 4 — Author the throwaway probe (scratchpad)
Write `scratchpad/probe.html`: dark viewport, five labelled zones (Structure blueprint), linking the
resolved `.next/static/chunks/<hash>.css` by absolute path. The flash zone includes one copy with
`animation-delay:-175ms` to freeze it at ≈35% (peak bloom) so the still is legible. The motion zone
sets a non-default `transform`/`opacity` inline so a mid-state renders.
**Verify:** file exists; `<link>` href resolves to the real chunk.

### Step 5 — Render + screenshot (headless Chrome)
Invoke `/Applications/Google Chrome.app/.../Google Chrome --headless --screenshot=…/probe.png
--window-size=900,1200 --default-background-color=00000000 file://…/probe.html`.
**Verify:** `probe.png` written, non-trivial size; visually shows all five effects in one frame.

### Step 6 — Computed-style assertions (same engine)
Headless Chrome `--dump-dom` / evaluate `getComputedStyle` on probe elements; assert
`backdrop-filter` non-empty on `.glass`, multi-layer `box-shadow` on `.glow-*`, the seven
`--color-piece-*` values on `:root`, and `transition-property: transform, opacity` on `.motion`.
**Verify:** computed values match the emitted chunk (Step 2).

### Step 7 — Remove the probe / confirm throwaway
The probe lives only in scratchpad; confirm `git status` shows no probe file anywhere in the tree and
no change under `app components lib`. Optionally delete `probe.html`/`probe.png` explicitly.
**Verify:** `git diff --stat -- app components lib` still empty; no probe artifact tracked.

### Step 8 — Write progress.md
Record each step's actual result (build/lint exit codes, grep hits, screenshot path + what it shows,
computed-style values, final boundary check), plus any deviation.

### Step 9 — Write review.md
Handoff: what was proven, the verification table, the boundary result, open concerns (e.g. "no durable
visual catalog — deferred"), and the bottom line that E-004 is complete and consumable.

### Step 10 — Commit the artifacts
`git add docs/active/work/T-004-04-01 && git commit` with a `docs(T-004-04-01):` message. This is the
**only** commit; it touches no source. *(Commit only if the run is expected to commit; otherwise leave
staged per Lisa's flow — no source is affected either way.)*

## Rollback / risk

- **Risk: build produces a differently-hashed chunk** → Step 4 resolves the path from a glob after
  Step 1, so the name is discovered, not hard-coded.
- **Risk: flash captured transparent** → mitigated by the negative `animation-delay` freeze (Step 4).
- **Risk: Chrome headless unavailable/sandboxed** → the deterministic proof (Steps 2–3) stands alone
  as sufficient evidence per the sibling recipe; the screenshot is corroborating. Degrade gracefully:
  record computed-style/grep proof and note the screenshot status in `progress.md`.
- **Rollback: trivial** — nothing tracked changes; discarding the scratchpad is the entire cleanup.
