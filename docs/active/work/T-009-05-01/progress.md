# T-009-05-01 — Progress: verify-clay-kit-end-to-end

All 7 plan steps executed in order, in one continuous session. No deviations from `plan.md`.

## Step 1 — Remove dead `.glass` CSS

Deleted the `.glass` doc-comment block + `@layer components { .glass { ... } }` rule from
`app/globals.css` (was lines 45–67; `.b28-clay`/`.clay-well`-adjacent primitives it briefly sat
between are untouched). `grep -n "\.glass" app/globals.css components/*.tsx` → zero matches
(component-side was already zero per Research; globals.css now zero too). Historical references
to `.glass` inside *other* rules' rationale comments (lines that explain the `@layer components`
vs `@utility` tree-shaking pattern reused by `.glow`/`.flash`/`.motion`) were deliberately left —
Design scoped the deletion to the block itself, not every mention of the word "glass" as a past
example in unrelated comments.

Status: **done**.

## Step 2 — Full regression pass on the post-deletion tree

- `npm run lint` → clean, zero warnings/errors.
- `npm test` → **32 files / 302 tests, all passing** — identical count to the Research baseline
  (pre-deletion), confirming the deletion changed nothing observable.
- `npm run build` → clean 5/5-stage `vinext build`, no errors.
- Committed: `40458aa` — `feat(T-009-05-01): remove dead glass CSS from globals`. `git diff
  --stat` for that commit: `app/globals.css | 5 +++---... 1 file changed, 5 insertions(+), 29
  deletions(-)` — only file touched.

Status: **done**.

## Step 3 — Re-verify AC clause 2 (signature grep) against final tree

`grep -rn "bg-black/70\|from-cyan-400\|bg-white/5\|ring-white/5\|#0a0a0f" app/ components/` run
live after the Step 2 commit → **zero matches** (grep exit code 1). Matches Research's earlier
result; expected, since the deletion touched a different string than any of these five.

Status: **done**.

## Step 4 — Re-verify AC clause 1 (build)

Folded into Step 2's build run (see above) — no separate action needed, per plan.

Status: **done**.

## Step 5 — Exercise AC clause 3: kit-bump propagation

1. Confirmed `styles/vendor/b28-clay.css` was clean (`git status --porcelain` empty) and
   `--clay-well: #ece7dd;` before touching it.
2. Edited it to `--clay-well: #ff00ff;` (the maximally-distinct probe value from Design/Plan).
3. `rm -rf dist && npm run build` → clean build.
4. Inspected the compiled client CSS (`dist/client/_next/static/css/index.*.css`):
   - `grep -o -- "--clay-well:#ff00ff"` → no literal match — the build's CSS minifier had
     shortened the 6-digit hex to its 3-digit equivalent.
   - `grep -o -- "--clay-well:[^;]*"` → **`--clay-well:#f0f`** — confirms the probe value reached
     the compiled bundle (minified form of `#ff00ff`), and...
   - `grep -o -- "--clay-well:#ece7dd"` → zero matches — confirms the *old* value is gone, not
     merely appended alongside the new one.
   - This is a real finding worth flagging: a naive literal-string grep for the exact hex you
     typed can give a false negative post-minification. The verification had to account for that
     (checking the *token's resolved value*, not just string-search the input literal) to be
     trustworthy.
5. `git status --porcelain` → exactly one file modified: `styles/vendor/b28-clay.css`. Zero
   component files, zero other CSS files touched. Direct evidence for "propagates... with no
   hand-edited component CSS."
6. `git checkout -- styles/vendor/b28-clay.css` → reverted cleanly; `--clay-well: #ece7dd;`
   confirmed restored, `git status --porcelain` on the file empty again.
7. `rm -rf dist && npm run build` again → clean build; compiled CSS re-checked, confirms
   `--clay-well:#ece7dd` (original value) is back, `#f0f`/`#ff00ff` gone.

Status: **done**. Zero net diff on `styles/vendor/b28-clay.css`; repo left in a clean, buildable
state at the original palette.

## Step 6 — This file

Status: **done** (this is it).

## Step 7 — Review

See `review.md`.

## Deviations from plan

None. One incidental finding not anticipated in Plan: the compiled CSS minifier shortens 6-digit
hex to 3-digit where possible, which means a literal grep for the exact input string is not a
reliable propagation check — verification had to grep for the token's resolved value pattern
(`--clay-well:[^;]*`) rather than assume the literal string round-trips unchanged. Documented
here and in Review as a note for anyone repeating this kind of check by hand.
