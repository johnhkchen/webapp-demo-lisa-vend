# Review — T-004-04-01: throwaway-probe-all-effects

Handoff document. What was done, how it was verified, and what a reviewer needs to know without
re-running everything. This is the **sole** ticket of story S-004-04 (`vocabulary-probe-verification`)
and the **closing** ticket of epic E-004 (`neon-glass-design-system`) — it authors no vocabulary; it
*proves* the vocabulary the five predecessor tickets shipped is live, on-brand, and consumable, then
throws the probe away.

## Outcome

A single throwaway probe rendered **all five E-004 vocabulary items simultaneously** in one frame —
the seven piece hues, a glass panel, a neon glow, the row-clear flash, and a 60fps transition — off
the **emitted production CSS chunk**, and the epic's **hard boundary held**: zero component/lib/app-tick
files were edited to build the theme. The probe was removed before close. **E-004 is complete.**

**Acceptance criterion met, clause by clause:**
- *"renders all seven piece hues, a glass panel, a neon glow, the row-clear flash, and a 60fps
  transition simultaneously"* → one headless-Chrome screenshot of `probe.html` shows all five, in one
  viewport, at once (see Verification). Corroborated by computed-style assertions in the same engine.
- *"`git diff --stat` shows only theme/globals changes and zero component/lib/app-tick edits"* →
  `git diff --stat -- app components lib` is **empty**. This ticket needed **no** theme change either
  (the vocabulary was already complete), so the result is *stronger* than the AC allows: zero source
  change of any kind.
- *"probe is removed before close"* → the probe lived only in the scratchpad (outside the git tree);
  it was deleted, and `git status` never tracked it.

## What changed

### Modified / Deleted — tracked source
**None.** `app/globals.css`, `app/page.tsx`, `app/layout.tsx`, `components/**`, `lib/**`, and all
config are byte-for-byte untouched. This is the boundary proof in its strongest form.

### Added — tracked
- `docs/active/work/T-004-04-01/{research,design,structure,plan,progress,review}.md` — RDSPI artifacts.

### Created then removed — ephemeral (never tracked)
- `scratchpad/probe.html` — the throwaway probe: dark viewport, five labelled zones, `<link>` to the
  emitted `.next/static/chunks/13kyw__w9x0n1.css`. Deleted before close.
- `scratchpad/assert.html` — computed-style assertion harness. Deleted before close.
- `scratchpad/probe.png` — the screenshot; retained in scratchpad only (ephemeral, untracked).

## How it was verified

| Check | Method | Result |
|---|---|---|
| Production build | `rm -rf .next && npm run build` | exit 0 |
| Lint | `npm run lint` (`--max-warnings 0`) | exit 0 |
| 7 piece **tokens** emit (unconditional) | grep built chunk | all 7 `--color-piece-*` present: `#00ebeb,#efd62f,#c474f9,#63f06f,#ff4f4f,#3480fc,#ff8a1d` |
| `.glass` emits | grep chunk | `backdrop-filter:blur(12px)saturate(1.4)` + fill + border + 2-layer shadow |
| `.glow*` emit | grep chunk | grouped `box-shadow` geometry + 7 per-piece `--glow-color` |
| `@keyframes flash` + `.flash` emit | grep chunk | keyframes 0%/35%/100% + `.flash{animation:flash…}` |
| `.motion*` emit | grep chunk | `transition-property:transform,opacity;duration:.15s;ease:cubic-bezier(.2,0,0,1)` |
| **All 5 render simultaneously** | headless Chrome screenshot of `probe.html` | 7 hues + glass frost + in-hue glow + peak-bloom flash + mid-interp motion, one frame |
| Classes resolve in a real engine | headless Chrome `getComputedStyle` | glass `backdrop-filter:blur(12px) saturate(1.4)`; 7 distinct `lab()` tokens; `.motion` `transform, opacity / 0.15s / cubic-bezier(0.2,0,0,1)` |
| **Boundary: no source change** | `git diff --stat -- app components lib` | **empty** |
| **Boundary: no consumer** | grep vocab classes in `app components lib` | only **definitions** in `app/globals.css`; zero applications in components/lib/app-tick |
| Throwaway | `git status` + probe deletion | no probe file tracked; probe removed |

