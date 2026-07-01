# Structure — T-004-04-01: throwaway-probe-all-effects

The blueprint. Because this is a verification ticket with a **throwaway** probe, the structure is
unusual: **no tracked source file is created, modified, or deleted.** The only files that persist are
the RDSPI artifacts under `docs/active/work/T-004-04-01/`. Everything the probe touches is scratchpad,
outside the git tree, discarded at close.

## File inventory

### Created — ephemeral, scratchpad only (NOT tracked, removed before close)
Scratchpad root: `/private/tmp/claude-501/-Users-johnchen-swe-repos-webapp-demo-lisa-vend/<session>/scratchpad/`

- `probe.html` — the single throwaway probe document. Static HTML, no framework. `<head>` links the
  emitted production CSS chunk (`.next/static/chunks/*.css`) by absolute path. `<body class="…dark…">`
  lays out the five labelled zones (Design decision 4). This is the "throwaway probe" of the AC.
- `probe.png` — one screenshot of `probe.html` rendered by headless Chrome. The visual proof artifact.
- `probe-assert.js` *(optional, folded into the Chrome invocation)* — computed-style assertions read
  in the same headless session; may be inline `--dump-dom` / evaluate rather than a separate file.

None of these are under the repo; `git status` never shows them. They die with the scratchpad.

### Created — tracked, the actual deliverables (persist)
Under `docs/active/work/T-004-04-01/`:
- `research.md` — done.
- `design.md` — done.
- `structure.md` — this file.
- `plan.md` — next.
- `progress.md` — Implement-phase log (probe build, build/grep/screenshot results, probe removal).
- `review.md` — handoff.

Optionally, `progress.md` may reference a copied `probe.png` **only if** we choose to retain the visual
evidence in the work dir. Decision: **do not** copy it into the tracked tree by default — the AC says
throwaway; the deterministic build/grep results recorded in `review.md` are the durable proof. (If a
human reviewer wants the pixels, the recipe to regenerate them is in `plan.md`.)

### Modified — tracked source
**None.** `app/globals.css`, `app/page.tsx`, `app/layout.tsx`, `components/**`, `lib/**`, and all
config are **byte-for-byte untouched.** Net `git diff --stat -- app components lib` = empty. This is
the boundary proof in its strongest form: not "only theme changes," but *no* source change at all.

### Deleted — tracked source
**None.**

## The probe document shape (probe.html)

Not code here — the shape. One dark full-viewport page, background `#0a0a0f` (the app's `--background`),
`foreground #ededf2`, so effects read on-brand. Zones top-to-bottom, all painted in the one frame:

```
┌─────────────────────────────────────────────────────────────┐
│  ZONE 1 — seven piece hues (simultaneous)                    │
│   [I][O][T][S][Z][J][L]   each .bg-piece-*  (one neon set)   │
│                                                               │
│  ZONE 2 — neon glow                                          │
│   [I .glow-i] [T .glow-t] [Z .glow-z] …  in-hue bloom        │
│                                                               │
│  ZONE 3 — glass panel                                        │
│   .glass card (+ rounded-2xl p-6) over a colored backdrop    │
│   → backdrop blur+saturate visibly frosts what's behind      │
│                                                               │
│  ZONE 4 — row-clear flash                                    │
│   [.flash][.flash][.flash]  + one copy frozen at peak bloom  │
│   (animation-delay:-175ms ≈ 35% keyframe → still shows bloom)│
│                                                               │
│  ZONE 5 — 60fps transition                                   │
│   .motion element, transform+opacity toggled → mid-interp    │
│   frame; computed style asserts property/duration/easing     │
└─────────────────────────────────────────────────────────────┘
```

Each zone carries a small text label so the screenshot is self-describing for a reviewer.

## Interfaces / dependencies (read-only consumption)

The probe **consumes** the public E-004 surface exactly as a future component would, to prove it's
consumable — but from outside the tree:
- **Color utilities**: `bg-piece-i|o|t|s|z|j|l` (emitted by `@theme static`).
- **Component-layer classes**: `.glass`, `.glow` + `.glow-{piece}`, `.flash`, `.motion|-fast|-slow`.
- **Tunable knobs** (defaults, not overridden here): `--glow-*`, `--flash-*`, `--motion-*`.
- **The built chunk**: `.next/static/chunks/*.css`, produced by `npm run build`. The probe links this
  exact file, so it renders what production ships — the honest subject of the test.

No new interface is defined. Nothing imports the probe. The probe imports (links) only the built CSS.

## Ordering of changes (where it matters)

1. `npm run build` **must** run first — the probe links the chunk it produces; the chunk's hashed
   filename is discovered from `.next/static/chunks/*.css` after the build.
2. Write `probe.html` referencing that resolved chunk path.
3. Render + screenshot + assert with headless Chrome.
4. Grep the chunk + `git diff --stat` + no-consumer grep (deterministic proof).
5. Remove the probe (scratchpad discard) — or rely on scratchpad ephemerality; either way `git status`
   is unaffected.
6. Write `progress.md` then `review.md`.

## Invariants this structure guarantees

- **Boundary held by construction** — no tracked file is writable in the plan, so it cannot be
  violated. The proof is `git diff --stat` = empty, corroborated by no-consumer greps.
- **Throwaway by construction** — the probe is scratchpad-only; git never tracks it; close = discard.
- **Tests the shipped artifact** — links the emitted chunk, not a copy.
