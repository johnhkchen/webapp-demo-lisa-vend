# Plan — T-004-03-01: row-clear-flash-keyframes

Ordered, independently-verifiable steps. The source change is one additive CSS region; most of the
plan is *proving* it meets both halves of the AC — the animation **and** its utility emit into the
production build, and a probe plays the neon flash-and-fade **once**.

## Testing strategy

**No unit-test surface** — the deliverable is a `@keyframes` block + a CSS class; the repo's vitest
runner covers `lib/` pure logic only. Verification mirrors both predecessors (T-004-02-01 glass,
T-004-02-02 glow) and this AC's own wording:

- **Build + grep** — the emit-into-production-CSS half (objective, automatable). Unlike the siblings
  this has *two* things to find: `@keyframes flash` **and** `.flash{animation:flash …}`.
- **Visual probe** in `npm run dev` — the "plays the neon flash-and-fade once" half (throwaway,
  observed once, reverted).
- **Gates** — `npm run lint` (`--max-warnings 0`) and `npm run build` exit 0; source diff =
  `app/globals.css` only.

## Steps

### Step 1 — Baseline: confirm `flash` is absent

- `npm run build`, then grep the emitted chunk (`.next/static/chunks/*.css`) for `flash`; also
  `grep -rni flash app components lib`.
- **Expected:** 0 matches in both (already confirmed in Research; re-confirm cleanly). Establishes
  the "absent at baseline" contrast the AC implies.

### Step 2 — Add the flash region to `app/globals.css`

- Append, **after** the `.glow` block and **before** `html, body`, per Structure: the doc comment,
  the bare top-level `@keyframes flash { 0% / 35% / 100% }`, then
  `@layer components { .flash { animation: flash var(--flash-duration,500ms) var(--flash-ease,ease-out) both } }`.
- Keyframes ramp a neon `box-shadow` bloom to a `35%` peak in `var(--flash-tint, oklch(0.97 0.06 200))`
  and fade `opacity` 1→0 with `transform: scaleY(1→0.85)`.
- **Verify by read:** file matches the Structure skeleton order; nothing above the new region
  changed.

### Step 3 — Prove BOTH halves emit in the committed state (no consumer)

- `npm run build`, then grep the chunk for `@keyframes flash` and for `.flash`.
- **Expected:**
  - `@keyframes flash{` present with its `0%/35%/100%` (or minified `0%`,`35%`,`to`) stops.
  - `.flash{animation:flash …}` present, referencing the `flash` name and the duration/easing.
  - **no** `flash` reference in `app/`, `components/`, or `lib/` source (`grep -rn flash app
    components lib` clean).
- **Load-bearing check:** proves (a) `@layer components` defeats tree-shaking here too, and (b) the
  new thing — a bare top-level `@keyframes` survives to the build and is kept reachable by the
  `.flash` reference. Commit-blocking. If `@keyframes flash` is *missing* while `.flash` is present,
  execute the rollback (below) before committing.

### Step 4 — Visual probe: single neon bloom-then-fade (throwaway)

- Add a temporary route under `app/` (e.g. `app/_flashprobe/page.tsx`): one solid dark-ish swatch on
  the dark canvas with `className="flash"` (a literal class name — no dynamic assembly), sized like a
  board row so the bloom is visible.
- `npm run dev`, load the probe, capture a screenshot (or a short sequence) and confirm by eye: the
  swatch **pops bright in a neon tint with a bloom**, then **fades to nothing with a slight vertical
  collapse**, and **does not repeat** (plays once). Record the observation in `progress.md`.
- Because the animation ends faded (fill `both`), a reload is the way to replay it during observation.
- **Then revert the probe entirely** (delete the route); confirm it's gone.

### Step 5 — Gates + boundary check

- `npm run lint` → exit 0 (also ensures no stray probe file lingers under lint scope).
- `npm run build` → exit 0, and re-grep confirms `@keyframes flash` + `.flash` still present with the
  probe deleted (emission does not depend on the probe).
- `git status` / `git diff --stat` → the only modified source file is `app/globals.css` (+ the
  `docs/active/work/T-004-03-01/*` artifacts). No `components/`, `lib/`, or app edits — boundary held.

### Step 6 — Commit

- `git add app/globals.css docs/active/work/T-004-03-01` and commit:
  `feat(T-004-03-01): add row-clear flash keyframes + .flash utility to theme`
- One cohesive additive change → a single feat commit (matches all three predecessors' shape).

## Rollback / risk

- **If Step 3 shows `@keyframes flash` tree-shaken/pruned** while `.flash` is present (not expected —
  Lightning CSS keeps keyframes referenced by an `animation` declaration): move the keyframes into a
  forced-emission block — `@theme static { @keyframes flash {…} }` (the `static` blocks already force
  the piece tokens into the build) — keeping `.flash` in `@layer components`. Re-grep. Document the
  deviation in `progress.md` **before** proceeding.
- **If Lightning CSS mangles the multi-layer `box-shadow` or the `var()` tint** (unlikely — it
  handles `.glow`'s multi-layer shadow and `.glass`'s `color-mix` fine): inspect the emitted rule;
  `var(--flash-tint, …)` should survive as a runtime custom property, and `oklch()` defaults are
  already used elsewhere in this file.
- **If the probe shows a repeating pulse** rather than a single play: confirm no `infinite` and no
  iteration count > 1 slipped in; the default count is 1. Fix and re-observe.
- **Shared-file with three prior E-004 blocks:** the region is self-fenced and appended after
  `.glow`; a trivial append-order rebase is the worst case. Lisa's commit lock serializes if
  concurrent. All three predecessors are already committed, so a clean append is expected.

## Definition of done

- `@keyframes flash` **and** `.flash{animation:flash …}` both present in the committed production CSS
  build (grep); absent at baseline; no source consumer.
- Throwaway probe visibly played a single neon bloom-then-fade (no loop); probe reverted.
- Lint + build green; source diff = `app/globals.css` only.
- `review.md` written.
