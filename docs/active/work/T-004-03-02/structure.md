# Structure — T-004-03-02: sixty-fps-transition-classes

The blueprint. Exact file-level shape of the change — not the prose, the code shape and where it
goes. Locks Design's decisions into a concrete, reviewable diff outline.

## Files

| File | Change | Why |
|---|---|---|
| `app/globals.css` | **Modified** — append one region after the `.flash` block, before base `html, body` | The sole E-004 surface; the append discipline every predecessor followed |
| `docs/active/work/T-004-03-02/*.md` | **Added** — RDSPI artifacts | Workflow bookkeeping |

**Nothing else.** No `components/`, no `lib/`, no `app/layout.tsx`/`page.tsx`, no config. The
`git diff --stat -- app components lib` must show `app/globals.css` only. (Enforced in Plan's gates.)

## Insertion point

`app/globals.css` today ends the E-004 vocabulary with the `.flash` block, then has the base rules:

```
…
@layer components {
  .flash { animation: flash var(--flash-duration, 500ms) var(--flash-ease, ease-out) both; }
}
                       ← INSERT the new region here (blank line, doc comment, @layer block)
html,
body { height: 100%; }
body { font-family: …; }
```

The new region is self-fenced: a doc comment + one `@layer components` block. It reads no state from
and writes no state to any block above it. Pure append.

## The block to author (shape, not final polish)

```css
/*
 * 60fps motion utilities (E-004). Compositor-only transitions: `.motion` transitions ONLY
 * `transform` and `opacity` — the two properties the GPU compositor animates without triggering
 * layout or paint — so any movement (piece shift/rotate/soft-drop) or state change (panel/overlay
 * appear) animates at 60fps by applying ONE class instead of each component re-tuning `transition`.
 *
 * Shape (mirrors the `.glow` idiom): the transition geometry is written ONCE on the grouped
 * selector; `.motion-fast` / `.motion-slow` only override `--motion-duration`. Duration and easing
 * are `var(--motion-*, default)` knobs so a consumer retunes per call without a new class.
 *
 * `@layer components` (NOT `@utility` / `@theme { --transition-* }`) on purpose: Tailwind v4
 * tree-shakes custom utilities and @theme-generated utilities with no scanned consumer, and E-004
 * forbids a component consumer — a `@utility motion` would vanish from the production build (the
 * same trap `.glass`/`.glow`/`.flash` hit). Component-layer rules emit unconditionally AND sit
 * below `utilities`, so a consumer's `transition-*`/`duration-*`/`ease-*` utilities still compose.
 *
 * `transition-property` is restricted to `transform, opacity` — that restriction IS the 60fps
 * guarantee: even if a consumer flips a paint/layout property in the same state change, only
 * transform/opacity will TRANSITION (the rest snap), so no reflow-animation, no dropped frames.
 *
 * No `will-change`: baked into a shared always-on class it permanently pins a GPU layer per element
 * (memory cost, can hurt perf) — the opposite of the intent. The property restriction already gives
 * the compositor-only guarantee at zero cost; transient will-change is a per-call optimization the
 * consuming render epic applies imperatively right before an animation, not part of this vocabulary.
 */
@layer components {
  .motion,
  .motion-fast,
  .motion-slow {
    transition-property: transform, opacity;
    transition-duration: var(--motion-duration, 150ms);
    transition-timing-function: var(--motion-ease, cubic-bezier(0.2, 0, 0, 1));
  }

  .motion-fast {
    --motion-duration: 90ms;
  }
  .motion-slow {
    --motion-duration: 260ms;
  }
}
```

### Public interface (what consumers get)

- **`.motion`** — base compositor-only transition; `transform`/`opacity`; 150ms; standard easing.
- **`.motion-fast`** — same, 90ms (piece shift/rotate/soft-drop; keeps up with key repeat).
- **`.motion-slow`** — same, 260ms (panel/overlay/preview settle; softer polish).
- **Knobs** (all `var(--…, default)`, override on the element or an ancestor):
  - `--motion-duration` — overrides the transition duration (what the presets set).
  - `--motion-ease` — overrides the timing function for any of the three classes.

### Internal organization / invariants

- **One grouped geometry rule**, three selectors. `transition-property`/`-duration`/`-timing-function`
  are declared exactly once; the two preset classes contribute only a single `--motion-duration`
  custom-property declaration each. No property is duplicated (the `.glow` DRY invariant).
- **`transition-property: transform, opacity`** — the fixed, non-tunable core. Duration and easing
  are tunable; the *property restriction* is intentionally NOT exposed as a knob (loosening it would
  defeat the 60fps guarantee).
- **Cascade position:** `@layer components` sits below `utilities`; safe under future consumers.
- **No `@keyframes`, no `will-change`, no `transition: all`** — by Design decisions 4/5/1.

## Ordering of changes

Single atomic edit — the whole region lands in one `Edit` on `app/globals.css`, then one commit.
There is no intra-file ordering to sequence (it is one self-contained block). The RDSPI artifacts
are written across the phases; only `globals.css` is committed as the code change.

## What Plan must verify against this blueprint

1. Built CSS chunk contains a `.motion` rule with `transition-property:transform,opacity` (minified
   form may vary, e.g. `transition-property:transform,opacity`).
2. Built chunk contains the `.motion-fast`/`.motion-slow` duration overrides.
3. No `motion` / `transition` / `will-change` reference in `app/`(except globals.css)/`components/`/`lib/`.
4. A probe element flipping `transform`/`opacity` with `.motion` visibly eases over the duration.
5. `npm run lint` + `npm run build` exit 0; `git diff --stat -- app components lib` = `globals.css`.
