# T-009-05-01 — Structure: verify-clay-kit-end-to-end

## Files touched

### Modified (permanent)

- **`app/globals.css`** — delete the dead `.glass` utility block (`@layer components { .glass {
  ... } }`, currently lines 57–67) and its preceding doc comment (lines 45–56, the "Glassmorphic
  panel utility (E-004)" block). No other rule in this file changes. This is the only permanent
  source-tree edit in this ticket.

### Modified (transiently, during Implement, then reverted)

- **`styles/vendor/b28-clay.css`** — `--clay-well` bumped from `#ece7dd` to a visibly distinct
  probe value, rebuilt, compiled CSS inspected, then reverted to `#ece7dd` byte-for-byte before
  the step is considered complete. `git diff` on this file must show **no net change** once
  Implement finishes — the revert is part of the plan step, not a separate cleanup.

### Not touched

- No component file (`components/*.tsx`) changes. The whole point of clause 3 is proving the kit
  propagates *without* component edits — touching one would falsify the exercise.
- No test file changes. `.glass` had zero consumers (confirmed in Research), so no existing test
  references it; deleting it cannot change any test's pass/fail state. No new test is added —
  Design rejected building permanent CSS-output-testing infrastructure as out of scope.
- `justfile`, `wrangler.jsonc`, `package.json` — untouched; nothing in this ticket changes the
  kit-sync mechanism or build/deploy config, only exercises them.

## Artifacts (this ticket's own RDSPI trail)

- `docs/active/work/T-009-05-01/{research,design,structure,plan,progress,review}.md` — six files,
  this phase's output plus the five before/after it. No other `docs/` file changes; this ticket
  does not touch ticket frontmatter (Lisa's job) or other tickets' artifacts.

## Ordering

1. `app/globals.css` edit (delete dead `.glass` block) happens first, in isolation, so it can be
   verified (build + full test suite) independently of the kit-bump exercise below — if something
   broke, it's unambiguous which change caused it.
2. Re-run the two already-passing checks (build clean, five-signature grep) against the
   post-deletion tree, so the AC's first two clauses are certified against the *final* state of
   the repo, not the pre-deletion snapshot from Research.
3. Kit-bump exercise (`styles/vendor/b28-clay.css` mutate → build → inspect compiled CSS → assert
   `git diff --stat` shows only the vendor file changed → revert → build again to leave the repo
   in a clean, deployable state) runs last and self-contained, since it's transient by design and
   has no dependency on step 1.

## No new modules, no new interfaces

This ticket introduces no new component, hook, or lib function — it is pure verification plus
one dead-code deletion. There is nothing to define a public interface for.
