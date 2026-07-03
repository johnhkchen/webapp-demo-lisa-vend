# T-009-05-01 — Plan: verify-clay-kit-end-to-end

Each step is independently verifiable and committable per RDSPI's "small enough to commit
atomically" guidance. Steps 1–2 are one commit (the only permanent source change); the rest are
verification with no resulting diff, folded into the final docs commit.

## Step 1 — Remove dead `.glass` CSS

- Edit `app/globals.css`: delete the `.glass` doc comment block + `@layer components { .glass {
  ... } }` rule (Design decision, Structure lines 45–67).
- Verify: `grep -n "\.glass" app/globals.css components/*.tsx` → zero matches (was already zero
  in components; now zero in globals.css too).
- Verify: `npm run lint` → clean (no unused-selector lint exists in this stack, but confirms no
  syntax break).
- Test strategy: no new test. Regression coverage is the full existing suite (step 2) — `.glass`
  had zero consumers per Research, so no test could have depended on it; a green full suite after
  deletion is sufficient proof nothing broke.

## Step 2 — Full regression pass on the post-deletion tree

- `npm test` (vitest) → expect 32/32 files, 302/302 tests passing (same count as the Research
  baseline — a count *change* would mean something unexpected happened, e.g. a snapshot tied to
  globals.css content).
- `npm run build` (vinext) → expect clean 5/5-stage build, same as Research baseline.
- `npm run lint` → expect clean.
- Commit point: `feat(T-009-05-01): remove dead glass CSS from globals` (or similar) — this is
  the one commit with a real diff.

## Step 3 — Re-verify AC clause 2 (signature grep) against final tree

- `grep -rn "bg-black/70\|from-cyan-400\|bg-white/5\|ring-white/5\|#0a0a0f" app/ components/`
  → expect zero matches (re-confirms Research's result post-deletion; deletion only touched
  `.glass`, which isn't one of these five strings, so no change expected, but re-run for the
  record against the exact tree Review will describe).

## Step 4 — Re-verify AC clause 1 (build) against final tree

- `npm run build` → already covered by Step 2's build, but Step 2's build predates nothing else
  changing before Step 3, so no separate re-run needed. (Folded into Step 2; listed separately
  here only to map 1:1 onto the AC's three clauses for Review's checklist.)

## Step 5 — Exercise AC clause 3: kit-bump propagation

- Read current `--clay-well` value in `styles/vendor/b28-clay.css` (`#ece7dd`), confirm via
  `git diff` the file is currently clean (no pending changes) before mutating.
- Edit `styles/vendor/b28-clay.css`: `--clay-well: #ece7dd;` → `--clay-well: #ff00ff;` (a
  maximally-distinct probe value — impossible to confuse with an unrelated coincidental hex).
- `npm run build`.
- `grep -o -- "--clay-well:#ff00ff" dist/client/_next/static/css/*.css` → expect one match
  (confirms the new value reached the compiled bundle).
- `grep -o -- "--clay-well:#ece7dd" dist/client/_next/static/css/*.css` → expect zero matches
  (confirms the old value is gone, not just appended alongside).
- `git status --porcelain` → expect exactly one modified file: `styles/vendor/b28-clay.css`. Zero
  component files, zero other CSS files. This is the direct evidence for "propagates... with no
  hand-edited component CSS."
- Revert: `git checkout -- styles/vendor/b28-clay.css` (safe — the only pending change at this
  point is this exact probe edit, confirmed by the `git status --porcelain` check just above).
- `npm run build` again → confirms the repo rebuilds clean at the original palette, so nothing is
  left in a broken/mutated state.
- No commit from this step — by design, it must leave zero net diff.

## Step 6 — Progress log

- Write `progress.md` after Steps 1–5 complete, recording actual command output/results (not
  just "ran successfully") for each step, and noting the single commit made in Step 2.

## Step 7 — Review

- Write `review.md` synthesizing all of the above into the ticket's acceptance evidence, file
  change list, test coverage assessment, and open concerns (surfacing the Design-phase note about
  no permanent CSS-output regression test existing, as a non-blocking future-gap flag).

## Testing strategy summary

- **Unit/component tests**: existing suite only (302 tests) — no new tests, per Design's Option-C
  rejection. Regression is proof enough for a dead-code deletion with zero consumers.
- **Build verification**: exercised live twice (before and after the `.glass` deletion, and again
  after the kit-bump revert) — three total build runs across the plan.
- **Manual/grep verification**: two greps (signature list, `.glass` residue) plus the compiled-CSS
  greps in Step 5 — these are the actual mechanism proving the AC, not a stand-in for it.
