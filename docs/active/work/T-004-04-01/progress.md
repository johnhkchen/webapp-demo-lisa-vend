# Progress — T-004-04-01: throwaway-probe-all-effects

Implementation log. This ticket adds **no** tracked source; the "work" is building a throwaway probe,
proving the full E-004 vocabulary is live end-to-end, confirming the boundary held, and removing the
probe. Steps map to `plan.md`.

## Step 1 — Clean production build ✅
`rm -rf .next && npm run build` → exit 0 (`✓ Compiled successfully`, TS + static gen clean).
Chunk emitted: `.next/static/chunks/13kyw__w9x0n1.css`. `npm run lint` (`--max-warnings 0`) → exit 0.

## Step 2 — Deterministic emit proof (grep the chunk) ✅
All five vocabulary items present in the built chunk with correct computed values:
- **7 piece tokens** (unconditional, `@theme static`): `--color-piece-i:#00ebeb`, `-o:#efd62f`,
  `-t:#c474f9`, `-s:#63f06f`, `-z:#ff4f4f`, `-j:#3480fc`, `-l:#ff8a1d`.
- **`.glass`**: `backdrop-filter:blur(12px)saturate(1.4); background-color:…/.06; border:1px solid…;
  box-shadow:0 8px 32px…,inset 0 1px…`.
- **`.glow` family**: `.glow,.glow-i,…,.glow-l{box-shadow:0 0 var(--glow-spread-1,4px)
  var(--glow-color,currentColor),…}` + each `.glow-{piece}` setting `--glow-color`.
- **`@keyframes flash`** + `.flash{animation:flash var(--flash-duration,.5s)…}`.
- **`.motion,.motion-fast,.motion-slow{transition-property:transform,opacity;…}}`.

## Step 3 — Boundary proof ✅
- `git diff --stat -- app components lib` → **empty** (zero source change; stronger than the AC's
  "only theme changes").
- No-consumer grep: every match of a vocabulary class in `app components lib` is a **definition** in
  `app/globals.css` (e.g. `.glow-i {`), never an application (`className="glow-i"`). `components/`,
  `lib/`, `app/page.tsx`, `app/layout.tsx` reference **none** of the vocabulary. Boundary held.

## Step 4 — Author the throwaway probe (scratchpad) ✅
Wrote `scratchpad/probe.html`: dark viewport (`bg-background text-foreground`), five labelled zones,
`<link>` to the emitted chunk by absolute path. Flash zone freezes one copy at ≈35% via
`animation-delay:-175ms; animation-play-state:paused`. Motion box carries a non-identity
`transform`+reduced `opacity` so a mid-state renders.

### Deviation (worth recording) — probe fills switched from `bg-piece-*` utilities to `--color-piece-*` tokens
First probe used `bg-piece-{i..l}` utility classes. The screenshot showed only **3 of 7** fills
(I/T/L). Root cause: the `bg-piece-*` **utility** family is **content-scanned and tree-shaken** by
Tailwind v4 — only utilities whose literal string appears in a scanned file emit. `bg-piece-i`,
`bg-piece-t`, `bg-piece-l` leaked into the chunk **only** because those exact strings appear in prose
in `docs/active/work/T-004-01-01/{research,structure}.md` (Tailwind auto-scans `docs/`). `o/s/z/j`
appear nowhere as `bg-piece-*`, so their utility wrappers weren't generated. The seven
**`--color-piece-*` tokens**, by contrast, emit **unconditionally** via `@theme static`. Fixed the
probe to fill via `background:var(--color-piece-*)` — the reliable public surface — after which all
seven hues render. This is a genuine finding about the vocabulary surface, carried into `review.md`.

## Step 5 — Render + screenshot ✅
Headless Google Chrome (`--headless --screenshot`, 760×620) → `scratchpad/probe.png` (~86 KB). Visual
confirmation of all five effects **simultaneously** in one frame:
- Zone 1: seven distinct neon hues, similar perceived brightness, one coherent set.
- Zone 2: in-hue glow blooms (cyan/purple/red/green) + a bare `.glow`.
- Zone 3: `.glass` card visibly frosting/blurring a striped colored backdrop; hairline border; depth
  shadow; lit top rim. Composed with `rounded-2xl p-6` (utilities layer over the component class).
- Zone 4: `.flash` frozen at peak bloom — bright neon halo, mid-collapse.
- Zone 5: `.motion` box rendered mid-interpolation (translated, scaled, semi-transparent).

## Step 6 — Computed-style assertions (same engine) ✅
Second headless pass (`--dump-dom`, virtual-time) read `getComputedStyle` on probe elements:
- `--background` = `#0a0a0f`; all 7 `--color-piece-*` resolve to distinct `lab(...)` values.
- `.glass` → `backdrop-filter: blur(12px) saturate(1.4)`, `border: 1px solid`, 2-layer shadow.
- `.glow-t` → non-empty multi-layer `box-shadow`.
- `.motion` → `transition-property: transform, opacity`, `duration: 0.15s`,
  `timing-function: cubic-bezier(0.2, 0, 0, 1)`.
All match the emitted chunk (Step 2) — the classes resolve in a real engine, not just as chunk text.

## Step 7 — Remove the probe / confirm throwaway ✅
`rm -f scratchpad/probe.html scratchpad/assert.html`. Probe never lived in the repo tree, so
`git status` was unaffected throughout; `git diff --stat -- app components lib` still **empty**. No
probe file is tracked. (`probe.png` retained in scratchpad only as ephemeral visual evidence; not
tracked, discarded with the scratchpad.)

## Steps 8–9 — Artifacts
This `progress.md`, then `review.md`. No code commit — nothing tracked changed except the work-dir
RDSPI artifacts.

## Net result
All five effects proven live, on-brand, simultaneous (screenshot + computed style + chunk grep);
boundary held (empty source diff, no consumer); probe removed. E-004 vocabulary is complete and
consumable. One surface caveat surfaced (utility tree-shaking vs. unconditional tokens) — see review.
