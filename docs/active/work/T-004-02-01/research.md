# Research — T-004-02-01: glassmorphic-panel-utilities

Descriptive map of the codebase as it bears on authoring a reusable **glass panel utility**
(backdrop blur + translucency + hairline border) in the Tailwind theme, so scoreboard/preview
surfaces read as frosted glass by applying one class. What exists, where, how it connects, and
the constraints that shape the work. No solutions proposed here.

## The ticket in one line

Add a single reusable `.glass` (or theme-defined) panel utility to the styling layer in
`app/globals.css` so any surface can read as frosted glass — blur + translucency + hairline
border — via one class. It must (a) **emit into the production CSS build** (grep-verifiable), and
(b) over a busy background in a *throwaway* probe, render a visibly blurred, translucent, bordered
surface. Depends on `T-001-02-01` (Tailwind wired), which is `done`.

## Where styling lives

- **`app/globals.css`** — the single styling entry point, imported once by `app/layout.tsx`
  (`import "./globals.css"`). Current contents (post `a678a1f`):
  - `@import "tailwindcss";` — Tailwind v4 entry.
  - A `:root` block with two raw CSS vars: `--background: #0a0a0f`, `--foreground: #ededf2`.
  - `@theme inline { … }` bridging those into `--color-background` / `--color-foreground`
    (→ `bg-background` / `text-foreground`).
  - `@theme static { … }` — the **seven per-tetromino neon tokens** added by the sibling ticket
    T-004-01-01 (`--color-piece-{i,o,t,s,z,j,l}`).
  - Base `html, body { height: 100% }` and a `body` font stack.
- **`postcss.config.mjs`** — the only build wiring: `plugins: { "@tailwindcss/postcss": {} }`.
  No `tailwind.config.*` (Tailwind v4 is CSS-first; config lives in `@theme` / at-rules).
- There are **no** CSS Modules, no other `.css` files, no inline `<style>`. `globals.css` is the
  sole theme surface. Installed Tailwind is **4.3.2**.

## Consumers, current and future

- **Panels do not exist yet.** The scoreboard, next-piece preview, and hold surfaces named in
  CLAUDE.md's component list are not built. There is no `components/Scoreboard.tsx` /
  `NextPreview.tsx` today — only `components/Board.tsx` and `components/Cell.tsx`.
- **`components/Board.tsx`** hand-rolls a glass-ish look inline today:
  `border border-white/10 bg-white/5 … shadow-2xl`. This is exactly the ad-hoc CSS the epic
  wants to replace with one named class — but Board is a **component**, and editing it is out of
  scope (epic hard boundary, below). It is context, not a target.
- The intended consumers (scoreboard/preview panels) are a **later rendering epic's** work. This
  ticket defines the vocabulary; nothing in the committed diff will apply it.

## Epic / story framing

- **E-004 neon-glass-design-system** — authors the neon/glass vocabulary as *pure theme config*.
  Its stated **HARD BOUNDARY**: define classes/tokens ONLY; edit **no** `components/` or `lib/`
  or app-tick file. Applying classes to Board/Cell/panels is a later consuming epic's work.
- **S-004-02 glass-and-glow-surface-utilities** — this story, two tickets: this one
  (**T-004-02-01**, glass panel) and **T-004-02-02** (glow/shadow — a sibling that will also edit
  `globals.css`). See "Constraints" for the shared-file note.
- This ticket is *only* the glass panel utility. Glow/shadow, row-clear keyframes, and 60fps
  transition classes are separate tickets in this epic.

## The one real technical risk (empirically probed)

Acceptance requires the utility to **emit into the production CSS build** and be grep-verifiable —
in the *committed* state, where the throwaway probe has been removed and **no component consumes
it** (the epic forbids a consumer). This is the exact constraint the sibling color-token ticket
faced, and Tailwind v4's tree-shaking makes the naive approach fail.

Probed empirically against this repo (tailwindcss 4.3.2, via `npm run build` + grep of the emitted
chunk `.next/static/chunks/*.css`), with **no consumer** referencing any probe:

| Mechanism | Emitted with no consumer? | Notes |
|---|---|---|
| `@utility glass { … }` (Tailwind v4 custom utility) | **NO** — tree-shaken away | Same trap as a plain `@theme` token; the extractor only emits utilities that appear in scanned source |
| `@layer components { .glass { … } }` | **YES** — always emitted | lightningcss **auto-prefixed** `-webkit-backdrop-filter`; sits in the `components` cascade layer |
| plain top-level `.glass { … }` (unlayered CSS) | **YES** — always emitted | Also auto-prefixed, but **unlayered** → beats Tailwind utility layer on the cascade |

So a naive `@utility glass` would satisfy the probe check (a probe references it) but **fail** the
"emit in committed build" check the moment the probe is deleted — mirroring the `@theme` →
`@theme static` lesson from T-004-01-01. The mechanism that decouples emission from usage for a
*named class* is a raw CSS rule, and `@layer components` is the layered form of it. This is the
central constraint the Design phase must resolve.

## Glassmorphism: the CSS ingredients

Frosted glass is a small, well-known recipe. The AC names three essentials; the theme's dark neon
canvas motivates two optional depth cues:

- **Backdrop blur** — `backdrop-filter: blur(…)` (+ optional `saturate()` to lift the neon behind
  the glass). Requires the `-webkit-backdrop-filter` prefix for Safari; lightningcss adds it
  automatically from browserslist (proven above).
- **Translucency** — a low-alpha fill (e.g. `color-mix(in oklab, white 6%, transparent)`), so the
  blurred background shows through.
- **Hairline border** — `1px solid` at low alpha (e.g. white ~12–14%) for the crisp glass edge.
- *(Optional, theme-appropriate)* a soft drop `box-shadow` for depth and an `inset 0 1px 0`
  top highlight for the lit glass rim.

## Conventions to respect

- Existing raw literals use **hex** (`#0a0a0f`); tokens use **oklch**. `color-mix(in oklab, …)`
  is a natural fit for deriving translucency from a base color and is well-supported by
  lightningcss (it already rewrote `rgba(255,255,255,0.08)` → `#ffffff14` in the probe).
- `npm run lint` runs `eslint --max-warnings 0` (zero-warning gate). `npm run build` must pass.
  CSS is not linted, but any throwaway probe added under `app/` is TS/ESLint-scoped and must be
  removed before commit so the gate and the "no component edits" boundary both hold.
- No `tailwind.config.*`; the whole surface is `globals.css` at-rules.

## Constraints & assumptions

- **Single file changes:** only `app/globals.css` should change in the committed diff. No
  `components/`, `lib/`, or app-tick edits (epic hard boundary).
- **Shared-file sibling:** **T-004-02-02** (glow/shadow) also edits `globals.css`. Lisa's DAG
  serializes commits via file locking; keep this ticket's change a small, additive, clearly
  fenced block so a later glow block appends cleanly without conflict.
- **No new deps, no config file:** Tailwind v4 needs none.
- **Assumption:** "panel utility" = one reusable class named `.glass` (the AC's own example),
  emitting blur + translucency + hairline border; exact blur radius / alphas / optional shadow
  are Design's to lock. "Emits into the production CSS build" means present in the *committed*
  build with no consumer, matching the sibling ticket's grep-verifiable interpretation.
- **Assumption:** the probe is a verification artifact (busy background + `.glass` panel),
  observed then reverted — never committed.
