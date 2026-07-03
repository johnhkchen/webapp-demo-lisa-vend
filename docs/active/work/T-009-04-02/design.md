# T-009-04-02 — Design: start-overlay-clay-button

## Decision up front

Collapse `StartOverlay.tsx`'s two nested `<span>`s (outer translucent pill + inner
gradient-clip text) into **one `<span>`** carrying `clay-button`, plus the layout/motion
utilities that are independent of palette (`animate-pulse`, `text-sm uppercase
tracking-widest`). Drop the outer pill's old palette classes (`rounded-full`, `border
border-white/20`, `bg-black/50`, `backdrop-blur-sm`) entirely — `.clay-button` already supplies
pill radius, background, shadow, and color — and drop the inner gradient-clip span entirely,
since `.clay-button`'s own `color: var(--clay-on-primary)` (solid white-on-steel-blue) replaces
the gradient-clip text treatment.

Resulting markup:
```tsx
<div
  role="status"
  className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
>
  <span className="clay-button animate-pulse text-sm uppercase tracking-widest">
    Press Start
  </span>
</div>
```

Outer `<div>` (role, positioning, `pointer-events-none`) is untouched — none of it is palette,
and the AC/test both depend on it as-is. One line of the doc comment needs updating (the
"cyan→fuchsia→violet gradient... same system as the title and other overlays" sentence, now
stale since `GameOverlay` no longer uses that gradient either, per `T-009-04-01`).

## Options considered

### A — Single span, `clay-button` + surviving typography/motion utilities (chosen)

As above. `font-bold` is dropped (not just changed to `font-bold` — it's removed) because
`.clay-button` already sets `font-weight: 600` and, being unlayered CSS, wins the cascade over
any co-applied Tailwind font-weight utility regardless — keeping `font-bold` in the className
would be dead weight that never applies, which is worse than simply not writing it. `px-5 py-2`
is dropped for the same reason (`.clay-button`'s own `padding: 0.7em 1.4em` always wins).
`rounded-full` is dropped as redundant (`.clay-button`'s `border-radius:
var(--clay-radius-pill)` is already `9999px`).

**Why this wins:**
- **Matches the AC literally.** "The pill uses the kit's clay-button class" — one span, one
  class doing the button-shaped work, is the most direct reading. No modifier class needed:
  `.clay-button--soft` is for a secondary/neutral button, and this is the app's one primary CTA
  surface (ticket's own framing), so the bare `.clay-button` (steel-blue primary) is correct.
- **No dead/overridden classes.** Composing `.clay-button` with utilities it already fights and
  wins against (`px-5 py-2`, `rounded-full`, `font-bold`) would leave misleading classes in the
  markup that look like they do something but never apply. Research confirmed the cascade
  math (unlayered vendor CSS beats layered Tailwind utilities) — better to just not write them,
  matching this repo's existing `.clay-chip`/`.clay-well` consumers, which only ever compose
  primitive classes with utilities the primitive does *not* already own (`flex`, `gap-*`, `p-*`
  used for the *container's* layout, not fighting the primitive's own box model).
- **Preserves what's genuinely independent of palette.** `animate-pulse` (the "arcade attract
  prompt" pulse, called out explicitly in the doc comment as a deliberate design choice
  unrelated to color) and `uppercase tracking-widest text-sm` (the pill's typographic voice —
  arcade-marquee caps) carry over unchanged. This mirrors `T-009-04-01`'s explicit principle:
  touch only the classes the AC's palette complaint is actually about, leave shape/motion/type
  scale alone unless there's a concrete reason (there the `font-black`→`font-bold` reason was
  Lora's loaded weights; no such forcing function here since `.clay-button` isn't a heading and
  doesn't touch Lora).
- **Zero test changes.** `role="status"`, the outer div's `pointer-events-none` substring, and
  the "Press Start" text content are all untouched — the three existing assertions keep passing
  (verified against `StartOverlay.test.tsx` in Research).
- **One-element simplification is a side effect, not a goal, but it's free here.** The inner
  gradient span existed *only* to `bg-clip-text` the gradient onto the text; with no gradient,
  there is nothing left for it to do, so keeping it around empty/classless would be inert
  markup. Collapsing to one span is the natural consequence of removing the thing the span was
  for, not scope creep.

### B — Keep two spans; put `clay-button` on the outer, leave inner span present but classless

**Rejected.** Once the inner span carries no classes (no gradient to clip), it is pure dead
markup — a wrapper around text with zero effect. Removing it is not a redesign, just removing
now-inert structure that only existed to support the gradient-clip technique. Keeping it would
be indistinguishable from Option A at runtime/for tests but adds unexplained structure a future
reader would have to figure out is a no-op.

### C — Wrap in a real `<button>` element instead of `<span>`

**Rejected — out of scope and contradicts the component's documented design.** The doc comment
(Research) is explicit and repeated: this component is non-interactive by design
(`pointer-events-none`), has no handlers, and wiring the actual Start interaction is
`T-008-02-02`'s job, not this ticket's. `.clay-button` is a plain CSS class, not tied to the
`<button>` tag — nothing about the kit or the AC requires a semantic element change, and
introducing one here would be an uncalled-for interactivity change to a component whose header
comment explicitly says "hence no handlers here." Precedent: `.clay-chip`/`.clay-well` are
already applied to `<div>`s in this codebase (`NextPreview.tsx`, `Board.tsx`, `HoldBox.tsx`),
not tag-restricted.

### D — Add `.clay-button--soft` instead of bare `.clay-button`

**Rejected.** `--soft` is the kit's secondary/neutral variant (`clay-surface-raised`
background, ink text) — for a second, lower-emphasis action alongside a primary one. This pill
is the sole CTA-shaped element in the whole app (ticket context: "the one button-shaped surface
in the app"), so it should read as primary. The bare `.clay-button` (steel-blue, white text) is
the correct emphasis level and also gives the highest-contrast "arcade marquee" pop against the
board, closest in spirit to the removed gradient's job of standing out.

### E — Retune padding/sizing via extra utilities (e.g. keep `px-5 py-2` in addition to `clay-button`)

**Rejected**, covered under Option A's rationale — inert due to cascade order (Research), and
no AC basis to make the pill a different size than the kit's default anyway.

## Doc comment update

Line 11-12 currently reads:

> "It pulses to read as an arcade attract prompt and uses the app's cyan→fuchsia→violet
> gradient so it belongs to the same system as the title and the other overlays."

Rewritten to describe the actual post-retone system without inventing new claims:

> "It pulses to read as an arcade attract prompt and uses the kit's `.clay-button` pill so it
> belongs to the same system as the other overlays, per E-009."

Matches the phrasing style `GameOverlay.tsx`'s own updated doc comment now uses ("per E-009,
drawn from the clay palette ... rather than the app's former neon/glass one" —
`GameOverlay.tsx:22-23`). Not extending this line to claim `app/page.tsx`'s title is also
retoned yet (it isn't — Research confirms it still has the gradient) — "the other overlays"
(i.e. `GameOverlay`) is accurate; "the title" is dropped from the sentence since that part is
no longer true.

## What stays untouched (explicit non-goals)

- Outer `<div>`: `role="status"`, `pointer-events-none absolute inset-x-0 bottom-4 flex
  justify-center` — no palette content, no AC basis to touch, tests depend on it verbatim.
- `visible` prop / early-`return null` guard — unrelated to styling.
- `app/page.tsx`'s `<h1>` gradient — explicitly out of this ticket's AC (Research), presumably
  a further E-009 ticket.
- `StartOverlay.test.tsx` — all three assertions are structural and survive unchanged
  (Research); no edits made or needed.
- Any `@theme`/`globals.css`/`b28-clay.css` edits — `.clay-button` already exists and needs no
  new tokens or variants for this use.
