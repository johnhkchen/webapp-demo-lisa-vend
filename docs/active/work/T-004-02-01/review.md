# Review — T-004-02-01: glassmorphic-panel-utilities

Handoff document. What changed, how it was verified, and what a reviewer needs to know without
reading every diff.

## Outcome

A reusable `.glass` panel utility now lives in the Tailwind theme layer as **pure config**, with
**no** component or logic edits. Any surface can read as frosted glass — backdrop blur + saturate,
translucent fill, hairline border, depth shadow + lit top rim — by applying one class, instead of
hand-rolling the `border/bg/shadow` CSS that `Board.tsx` currently does inline.

**Acceptance criterion met:** `.glass` emits into the production CSS build (grep-verified present;
absent at baseline) with no consumer, and a throwaway probe over a busy background rendered a
visibly blurred, translucent, bordered surface.

Committed as `9a04522`.

## What changed

### Modified
- **`app/globals.css`** — added one doc comment + `@layer components { .glass { … } }` block,
  placed after the `@theme static` per-tetromino colors and before the base `html, body` rules.
  Nothing else in the file changed; the token bridge and base styles are untouched.

### Added
- `docs/active/work/T-004-02-01/{research,design,structure,plan,progress,review}.md` — RDSPI
  artifacts.

### Not touched (deliberately — epic hard boundary)
- `components/Board.tsx`, `components/Cell.tsx`, `lib/**`, `app/layout.tsx`, `app/page.tsx`, and
  all config files. Applying `.glass` to a real scoreboard/preview panel is a later rendering
  epic's scope, not this one.

## The utility

```css
@layer components {
  .glass {
    background-color: color-mix(in oklab, white 6%, transparent);
    -webkit-backdrop-filter: blur(12px) saturate(1.4);
    backdrop-filter: blur(12px) saturate(1.4);
    border: 1px solid color-mix(in oklab, white 14%, transparent);
    box-shadow:
      0 8px 32px rgb(0 0 0 / 0.37),
      inset 0 1px 0 color-mix(in oklab, white 12%, transparent);
  }
}
```

Owns **material only** — no radius, padding, size, or content color. Consumers compose those via
utilities: `<aside className="glass rounded-2xl p-4 text-foreground">`. lightningcss emits a
compact hex-alpha fallback plus a wide-gamut `lab()` value and auto-adds the `-webkit-` prefix.

## Why `@layer components`, not `@utility` (the load-bearing decision)

Tailwind v4 **tree-shakes unused custom `@utility` classes** — proven empirically in this repo
(4.3.2): a `@utility glass` with no scanned consumer is **absent** from the production CSS. Since
E-004 forbids any component consumer, usage-driven emission was structurally impossible — the same
trap the sibling color-token ticket hit with a plain `@theme` block (which it solved with
`@theme static`). The analog for a *named class* is `@layer components`, which:
1. **emits unconditionally** (no consumer needed) — verified, and
2. sits **below** the `utilities` layer, so a consumer's `rounded-*`/`p-*`/`bg-*` still override
   individual glass properties when composed (composability).

A raw unlayered `.glass` also emits but would *beat* utilities on the cascade — rejected. See
`design.md` Decision 1. This is the single choice a reviewer should sanity-check.

## Verification

| Check | Command | Result |
|---|---|---|
| Absent at baseline | clean build + grep chunk for `.glass` | **0 matches** (5 `backdrop-filter` hits are Tailwind's own util vars) |
| Emits with no consumer | `npm run build` + grep chunk | **`.glass{…}` present**, full blur/translucency/border/shadow |
| No consumer in source | `grep -rn glass app components lib` | only the `globals.css` definition |
| Renders correctly | headless-Chrome screenshot of throwaway probe over a busy neon/stripe background | panel visibly **blurred + translucent + bordered** with lit top rim; probe reverted |
| Emission survives probe removal | rebuild after deleting probe | `.glass` still present, no `glass` consumer |
| Lint clean | `npm run lint` (`--max-warnings 0`) | exit 0 |
| Production build | `npm run build` | exit 0 |
| Boundary held | `git status` source diff | only `app/globals.css` |

No unit tests apply — the deliverable is a CSS class; the repo's vitest suite covers `lib/` logic
only. Verification is build-, grep-, and screenshot-based, matching the AC's wording and the
sibling ticket's approach.

## Open concerns / notes for downstream

1. **No consumer yet, by design.** `.glass` renders nothing in the app until a component applies
   it. That is correct for E-004's theme-only mandate; do not read "not visible in the running
   app" as a defect. The intended first consumers are the scoreboard/preview/hold panels in a
   later rendering epic.
2. **Do not convert `.glass` to `@utility`** without also adding `@source inline("glass")` (or a
   consumer) — it will silently drop from the production build. The doc comment in `globals.css`
   states this; the invariant is in `structure.md`.
3. **`backdrop-filter` support.** Universally supported in current evergreen browsers; the
   `-webkit-` prefix (written in source *and* auto-added by lightningcss) covers Safari. On a
   browser without backdrop-filter the panel degrades gracefully to a translucent bordered surface
   (no blur) — acceptable.
4. **Shared file with T-004-02-02 (glow/shadow).** That sibling also edits `globals.css`. This
   block is self-fenced and appended before the base rules, so a later glow block appends cleanly
   after it. If both land close together, Lisa's commit lock serializes; a trivial append-order
   rebase is the worst case.
5. **Tunable, not tokenized.** Blur radius / alphas live inline, not as `@theme` tokens — no
   second consumer justifies extraction yet (`design.md` Decision 5). If glow wants a shared blur
   scale, extract a token then.

## Bottom line

Smallest correct change: one additive `@layer components` block, fully verified (grep + real
screenshot), boundary-clean. Ready for the next E-004 ticket (glow/shadow) and, eventually, the
rendering epic that applies `.glass` to real panels.