No unit tests apply — the deliverable is a proof, not code; the repo's vitest suite covers `lib/`
game logic only and is untouched.

## Notable finding — utility tree-shaking vs. unconditional tokens (carry into the render epic)

The first probe filled swatches with the `bg-piece-*` **utility** classes and only **3 of 7** hues
appeared (I/T/L). Root cause, now understood and documented:

- The **`--color-piece-*` tokens** emit **unconditionally** (`@theme static`) — all seven are always
  in the build. This is the reliable public surface; the corrected probe uses it and all seven render.
- The **`bg-/text-/border-/ring-piece-*` utility** wrappers are **content-scanned and tree-shaken**:
  Tailwind v4 emits a `bg-piece-x` rule only if the literal string `bg-piece-x` appears in a scanned
  file. `bg-piece-i/t/l` leaked into the current chunk **only** because those strings appear in prose
  inside `docs/active/work/T-004-01-01/*.md` (Tailwind auto-scans `docs/`); `o/s/z/j` appear nowhere
  as `bg-piece-*`, so their utilities weren't generated.

**Why this is expected, not a bug:** E-004 forbids a component consumer, so the utility family
*correctly* stays tree-shaken until a real consumer references it. When the render epic writes
`className={`bg-piece-${type}`}` (or a static map of all seven), Tailwind will see the strings and emit
all seven utilities. **Action for the render epic:** rely on the tokens directly, OR ensure every
`bg-piece-*`/`glow-*` class you intend to use appears as a **complete literal string** in scanned
source (no runtime string interpolation that hides the class from the scanner — use a full-class
lookup map). This is the standard Tailwind dynamic-class caveat; flagging it here so it isn't
rediscovered as a "missing color" bug mid-render-epic.

## Open concerns / notes for downstream

1. **`.glass` / `.glow*` / `.flash` / `.motion*` are consumer-independent** (component-layer, always
   emitted); the **`*-piece-*` utilities are consumer-dependent** (tree-shaken). Two different emission
   models in one vocabulary — see the finding above. The tokens bridge both: always present.
2. **Nothing animates in the running app yet, by design.** `.flash` and `.motion*` need a consumer to
   trigger/flip state; the probe drove them manually. Not a defect — E-004 is theme-only.
3. **No durable visual catalog was created.** The AC mandates a *throwaway* probe, so none persists. If
   the team later wants a living style reference (Storybook / a `/theme` route), that is a **new**
   story: it would be a permanent consumer of the vocabulary and needs its own boundary framing (it
   cannot live under E-004's no-consumer mandate). Recommended, not in scope here.
4. **Probe recipe is reproducible** from `plan.md` + `progress.md`: build, link the emitted chunk in a
   scratchpad HTML across five zones (freeze `.flash` with `animation-delay:-175ms`), screenshot with
   headless Chrome. Regenerate anytime without touching source.
5. **Boundary is guaranteed by construction, not vigilance.** The probe was scratchpad-only, so no
   amount of probe iteration could dirty the tracked tree — the empty `git diff` is structural.

## Bottom line

The full neon/glass vocabulary — seven piece hue tokens, `.glass`, `.glow*`, `.flash`, `.motion*` — is
**proven live and on-brand end-to-end** in a single simultaneous frame off the real production build,
with **zero** component/lib/app-tick edits and **no** persistent probe. The one nuance worth carrying
forward (utility tree-shaking vs. unconditional tokens) is documented for the consuming render epic.
This closes story S-004-04 and epic E-004: the design system is complete and ready to consume.
