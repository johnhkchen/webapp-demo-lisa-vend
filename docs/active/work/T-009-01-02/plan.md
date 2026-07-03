# T-009-01-02 — Plan: wire-clay-tokens-into-tailwind-theme

## Steps

### Step 1 — Edit `app/globals.css`

Apply both edits from Structure in a single pass:
1. Insert `@import "../styles/vendor/b28-clay.css";` as line 2, right after
   `@import "tailwindcss";`.
2. Change the `:root` block's two values from `#0a0a0f`/`#ededf2` literals to
   `var(--clay-bg)`/`var(--clay-ink)`.

Leave every other line in the file untouched.

**Verification for this step:**
- `npm run build` exits 0.
- `grep -n "clay-bg\|clay-ink" app/globals.css` shows the two new references.
- Diff review: confirm no line outside the `@import`/`:root` block changed (`git diff
  app/globals.css` should show exactly a 1-line insertion + a 2-line value swap).

This is the only code step — the ticket is a two-value CSS edit plus one import line, there is
no second file or module boundary to sequence against.

### Step 2 — Verify the resolved token values render correctly

Confirm the acceptance criterion's second half ("the rendered body background is the new
light clay tone") with an actual render, not just a build-succeeds check:
- Start `npm run dev` (or use the `run` skill / a quick script) and inspect the computed
  `background-color` of `<body>` in a real page load, OR
- Build and grep the emitted CSS output for the compiled `--color-background` value to confirm
  it carries through to `#faf8f5` (Tailwind v4 resolves `var()` chains at build time into the
  final CSS custom property declarations, so the compiled output is directly inspectable).

Either approach is acceptable; prefer whichever is faster to execute reliably in this
environment. Record which one was used and its result in `progress.md`.

**Verification for this step:** computed/compiled background color is `#faf8f5` (or the
`oklch`/equivalent Tailwind emits for it), not `#0a0a0f`, and text color path resolves to
`#1c1917`, not `#ededf2`.

### Step 3 — Regression check

Run the full existing suite to confirm nothing outside this file's scope broke:
- `npm run test` — expect all 32 files / 302 tests to still pass (this ticket touches no
  `lib/`, no component, no test file).
- `npm run lint` — expect clean (CSS-only change, but cheap to confirm no stray lint
  config touches `globals.css`).

**Verification for this step:** both commands exit 0 with no new failures relative to the
pre-change baseline.

## Testing strategy

- **No new unit tests.** This ticket has zero `lib/`/component logic — it is a CSS custom
  property re-source. There is no meaningful unit-testable surface (per T-009-01-01's own
  precedent for the sibling justfile ticket, and confirmed in Research: no existing test
  touches `globals.css` content).
- **What gets verified instead:** the two explicit acceptance-criterion checks —
  (a) `npm run build` succeeds, (b) the rendered/compiled background resolves to the kit's
  warm off-white, not the old dark hex. Both are procedural/visual checks, not unit tests,
  matching the nature of the change.
- **Regression coverage:** the existing 302-test suite plus lint, run unchanged, to catch any
  unexpected fallout (e.g. if the `@import` path were wrong and broke the build, or if some
  hidden dependency on the literal hex values existed — Research found none, but the full
  suite run is the cheap confirmation).

## Commit plan

One commit, since this is a single atomic file edit with no meaningful sub-steps to split:
- `feat(T-009-01-02): wire clay bg/ink tokens into tailwind theme` (or equivalent), containing
  the `app/globals.css` diff plus this ticket's `docs/active/work/T-009-01-02/` RDSPI
  artifacts.

## Risks / rollback

- **Risk:** if the relative import path (`../styles/vendor/b28-clay.css`) is wrong, the build
  either fails (Tailwind v4 errors on an unresolvable `@import`) or silently drops the kit
  file, leaving `--clay-bg`/`--clay-ink` undefined and `--background`/`--foreground` falling
  back to nothing (invalid CSS custom property, browser default). Mitigated by Step 1's build
  check plus Step 2's rendered-value check — either failure mode is caught before commit.
- **Rollback:** trivial — revert the single-file, single-commit change. No migrations, no
  dependent files, no data.
