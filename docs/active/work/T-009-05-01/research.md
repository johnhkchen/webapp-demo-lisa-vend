# T-009-05-01 — Research: verify-clay-kit-end-to-end

## Ticket scope

This is E-009's closing gate ticket. Unlike its siblings (T-009-03-*, T-009-04-*), it does not
retone a specific component — it verifies that the whole epic's work is actually done: (1) no
trace of the old dark-neon/glass theme remains in `app/` or `components/`, and (2) the vendored
kit (`styles/vendor/b28-clay.css`) is genuinely the single source of truth for palette, i.e.
changing a `--clay-*` token there and rebuilding changes the rendered output with zero
component-file edits. `depends_on` lists every other E-009 ticket (T-009-01-01 through
T-009-04-03), so by construction all retoning work should already be merged on this branch.

## Current state of the kit pipeline

- `justfile` `sync-kit` recipe: `curl`s `https://b28.dev/kit/b28-clay.css` into
  `styles/vendor/b28-clay.css`. This repo already has that file vendored (221 lines,
  `:root` tokens + `.b28-clay`/`.clay-surface`/`.clay-well`/`.clay-button`/`.clay-chip`
  primitives — `.clay-chip` isn't documented in the file's own header comment but is defined
  further down and consumed by `HoldBox`/`NextPreview`).
- `app/globals.css` line 2: `@import "../styles/vendor/b28-clay.css";` — imported before any
  local rule, so `:root` tokens (`--clay-bg`, `--clay-ink`, `--clay-primary`, etc.) are available
  to every subsequent rule in the file.
- `app/globals.css` `:root` bridges three of those tokens into Tailwind's theme pipeline:
  `--background: var(--clay-bg)`, `--foreground: var(--clay-ink)`, `--primary: var(--clay-primary)`,
  then `@theme inline` maps them to `--color-background`/`--color-foreground`/`--color-primary`,
  which is what makes `bg-background`, `text-foreground`, `text-primary`, etc. work as Tailwind
  utilities app-wide (`app/layout.tsx` body, `app/page.tsx` heading).
- Verified by build: `dist/client/_next/static/css/index.*.css` contains the literal
  `--clay-primary:#44679b` rule from the vendored file — confirms the import chain reaches the
  production CSS bundle, not just dev.

## Component usage of the kit

Grep of `clay-` class usage across `components/*.tsx` (excluding tests):
- `Board.tsx`: `clay-well` on the board grid container (recessed surface — T-009-03-01).
- `HoldBox.tsx`, `NextPreview.tsx`: `clay-chip` on their panel wrapper (T-009-03-03/03-04).
- `StartOverlay.tsx`: `clay-button` on the "Press Start" pill (T-009-04-02).
- `GameOverlay.tsx`, `Cell.tsx`, `page.tsx`: consume the *bridged* Tailwind tokens
  (`bg-foreground/70`, `text-background`, `text-primary`, `bg-foreground/5`) rather than a
  `clay-*` primitive class directly — this is still kit-sourced (the tokens trace back to
  `--clay-ink`/`--clay-bg`/`--clay-primary`) but one layer removed, via the `@theme inline`
  bridge rather than a raw `.clay-*` class.
- Per-piece colors (`bg-piece-i` … `bg-piece-l`, `Cell.tsx`/`HoldBox.tsx`/`NextPreview.tsx`) are
  a separate, epic-owned palette (`@theme static` block in `globals.css`, oklch literals) — the
  kit deliberately does not own these ("each game layers only its own playing-piece colors on
  top" per `b28-clay.css`'s header comment and the user-global CLAUDE.md). Not in scope for this
  ticket's grep list, which targets the *background/chrome* signatures only.

## Grep-for-old-signatures result (already run)

`grep -rn "bg-black/70\|from-cyan-400\|bg-white/5\|ring-white/5\|#0a0a0f" app/ components/`
→ **zero matches**, confirmed live in this session (not from a prior artifact's claim).

## Residual "glass"/"glow" vocabulary (not in the AC's literal grep list)

`app/globals.css` still defines a `.glass` class (lines 57–67, `@layer components`) — a
backdrop-blur/translucency utility from the original E-004 neon/glass theme. Grepping
`components/*.tsx` for `glass` (excluding doc comments) finds **zero consumers** — no component
applies `.glass`. It is dead CSS: defined, never used, so it renders nothing anywhere in the
app. `T-009-04-01`'s review artifact independently confirms `GameOverlay.tsx` (the last
consumer) dropped it in favor of `bg-foreground/70`.

`.glow`/`.glow-{piece}` (lines 85–121) is *not* dead — `Board.tsx` applies `flash glow` to the
row-clear burst overlay. This is intentional retained "juice" (E-004's line-clear animation),
tinted by the same per-piece oklch tokens, not the old dark background/glass chrome. Distinct
concern from the AC's grep list.

## Build and test baseline (run live this session, before any change)

- `npm run build` (`vinext build`): succeeds, 5/5 stages, no errors.
- `npm test` (`vitest run`): 32 files / 302 tests, all passing.
- `npm run lint`: not yet run this session (will run in Implement).

## Constraints / assumptions

- The AC's grep list is exhaustive for "old signatures" as far as the ticket defines it — it is
  a fixed, literal list, not "any dark/neon-sounding string." Zero matches already satisfies
  that clause without further code change.
- The AC's third clause (kit-bump propagation) has not yet been *exercised* this session — only
  the import chain has been confirmed structurally. Need to actually bump a `--clay-*` value,
  rebuild, diff the compiled CSS, and revert, to produce direct evidence rather than inference.
- This ticket is verification-shaped, not feature-shaped: the RDSPI phases still apply, but
  "Design"/"Structure"/"Plan" are about how to structure the *verification*, not a code change.
- No dependency ticket's work is visible as incomplete from this pass — but Research is
  descriptive; if Design surfaces a real gap, remediation would be a small, scoped fix (e.g.
  removing dead `.glass` CSS), not a redesign.
