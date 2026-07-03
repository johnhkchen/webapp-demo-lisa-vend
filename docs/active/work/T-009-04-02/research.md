# T-009-04-02 — Research: start-overlay-clay-button

## Ticket

Restyle `StartOverlay.tsx`'s "Press Start" pill onto the kit's `.clay-button` primitive,
removing the dark gradient/translucent-pill treatment. AC: no
`from-cyan-400`/`via-fuchsia-400`/`to-violet-400` or `bg-black/50` remain, the pill uses the
kit's `clay-button` class, and `StartOverlay.test.tsx` still passes. Depends on `T-009-01-03`
(Lora/Karla font loading), status `done`.

## The component today

`components/StartOverlay.tsx` (39 lines):

```tsx
export default function StartOverlay({ visible }: StartOverlayProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
    >
      <span className="animate-pulse rounded-full border border-white/20 bg-black/50 px-5 py-2 text-sm font-bold uppercase tracking-widest backdrop-blur-sm">
        <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
          Press Start
        </span>
      </span>
    </div>
  );
}
```

Two nested `<span>`s: an outer "pill" (rounded-full, translucent black background, hairline
white border, backdrop blur, pulse animation, padding, uppercase/tracking typography) wrapping
an inner gradient-clip span that paints the text itself in the old cyan→fuchsia→violet gradient.
The outer `<div>` is the positioning/role wrapper: `role="status"`, bottom-anchored,
`pointer-events-none`.

The 17-line doc comment (lines 1-17) documents the component's design intent in detail:
- Shown during the attract-mode auto-play (`T-008-02-01`), presentational/props-driven, no
  state, `return null` when hidden.
- **Deliberately non-blocking**: `pointer-events-none` so the demo underneath stays fully
  playable/visible; this is why it's a bottom pill, not a full-board dim like `GameOverlay`.
- Pulses "to read as an arcade attract prompt" and currently "uses the app's
  cyan→fuchsia→violet gradient so it belongs to the same system as the title and the other
  overlays" — this line is the one made stale by this ticket (the "other overlays" no longer
  use that gradient; see below).
- Explicitly out of scope: wiring an actual start handler (key/click) is `T-008-02-02`; this
  component has no handlers today and none are added by this ticket.

## `StartOverlay.test.tsx`

```tsx
describe("StartOverlay", () => {
  it("renders nothing when not visible", () => { ... });   // container.firstChild === null
  it("shows a PRESS START prompt when visible", () => {
    render(<StartOverlay visible />);
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/press start/i);
  });
  it("does not intercept input — the demo plays behind it", () => {
    render(<StartOverlay visible />);
    expect(screen.getByRole("status").className).toMatch(/pointer-events-none/);
  });
});
```

All three assertions are structural: `role="status"` presence, text content match, and
`pointer-events-none` substring on the outer div's `className`. None assert on the inner
markup, pill classes, or gradient — so any inner-markup change that preserves `role="status"`,
the visible text, and `pointer-events-none` on the outer div keeps this test green with zero
test edits.

## The kit primitive: `.clay-button` (`styles/vendor/b28-clay.css:94-109`)

```css
.clay-button {
  font-family: var(--clay-font-body);
  font-weight: 600;
  color: var(--clay-on-primary);       /* white */
  background: var(--clay-primary);     /* steel blue #44679b */
  border: none;
  border-radius: var(--clay-radius-pill);  /* 9999px, already a pill */
  padding: 0.7em 1.4em;
  cursor: pointer;
  box-shadow: var(--clay-shadow-raised);
  transition: var(--clay-press);
}
.clay-button:hover { transform: translateY(-1px); background: color-mix(...); }
.clay-button:active { transform: translateY(1px) scale(0.99); background: var(--clay-primary-strong); box-shadow: var(--clay-shadow-pressed); }
.clay-button:focus-visible { outline: 3px solid ...; outline-offset: 2px; }
```

Self-contained: sets its own font, weight, color, background, radius, padding, shadow, and
transition. No modifier variant is needed here — `.clay-button--soft` exists for a *secondary*
button, not applicable (this is the one primary CTA-shaped surface in the app, per the ticket's
own framing: "the one button-shaped surface in the app").

