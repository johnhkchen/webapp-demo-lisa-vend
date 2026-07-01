# Review — T-004-03-02: sixty-fps-transition-classes

Handoff document. What changed, how it was verified, and what a reviewer needs to know without
reading every diff. This is the fifth and final vocabulary item of epic E-004
(`neon-glass-design-system`) and completes story S-004-03 (`motion-and-flash-vocabulary`).

## Outcome

A compositor-only transition vocabulary — **`.motion`** (base) plus **`.motion-fast`** /
**`.motion-slow`** presets — now lives in the theme as **pure config**, with **no** component or
logic edits. Any surface that later wants 60fps movement/state motion applies **one** class and
gets a transition restricted to `transform`/`opacity` with centrally-tuned duration/easing, instead
of hand-rolling a `transition` declaration per component.

**Acceptance criterion met:** transition utilities **restricted to compositor-friendly properties**
(`transition-property: transform, opacity`) **emit into the production CSS build** (grep-verified
present; absent at baseline) with **no consumer**, and a throwaway probe animated a `transform` +
`opacity` change **smoothly** with the **defined easing/duration** (computed style read
`property=transform, opacity`, `duration=0.15s`, `ease=cubic-bezier(.2,0,0,1)`; a pinned mid-frame
showed both properties interpolating between start and end, not snapping).

## What changed

### Modified
- **`app/globals.css`** — one added doc comment + one `@layer components { .motion, .motion-fast,
  .motion-slow { … } }` block, placed after the `.flash` block and before the base `html, body`
  rules (**+42** lines, no deletions). Everything above — `@import`, `:root` palette, both `@theme`
  bridges, `.glass`, `.glow-*`, `@keyframes flash`, and `.flash` — is byte-for-byte untouched.

### Added
- `docs/active/work/T-004-03-02/{research,design,structure,plan,review}.md` — RDSPI artifacts.

### Not touched (deliberately — E-004 hard boundary)
- `components/Board.tsx`, `components/Cell.tsx`, `lib/**`, `app/layout.tsx`, `app/page.tsx`, and all
  config files. Applying `.motion*` to real moving pieces/panels is the later render/loop epic's job.

## The deliverable

```css
@layer components {
  .motion,
  .motion-fast,
  .motion-slow {
    transition-property: transform, opacity;
    transition-duration: var(--motion-duration, 150ms);
    transition-timing-function: var(--motion-ease, cubic-bezier(0.2, 0, 0, 1));
  }
  .motion-fast { --motion-duration: 90ms;  }
  .motion-slow { --motion-duration: 260ms; }
}
```

