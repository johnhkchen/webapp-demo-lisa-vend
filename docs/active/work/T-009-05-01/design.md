# T-009-05-01 — Design: verify-clay-kit-end-to-end

## What "done" means for a verification ticket

The AC is three conjoined, testable clauses. Design's job is to decide *how* each is exercised
so Review can point at direct evidence, not inference:

1. `npm run build` succeeds.
2. Repo-wide grep for five literal old-theme signatures across `app/` and `components/` returns
   zero matches.
3. Bumping a `--clay-*` value in the vendored kit file and rebuilding changes the rendered
   palette, with no component file touched.

Plus one judgment call the AC implies but doesn't spell out: what to do about the dead `.glass`
CSS found in Research.

## Clause 1 & 2 — already satisfied, mechanically re-verifiable

Both were run live in Research with clean results. No design decision needed beyond "run them
again in Implement as the first two plan steps and record the transcript" — they're pure
verification, zero risk of needing a code change. Re-running rather than trusting the Research
snapshot matters because Research and Implement could in principle run in different sessions
(per RDSPI's crash-recovery model) — Implement re-proves rather than assumes.

## Clause 3 — needs a real exercise, not just structural reasoning

**Option A: Bump a token, rebuild, inspect compiled CSS, revert.**
Change `--clay-primary` (or another token actually consumed by a component, e.g. `--clay-well`
or `--clay-surface-raised`) in `styles/vendor/b28-clay.css`, run `npm run build`, grep the
compiled `dist/client/_next/static/css/*.css` for the new value, confirm it's present and the
old value is gone, confirm `git diff` shows zero component files touched, then revert the kit
file back to the original vendored value (this repo's copy must stay byte-identical to what
`just sync-kit` would produce — a permanently mutated vendor file would itself violate "vendor,
don't fork").

**Option B: Static/structural argument only** (trace the CSS cascade by reading, no rebuild).
Rejected — Research already did the structural trace (`@import` → `:root` → `@theme inline` →
Tailwind utilities) and it's necessary but not sufficient. The AC explicitly says "bumping...
and rebuilding" — it wants the live loop exercised, and a build-time regression (e.g. Tailwind
v4 inlining/caching the vendored file at a stale value, a purge step dropping unreferenced
custom properties) would only surface by actually doing it.

**Option C: Add a permanent automated test** (e.g. a vitest/build script assertion that greps
compiled CSS for a token value) so the propagation check runs on every CI build going forward.
Rejected for this ticket: the AC asks to *confirm* propagation works, not to build permanent
regression infrastructure for it, and there's no existing CSS-output-testing pattern in this
repo's test suite (all 32 existing test files are component/logic unit tests via
`@testing-library/react` + `jsdom`, none inspect build output). Introducing a new test category
is a design decision for its own ticket, not a byproduct of a verification pass. Noted as a
possible future gap in Review, not built here.

**Decision: Option A.** Cheapest, most direct evidence, matches the AC's literal wording, no new
test infrastructure. Revert is mandatory — this is a verification exercise, not a palette
change; leaving the kit file mutated would drift it from `b28.dev`'s source of truth and break
`just sync-kit`'s idempotency.

Token to bump: `--clay-well` (`#ece7dd`, consumed by `.clay-well`, which `Board.tsx`'s board
container uses) — chosen because it's a primitive-class token (exercises the `.clay-well`
primitive path) rather than one of the three tokens bridged through `@theme inline`
(`--clay-bg`/`--clay-ink`/`--clay-primary`, already implicitly exercised by every existing page
render). Bumping a primitive-class token instead demonstrates the *other* half of the kit's
surface — both propagation paths get covered across the two clauses.

## The dead `.glass` CSS

**Option A: Leave it.** The AC's grep list doesn't name `.glass`, and it has zero consumers, so
it renders nothing — no visitor can ever see a trace of it. Strictly, the AC is already met.

**Option B: Remove it.** The epic's own acceptance bar (ticket Context, not just the AC
checklist) says "confirm zero remaining dark-neon/glass trace anywhere in the app." A `.glass`
rule that says "Glassmorphic panel utility" in its own doc comment, sitting in `app/globals.css`
which ships to every page, is a trace — inert, but a trace. It's also low-risk, low-cost to
remove: zero consumers (confirmed in Research), so deleting it cannot change any rendered output
or break any test.

**Decision: Option B — remove it**, plus the doc comments that only exist to explain *why*
`.glass` was written the way it was (the tree-shaking rationale comment block). This is a small,
surgical deletion (one `@layer components { .glass {...} }` block + its preceding doc comment),
squarely inside "confirm zero remaining... trace" as the ticket's own stated purpose, and
distinct from `.glow`/`.flash`/`.motion`, which stay because they're live, consumed, and not
"neon/glass" — they're the retained juice/motion vocabulary the epic never asked to remove.

## Rejected: touching `.glow`

Considered whether `.glow`'s doc comments ("Per-piece neon glow utilities") count as "neon...
trace" language worth rewording. Rejected — `.glow` is live (consumed by `Board.tsx`), functions
correctly, and its color source is the *kept* per-piece palette, not the removed dark-chrome
theme. Renaming/rewording a working, in-scope utility's comments is cosmetic churn outside this
ticket's verification purpose; flagged in Review as a non-blocking naming note only if relevant.
