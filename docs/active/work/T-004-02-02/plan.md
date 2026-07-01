# Plan — T-004-02-02: neon-glow-shadow-utilities

Ordered, independently-verifiable steps. The source change is one additive CSS block; most of the
plan is *proving* it meets the emit-into-production-build and visible-colored-bloom halves of the AC.

## Testing strategy

**No unit-test surface** — the deliverable is a set of CSS classes; the repo's vitest runner covers
`lib/` pure logic only. Verification mirrors both predecessors (T-004-01-01 tokens, T-004-02-01
glass) and the AC's own wording:

- **Build + grep** — the emit-into-production-CSS half (objective, automatable).
- **Visual probe** in `npm run dev` — the "shows a colored neon bloom matching its piece hue" half
  (throwaway, observed, reverted).
- **Gates** — `npm run lint` (`--max-warnings 0`) and `npm run build` exit 0; source diff =
  `app/globals.css` only.

## Steps

### Step 1 — Baseline: confirm `glow` is absent

- `npm run build`, then grep the emitted chunk (`.next/static/chunks/*.css`) for `glow`.
- **Expected:** 0 matches (already confirmed in Research; re-confirm cleanly). Establishes the
  "absent at baseline" contrast the AC implies.

### Step 2 — Add the glow block to `app/globals.css`

- Append the doc comment + `@layer components { … }` block per Structure, **after** the `.glass`
  block and **before** `html, body`.
- Geometry (grouped selector, three `0 0` layers reading `var(--glow-color, currentColor)`) written
  once; seven `.glow-{piece}` rules each setting `--glow-color: var(--color-piece-{piece})`.
- **Verify by read:** file matches the Structure skeleton order; nothing above the new block
  changed.

### Step 3 — Prove emission in the committed state (no consumer)

- `npm run build`, then grep the chunk for the glow rules.
- **Expected:** `.glow-i`, `.glow-t`, … present, each setting a `--glow-color`, plus the grouped
  `box-shadow` rule with three `0 0 …` layers referencing the glow color; **no** `glow` reference
  in `app/`, `components/`, or `lib/` source (`grep -rn glow app components lib` clean).
- Load-bearing check: proves `@layer components` defeats tree-shaking here too. Commit-blocking.
- **Also confirm token linkage:** the emitted color rules resolve `var(--color-piece-*)` (the
  chunk shows the glow color rules alongside the piece custom properties).

### Step 4 — Visual probe: per-piece colored bloom (throwaway)

- Add a temporary route under `app/` (e.g. `app/_glowprobe/page.tsx`): a few solid swatches on the
  dark canvas, each `className="glow-t"`, `"glow-i"`, `"glow-z"`, `"glow-s"` (a spread of hues), one
  bare `.glow` accent, spaced so the halos are visible.
- `npm run dev`, load the probe, confirm by eye (headless-Chrome screenshot): each swatch radiates
  a bloom in **its** piece hue (purple/cyan/red/green), the bare `.glow` blooms in its text color.
  Record the observation in `progress.md`.
- **Then revert the probe entirely** (delete the route); `git status` confirms it's gone.
- The probe uses **literal** class names (`glow-t`), so no dynamic-class extractor caveat.

### Step 5 — Gates + boundary check

- `npm run lint` → exit 0 (also ensures no stray probe file lingers under lint scope).
- `npm run build` → exit 0.
- `git status` / `git diff --stat` → the only modified source file is `app/globals.css` (+ the
  `docs/active/work/T-004-02-02/*` artifacts). No `components/`, `lib/`, or app edits — boundary held.

### Step 6 — Commit

- `git add app/globals.css docs/active/work/T-004-02-02` and commit:
  `feat(T-004-02-02): add per-piece neon glow/shadow utilities to theme`
- One cohesive additive change → a single feat commit (matches both predecessors' shape).

## Rollback / risk

- **If Step 3 shows glow tree-shaken** (unexpected — `.glass` proves the path): fall back to a
  top-level (unlayered) glow block (also emits), re-checking composability. Document any deviation
  in `progress.md` first. `@utility` + `@source inline("glow-i glow-o …")` is the last resort.
- **If lightningcss mangles the multi-layer `box-shadow` or the `var()` color** (unlikely — it
  handles `.glass`'s multi-layer shadow fine): inspect the emitted rule; the `var(--color-piece-*)`
  reference should survive as-is since custom properties are resolved at runtime, not build time.
- **Shared-file with the glass sibling:** the block is self-fenced and appended after `.glass`; a
  trivial append-order rebase is the worst case. Lisa's commit lock serializes if concurrent.

## Definition of done

- Glow utilities present in the committed production CSS build (grep), referencing the piece tokens;
  absent at baseline.
- Throwaway probe visibly showed each piece hue's bloom + the bare `.glow` accent; probe reverted.
- Lint + build green; source diff = `app/globals.css` only.
- `review.md` written.