**Public interface:** `.motion` (150ms, general default), `.motion-fast` (90ms, piece
shift/rotate/soft-drop — keeps up with key repeat), `.motion-slow` (260ms, panel/overlay/preview
settle). **Knobs:** `--motion-duration` and `--motion-ease` are `var(--…, default)` so a consumer
retunes per call without a new class (mirrors the siblings' `--glow-*` / `--flash-*` knobs).

**Core idea:** the 60fps guarantee is the `transition-property: transform, opacity` **restriction**,
not the timing. `transform`/`opacity` are the only broadly compositor-only properties (GPU, no
layout, no paint). Even if a consumer flips a paint/layout property in the same state change, only
transform/opacity will *transition* — the rest snap — so no reflow-animation and no dropped frames.
The geometry is written **once** on the grouped selector; the two presets contribute only a single
`--motion-duration` override each (the `.glow` DRY idiom).

## Why `@layer components`, not `@utility` / `@theme` (load-bearing, unchanged from siblings)

Tailwind v4 **tree-shakes** `@utility` classes and `@theme`-generated utilities when no scanned
source references them. E-004 forbids a component consumer, so those paths silently drop from the
production build — the exact trap `.glass`/`.glow`/`.flash` hit and rejected. `@layer components`
emits **unconditionally** and sits **below** the `utilities` layer, so the classes ship with no
consumer AND a future consumer's Tailwind `transition-*`/`duration-*`/`ease-*` utilities still
compose/override. The in-file doc comment records this so the next reader does not re-derive it.

## Why no `will-change` (a deliberate exclusion, documented)

`will-change` baked into a shared always-on class permanently pins a GPU compositor layer per
element — memory cost, and it can *hurt* performance at scale — the opposite of the 60fps intent.
The `transition-property` restriction already delivers the compositor-only guarantee at **zero**
cost. Transient `will-change` (add right before an animation, remove after) is a per-call
optimization the consuming render epic applies imperatively; it is not part of a reusable, always-on
vocabulary. Excluded on purpose and called out in the block comment so a future author doesn't
"helpfully" add it to the shared class. (Design decision 4; a shipped `.will-animate` opt-in was
also rejected — no lifecycle consumer exists, and a static class invites the leave-it-on misuse.)

## Verification

| Check | Command | Result |
|---|---|---|
| Absent at baseline | `grep -rniE 'transition\|motion\|will-change' app components lib` | only `lib/rotation.ts` game-logic hits, no CSS |
| Classes emit, no consumer | `npm run build` + grep built chunk | `.motion,.motion-fast,.motion-slow{transition-property:transform,opacity;transition-duration:var(--motion-duration,.15s);transition-timing-function:var(--motion-ease,cubic-bezier(.2, 0, 0, 1))}` **present** |
| Presets emit | grep chunk | `.motion-fast{--motion-duration:90ms}` and `.motion-slow{--motion-duration:.26s}` **present** |
| Property restricted to compositor-friendly | grep chunk | `transition-property:transform,opacity` (no layout/paint props) |
| No consumer in source | `grep -rniE 'motion\|will-change' app components lib` (sans globals.css) | only the `globals.css` definition |
| Renders + transitions smoothly | headless-Chrome probe (virtual time), computed style + pinned frame | `property=transform, opacity`, `duration=0.15s`, `ease=cubic-bezier(.2,0,0,1)`; mid-frame `tx=62.4`/`opacity=0.366` interpolating between start (`0`/`0.2`) and end (`300`/`1`) — smooth, not snapped; probe was scratchpad-only |
| Lint clean | `npm run lint` (`--max-warnings 0`) | exit 0 |
| Production build | `npm run build` | exit 0 |
| Boundary held | `git diff --stat -- app components lib` | only `app/globals.css` (+42) |

No unit tests apply — the deliverable is CSS; the repo's vitest suite covers `lib/` logic only and
is untouched. Verification is build-, grep-, and probe-based, matching the AC and all four
predecessor E-004 tickets.

## Open concerns / notes for downstream

1. **No consumer yet, by design.** `.motion*` transition nothing in the running app until a component
   applies a class AND flips a `transform`/`opacity` value. Correct for E-004's theme-only mandate —
   do not read "not visible in the app" as a defect. Intended first consumers: Board/Cell piece
   movement (`.motion-fast`) and panel/overlay appearance (`.motion`/`.motion-slow`) in a later
   render/loop epic.
2. **The transition only fires on a state change the consumer drives.** These classes interpolate
   between two `transform`/`opacity` values; the consumer is responsible for causing the flip (e.g.
   updating an inline `transform` as a piece moves). Nothing animates on mount alone.
3. **`will-change` is intentionally absent** (see above). If the render epic profiles a specific
   high-frequency animation and needs first-frame smoothing, apply `will-change` **transiently** on
   that element right before the animation and remove it after — do **not** add it to the shared
   `.motion` class.
4. **Duration presets are a starting scale, tunable per call.** 90/150/260ms were tuned for piece
   movement vs. general vs. panel settle. If the render epic finds a specific motion wants a
   different speed, override `--motion-duration` on the element rather than adding a fourth class —
   the same extract-on-demand discipline the predecessors used (they deferred speculative variants).
5. **Complements, does not overlap, `.flash`.** `.motion*` are transitions (consumer-driven A→B
   interpolation of transform/opacity); `.flash` is a fixed self-contained row-clear `@keyframes`.
   The two vocabulary items are cleanly separated — this ticket adds no `@keyframes`.
6. **Minifier renders `150ms`→`.15s` and `260ms`→`.26s`** in the built chunk (Lightning CSS); `90ms`
   stays `90ms`. Cosmetic, expected — the values are equivalent. Grep for either form.
7. **Shared file with four prior E-004 blocks.** The region is self-fenced and appended after
   `.flash`; all predecessors are committed, so this was a clean append (git confirms +42, no
   deletions). Lisa's commit lock serializes if anything lands concurrently.

## Bottom line

Smallest correct change: one additive doc comment + one `@layer components` block (+42 lines), fully
verified (grep for all three classes + the compositor-only property restriction, and a probe showing
transform/opacity interpolating with the defined 0.15s / cubic-bezier easing), boundary-clean, and
tunable. This completes story S-004-03 and is the fifth of five E-004 vocabulary items — the theme
now exposes piece tokens, `.glass`, `.glow-*`, `.flash`, and `.motion*`, all as pure config ready
for the render/loop epic to consume.
