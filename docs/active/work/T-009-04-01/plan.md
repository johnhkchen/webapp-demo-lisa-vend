# T-009-04-01 — Plan: overlay-banners-clay-retone

## Steps

1. **Edit `components/GameOverlay.tsx`** — apply the three class-string swaps from Design/
   Structure:
   - Outer scrim `<div>`: `bg-black/70 backdrop-blur-sm` → `bg-foreground/70`.
   - `<h2>`: drop the gradient-clip-text group + `font-black` → add `text-background` +
     `font-bold`.
   - `<p>`: `text-white/70` → `text-background/70`.
   - Update the trailing sentence of the top doc comment to reflect the clay palette.
   Atomic, single-file, single commit-worthy step — no intermediate state to verify separately.

2. **Static verification** — `grep -n "cyan-400\|fuchsia-400\|violet-400\|bg-black/70" components/GameOverlay.tsx`
   must return nothing (AC's literal wording, checked directly rather than inferred).

3. **Run the test suite for this file** — `npx vitest run components/GameOverlay.test.tsx`.
   Expect all 6 existing tests green, unmodified. This is the AC's explicit correctness gate.

4. **Run the full test suite** — `npm test` (all files) as a regression check, since
   `GameOverlay` doc-comment/class changes are isolated but a full run is cheap and confirms no
   accidental cross-file breakage (e.g. from an unrelated stale snapshot).

5. **Lint** — `npm run lint` to catch any class-order/formatting issues Tailwind/ESLint config
   flags (e.g. `eslint-plugin-tailwindcss` class sorting, if configured) before commit.

6. **Manual/visual spot-check** — start the dev server, trigger both overlay variants
   (game-over via top-out, paused via P), and visually confirm: scrim reads as warm dark clay
   (not pure black, not blurred/glassy), heading text is a legible warm cream, weight looks
   solid (not double-bold or thin — confirming `font-bold`/700 actually resolves against the
   loaded Lora weight rather than a synthesized fallback). This step is the only one that
   can't be fully captured by the automated tests and is called out explicitly per
   CLAUDE.md's UI-change guidance.

7. **Commit.** One commit for the class-string edit (feat/style-scoped). Ticket is small enough
   that a single commit covers the whole Implement phase — no reason to artificially split.

## Testing strategy

- **Unit/component test:** `GameOverlay.test.tsx` already exists and is role/text-content based
  — no new test needed, no existing test edited. This is a deliberate choice: the AC bar is
  "still passes," not "gains new coverage," and the change is a pure style edit with no new
  behavior to assert on (no new prop, no new branch, no new conditional logic). Adding a test
  that asserts on specific class strings would be brittle (breaks on the next palette tweak)
  and isn't what this ticket's testing discipline calls for — Research confirmed the existing
  suite deliberately avoids className assertions for exactly this reason.
- **Static grep check** (step 2) stands in for a "no forbidden substring" test — cheap, exact,
  matches the AC's literal wording without needing a new automated test file for a one-line
  invariant.
- **Manual visual check** (step 6) is the closest thing to an "integration test" this ticket
  gets, per CLAUDE.md's instruction to verify UI changes in a running app before reporting
  done — recorded here as a required step, not an optional nicety.

## Verification criteria (maps to AC)

- [ ] `grep` for the three gradient utility fragments and `bg-black/70` in
      `components/GameOverlay.tsx` returns no matches.
- [ ] Banner renders in clay tones (scrim: `bg-foreground/70`; text: `text-background` /
      `text-background/70`) — confirmed by reading the diff and by the visual spot-check.
- [ ] Heading is an `<h2>` (inherits Lora via the existing global selector — unchanged
      mechanism, confirmed still in place).
- [ ] `GameOverlay.test.tsx` passes, unmodified.

## Commit granularity

One commit: `style(GameOverlay): retone game-over/paused banner onto clay palette`. Small,
single-file, single-concern change — matches "atomic, independently verifiable" from the RDSPI
Plan-phase guidance without over-fragmenting a two-class-swap edit into multiple commits.
