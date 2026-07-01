# Design — T-001-02-01: wire-tailwind-styling

Decisions grounded in `research.md`. The Tailwind-vs-CSS-Modules and v3-vs-v4 forks are
human-assented inputs, not decisions to reopen. The real question this ticket answers: given the
scaffold already made Tailwind *apply*, what is the honest, minimal delta that makes it wired
**end-to-end** and *settled* — without stealing the theme epic's scope?

## The situation Design must reckon with

Research established that Tailwind is already applying (used utilities reach the browser and
survive `next build`). Taken literally, the acceptance criterion — "a Tailwind utility class on a
page element visibly takes effect in dev, surviving build" — is **already satisfied** by
`app/page.tsx`. So Design's job is to decide whether this ticket is a no-op verification or
whether there is a genuine, in-scope gap to close.

The one concrete gap Research surfaced: the `@theme inline` token bridge
(`--color-background`/`--color-foreground` → `bg-background`/`text-foreground`) is **declared but
dead** — consumed nowhere, so it never reaches build output, while `body` colors itself with raw
`var(--background)` CSS that bypasses Tailwind. "Wired end-to-end" is exactly the property this
dead bridge lacks.

## Decision 1 — Scope: verify-only vs verify + prove the token bridge

**Options**
- **A. Verify-only.** Run dev/build, confirm a utility class applies and survives, document it.
  Change no source.
- **B. Verify + prove the token bridge.** Additionally put the already-declared
  `bg-background`/`text-foreground` utilities into real use on `<body>`, replacing the raw-CSS
  color rules, so the CSS-var → `@theme` → utility → element → build chain is proven, not just
  the plain-utility chain.
- **C. Expand the theme.** Add new tokens (spacing, brand palette, radius scale) to `@theme` to
  "settle" styling ground more fully.

**Assessment against research**
- A is defensible literally but leaves the ticket's own reason-for-existing unaddressed: the
  scaffold *already* did verify-only work incidentally. A distinct DAG node that "wires Tailwind
  end-to-end" should leave the wiring measurably more complete than the scaffold did. A also
  leaves a latent trap: a declared-but-dead `@theme` bridge is the kind of thing the theme epic
  would trip over ("why doesn't `bg-background` emit?").
- C is out of bounds. Research is explicit: brand palette, glow, motion, and token expansion
  belong to the later neon/glass epic. Adding tokens now re-opens ground the scaffold
  deliberately deferred and risks colliding with that epic's design.
- B threads the needle. It uses **only the bridge that already exists** — no new tokens, no
  brand colors, no motion — and converts it from dead to proven. It makes "end-to-end" literally
  true (the token pipeline now emits and applies), and it hands the theme epic a *working*
  pattern to extend (`@theme` token → utility on an element) rather than a broken one to debug.

**Decision: B.** Prove the existing token bridge; do not expand it. This is the smallest change
that makes the ticket title honest and de-risks the theme epic, while staying strictly inside
"wire + prove" and outside "theme."

*Rejected:* A — under-delivers against the ticket's stated intent and leaves a dead bridge.
*Rejected:* C — steals the theme epic's scope; violates the "don't re-open settled ground"
guidance.

## Decision 2 — How to consume the bridge

**Options**
- **A. On `<body>` in `layout.tsx`** via `className="… bg-background text-foreground"`, and
  delete the now-redundant raw `background`/`color` rules from the `body` block in `globals.css`.
- **B. On `app/page.tsx`'s `<main>`** instead of the body.
- **C. Add a new demo element** solely to exercise the utilities.

**Assessment**
- A is the natural home: the body is where the page-wide background/foreground already live, so
  replacing raw CSS with the equivalent utilities is a true refactor (same rendered pixels,
  proven pipeline) rather than added surface. It also removes duplication — right now the color
  intent is stated twice (CSS var default *and* raw body rule).
- B works but leaves the body's raw color rules in place, so the duplication/bypass remains and
  the change reads as decorative rather than structural.
- C adds throwaway markup — the scaffold explicitly avoided demo cruft; reintroducing it is a
  regression in cleanliness.

**Decision: A.** Move page-level color to the `bg-background`/`text-foreground` utilities on
`<body>`; drop the redundant raw `background`/`color` declarations. Keep `height`/`min-height`
and the font stack as-is (those are not part of the token bridge and have no utility equivalent
worth introducing now). Net rendered appearance is identical — the dark canvas is preserved.

*Rejected:* B/C — leave duplication or add cruft.

## Decision 3 — Keep `@theme inline`, `:root` vars, and font handling as-is

- **`@theme inline`**: retain. It is the v4-idiomatic bridge and now becomes live. `inline`
  means the utilities resolve to the `var(--background)` value at use site — correct for a token
  the theme epic will later reassign.
- **`:root` custom properties**: retain. They remain the single source of truth for the two
  colors; the theme epic will extend this palette. Removing them would break the bridge.
- **Font stack**: leave the system-font stack in the raw `body` rule. Tailwind's font utilities
  would need a `--font-*` theme token to be meaningful; introducing one is theme-epic scope.
  Out of bounds here.

## Decision 4 — Verification strategy

The AC demands a *visible* effect surviving `build`. Verification (detailed in Plan):
1. `npm run build` passes.
2. Grep the emitted prod CSS for `.bg-background` / `.text-foreground` / `--color-background` —
   they must now be **present** (they were absent at baseline). This is the objective,
   grep-able proof that the token bridge is live end-to-end.
3. `npm run dev` + `curl` the page; confirm HTTP 200 and the body carries the utility classes.
4. `npm run lint` stays green.

This converts the AC's "visibly takes effect" into a reproducible, inspectable check rather than
a subjective eyeball test.

## Net design

Put the already-declared `bg-background`/`text-foreground` Tailwind utilities into real use on
`<body>` (layout.tsx), delete the redundant raw color rules in `globals.css`, and leave every
other styling decision (tokens, fonts, theme) untouched. Result: the token→utility→element→build
pipeline is proven live and grep-verifiable, the rendered page is pixel-identical, and the theme
epic inherits a working bridge pattern instead of a dead declaration — settled ground, no scope
theft.