`styles/vendor/b28-clay.css` is imported in `app/globals.css:2`, **after** `@import
"tailwindcss"` (`app/globals.css:1`). Its rules (`.clay-surface`, `.clay-well`, `.clay-button`,
`.clay-chip`, etc.) are plain top-level CSS — not wrapped in any `@layer` — while
`@import "tailwindcss"` establishes Tailwind v4's own `@layer theme, base, components,
utilities`. Unlayered CSS always wins the cascade over any layered rule regardless of source
order, so `.clay-button`'s own `padding`/`background`/`border-radius`/etc. already win over any
Tailwind utility class placed alongside it (e.g. a stray `px-5 py-2` would lose to `.clay-button`'s
`padding: 0.7em 1.4em` either way).

## Existing `.clay-*` primitive consumers (precedent for how these classes get applied)

```
components/NextPreview.tsx:85   className="clay-chip flex flex-col gap-2 p-2"
components/Board.tsx:72         className="clay-well grid h-full w-full gap-px p-2"
components/HoldBox.tsx:65       className={`clay-chip flex flex-col gap-2 p-2 ${canHold ? "" : "opacity-40"}`}
```

Pattern: the primitive class is one token among several in a single `className` string,
composed with plain Tailwind layout utilities (`flex`, `gap-*`, `p-*`) for spacing/layout that
the primitive itself doesn't own. None of these three collide with primitive-owned properties
(`clay-chip`/`clay-well` don't set padding/layout). `.clay-button` is the first primitive in this
codebase that DOES own padding, so composing it with a conflicting padding utility (`px-5 py-2`)
would be inert/misleading, even though it wouldn't break rendering (unlayered wins).

**`.clay-button` has zero consumers today** — this ticket is the first place it lands in the app.

## Prior sibling ticket: T-009-04-01 (GameOverlay.tsx, done)

Same story (`S-009-04`), same epic (E-009 adopt-b28-clay-kit), retoned `GameOverlay.tsx`'s
gradient-clip heading + `bg-black/70 backdrop-blur-sm` scrim onto `bg-foreground/70` /
`text-background` (the `--background`/`--foreground` Tailwind tokens, aliased to
`--clay-bg`/`--clay-ink` in `app/globals.css:15-23`) rather than the vendored kit's opaque
`.clay-surface`/`.clay-well` primitives — reasoning: those primitives are **opaque** fills and
would hide the board GameOverlay is meant to dim-but-not-hide.

That reasoning doesn't transfer here: `.clay-button` is not a translucent-scrim concern, it's
the literal "the one button-shaped surface" the ticket asks for, and the AC explicitly names
`clay-button` as the target class (not a token-reuse pattern). `T-009-04-01`'s design.md
explicitly flagged `StartOverlay.tsx` and `app/page.tsx` as "same gradient idiom, out of this
ticket's AC," deferring them — this ticket and (presumably) a `T-009-04-03` for `app/page.tsx`'s
`<h1>`.

Also flagged by `T-009-04-01` (and recorded in memory `e-009-clay-retone-conventions`): Lora is
loaded via `next/font/google` at weights `["600", "700"]` only (`app/layout.tsx`) — no 900, so
any `font-black` (900) on a heading retoned onto the clay/Lora system needs to drop to
`font-bold` (700). **Does not apply to this ticket**: `StartOverlay`'s pill text is `font-bold`
already (not `font-black`), and `.clay-button` sets its own `font-weight: 600` / `font-family:
var(--clay-font-body)` (Karla, body text) — it is not a heading and never touches Lora.

## Remaining gradient/glass idiom in the codebase (context, not this ticket's scope)

```
app/page.tsx:7   bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 ... text-transparent  (h1)
```

The only other surviving instance after `T-009-04-01`. Out of this ticket's AC (StartOverlay
only); left untouched.

## Test/build tooling

`npm run build`, `npm run lint`, `vitest` (per existing test files' `@vitest-environment jsdom`
header and `@testing-library/react` usage) are the available verification commands, consistent
with every prior clay-retone ticket in this epic.
