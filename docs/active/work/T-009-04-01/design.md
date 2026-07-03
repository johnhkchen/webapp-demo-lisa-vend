# T-009-04-01 — Design: overlay-banners-clay-retone

## Decision up front

Retone `GameOverlay.tsx`'s single shared chrome block (lines 46-58) by swapping three class
groups, reusing the **already-wired** `background`/`foreground` Tailwind tokens (`app/globals.css:15-23`,
bound to `--clay-bg`/`--clay-ink`) rather than introducing new tokens or arbitrary-value syntax:

- Scrim: `bg-black/70 backdrop-blur-sm` → `bg-foreground/70` (drop the blur entirely — no glass).
- Heading: `bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text ... text-transparent`
  → `text-background`; also `font-black` → `font-bold` (see rationale below).
- Subtext: `text-white/70` → `text-background/70`.

Resulting markup:
```tsx
<div
  role={paused ? "status" : "alert"}
  className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-foreground/70 text-center"
>
  <h2 className="text-3xl font-bold tracking-tight text-background sm:text-4xl">
    {paused ? "PAUSED" : "GAME OVER"}
  </h2>
  <p className="text-sm text-background/70">
    {paused ? "Press P to resume" : `Score ${score} · Lines ${lines}`}
  </p>
</div>
```
No import changes, no new files, no `@theme` edits. The doc comment (lines 1-23) needs one
line updated (it still says "dimmed layer," which stays true, but the "Styling here is
deliberately plain" line should note the palette is now clay, not neon-adjacent).

## Options considered

### A — Reuse `background`/`foreground` theme tokens via named utilities (chosen)

`--color-background`/`--color-foreground` are already registered in `@theme inline`
(`app/globals.css:20-23`) as `var(--clay-bg)`/`var(--clay-ink)`, and already proven to support
Tailwind's opacity-modifier syntax in this exact codebase — `Cell.tsx`'s `bg-piece-i/15` does
the same thing against a `@theme static`-registered color. So `bg-foreground/70` and
`text-background/70` are not speculative; they follow an established, working pattern.

**Why this wins:**
- **Minimal diff, same shape as the original.** The original was `bg-black/70` (dark scrim) +
  `text-white/70` (light subtext) — a two-token light/dark contrast pair. Swapping `black`→
  `foreground` (ink) and `white`→`background` (warm cream) is a literal token substitution, not
  a redesign. Preserves the exact opacity numbers (`/70`) so dimming strength is unchanged.
- **No new CSS.** Zero edits to `app/globals.css` or `styles/vendor/b28-clay.css` — this ticket
  touches one component file only, matching its narrow, single-file AC.
- **Legible by construction.** `--clay-ink` (#1c1917) at 70% opacity over the board is still a
  dark scrim (contrast need for `--clay-bg` #faf8f5 text on top is satisfied — that's exactly
  the light-on-dark relationship the original `black/white` pair had, just warm-toned).
- **Reuses proven token wiring** instead of adding a second path (arbitrary `[var(--clay-ink)]`
  or `(--clay-ink)` syntax) that no component in this repo uses yet (confirmed in Research —
  grep found zero arbitrary-value CSS-variable usage in any `.tsx`). Introducing a second
  styling idiom in the same file that already has a working one is unnecessary divergence.

### B — Arbitrary-value syntax against the raw `--clay-*` tokens directly

E.g. `bg-(--clay-ink)/70`, `text-(--clay-bg)`, bypassing `background`/`foreground`.

**Rejected.** Functionally near-identical to Option A (`--background`/`--foreground` literally
alias `--clay-bg`/`--clay-ink` with no transformation in between), so it buys nothing. Costs:
introduces Tailwind v4's `(--token)` arbitrary-property syntax into the codebase for the first
time, when the semantic, theme-registered names already exist and are idiomatic here. Prefer
the token semantics (`background`/`foreground`) — they read as "the token that means *the
page's* bg/fg," which is exactly the relationship an overlay scrim/text pair has to the page.

### C — Adopt `.clay-well`/`.clay-surface` primitive classes from the vendored kit

Wrap the banner in `.clay-well` (or `.clay-surface`) for the kit's full raised/recessed
treatment (shadow recipe, radius token, opaque fill).

**Rejected for this ticket.** Both primitives are **opaque** fills (`background:
var(--clay-surface-raised)` / `var(--clay-well)`, no alpha) — using either would fully hide the
board underneath, breaking the component's explicit, documented design intent (lines 17-18:
"the frozen board stays visible beneath"). That behavior isn't part of this AC (which only asks
to remove three specific class strings and land on "clay tones" + Lora heading) — changing the
overlay from translucent-scrim to opaque-panel is a bigger visual redesign than this ticket
scopes, and risks conflicting with a future ticket that might deliberately design that panel
treatment. Stays with the translucent-scrim shape the component already has.

### D — Add a `--clay-shadow-well` inset shadow to the scrim for extra "clay" tactility

Layer the kit's well shadow recipe onto the scrim div for a recessed-into-clay look.

**Rejected as scope creep.** The AC's bar is "clay tones + Lora heading," not a full
claymorphic shadow treatment. `--clay-shadow-well` is authored for opaque wells (assumes a
solid fill to cast highlight/shadow against); applying it to a 70%-translucent scrim over a
constantly-changing board underneath produces an untested, unpredictable visual (the shadow
would composite against whatever piece colors are frozen beneath, not a stable clay surface).
Simple color swap is the safe, correct-sized change; a follow-up ticket can add shadow polish
if desired.

### E — Change opacity value (e.g. `/70` → `/60`) for a "softer" clay dim

**Rejected.** No AC basis for retuning dim strength, and `--clay-ink` is near-black (#1c1917)
regardless — at `/70` it already reads warm-dark rather than harsh pure-black once the hue
shifts off `#000`. Changing the number would be an uncontrolled, undocumented visual tweak;
keeping `/70` isolates the change to color only, which is what's being asked for.

## `font-black` → `font-bold`

Not explicitly required by the AC, but load-bearing for "renders... with a Lora heading" to be
true in practice: `app/layout.tsx:5-10` loads Lora with `weight: ["600", "700"]` only — no 900
weight exists in the loaded font. `font-black` requests `font-weight: 900`, which Lora doesn't
have; the browser would synthesize/fake-bold or silently clamp to the nearest loaded weight,
neither of which is "the Lora heading" as actually shipped. `font-bold` (700) is loaded and
exact. Kept `tracking-tight` and the `text-3xl sm:text-4xl` sizing — those are layout/type-scale
choices independent of palette and outside this ticket's concern.

## What stays untouched (explicit non-goals)

- `rounded-lg`, `flex flex-col items-center justify-center gap-3`, `absolute inset-0`, `text-center`
  — layout/shape classes, no AC basis to touch.
- `StartOverlay.tsx` and `app/page.tsx` — same gradient idiom, out of this ticket's AC (Research).
- Any `@theme`/`globals.css` edits — Option A needs none.
- `GameOverlay.test.tsx` — asserts only role/textContent (Research); no test changes needed or made.
