# T-009-05-01 — Review: verify-clay-kit-end-to-end

## Summary

This ticket is E-009's closing verification gate, not a feature build. Its job was to confirm
the epic's acceptance bar is actually met: no trace of the old dark-neon/glass theme in `app/` or
`components/`, and the vendored clay kit genuinely propagates palette changes with zero
component edits. All three AC clauses were exercised live (not inferred from prior tickets'
claims) and pass. One real gap was found and fixed along the way: a dead, zero-consumer `.glass`
CSS utility left over from the pre-clay theme.

## Files changed

- **`app/globals.css`** (commit `40458aa`) — deleted the unused `.glass` utility block (doc
  comment + `@layer components { .glass {...} } `, 29 lines removed net 5 added is really 24 net
  lines removed once the surrounding blank-line accounting settles). Zero consumers existed
  (confirmed via grep across `components/*.tsx` before deletion), so this is pure dead-code
  removal with no behavioral or visual effect. Historical mentions of `.glass` inside *other*
  rules' rationale comments (explaining why `.glow`/`.flash`/`.motion` use `@layer components`
  instead of `@utility`) were deliberately left in place — they're accurate technical rationale
  about a CSS-authoring pitfall, not a residual theme trace, and touching them was out of this
  ticket's scope per Design.
- **`styles/vendor/b28-clay.css`** — mutated transiently (`--clay-well: #ece7dd` → `#ff00ff`) to
  exercise the kit-propagation AC clause, then reverted via `git checkout`. **Net diff: none.**
  Confirmed clean before, during (isolated to this one file, zero component files), and after.
- **`docs/active/work/T-009-05-01/{research,design,structure,plan,progress,review}.md`** — this
  ticket's own RDSPI artifact trail.

No component file (`Board.tsx`, `Cell.tsx`, `HoldBox.tsx`, `NextPreview.tsx`, `GameOverlay.tsx`,
`StartOverlay.tsx`, `GameContainer.tsx`, `page.tsx`, `layout.tsx`) was touched. No test file was
touched.

## AC verification

- [x] **`npm run build` succeeds** — run three times across this session (baseline, post-`.glass`
  deletion, post-kit-bump-revert), clean every time, 5/5 vinext build stages.
- [x] **Repo-wide grep for `bg-black/70`, `from-cyan-400`, `bg-white/5`, `ring-white/5`,
  `#0a0a0f` across `app/` and `components/` returns zero matches** — verified live twice (Research
  baseline, and again after the `.glass` deletion commit to certify the *final* tree). Both zero.
- [x] **Bumping a `--clay-*` value in the vendored kit file and rebuilding changes the rendered
  palette without editing any component file** — directly exercised (Plan Step 5 / Progress Step
  5). Bumped `--clay-well`, rebuilt, confirmed the compiled `dist/client` CSS carried the new
  value (`#f0f`, the minifier's shortened form of `#ff00ff`) and *not* the old value (`#ece7dd`);
  `git status --porcelain` showed exactly one file changed (the vendor file itself); reverted and
  rebuilt clean.

All three clauses: **confirmed with direct evidence**, not inference from prior tickets' review
artifacts.

## Test coverage

- Full existing suite: 32 files / 302 tests, passing before and after the only permanent change
  (the `.glass` deletion) — identical count, so the deletion provably changed nothing observable.
- `npm run lint`: clean, before and after.
- **No new test was added.** The `.glass` deletion is dead-code removal with zero consumers —
  there was nothing to write a regression test *for* (a test asserting the absence of a CSS rule
  that already had zero references would be testing a non-existent behavior). The kit-bump
  exercise (AC clause 3) is, by its own nature, a manual/scripted one-time verification, not an
  ongoing behavior to unit-test with this repo's existing `@testing-library/react` + `jsdom`
  test infrastructure, which tests component output, not compiled CSS bundles.

## Open concerns / limitations

1. **No permanent CI regression test for kit-propagation.** This ticket *proved* propagation
   works today, but nothing in the test suite would catch a future regression (e.g. someone
   hard-coding a clay value into a component instead of using the token, silently breaking "bump
   once, rebuild everywhere"). Design considered building one (Option C) and rejected it as
   out-of-scope for a verification ticket — flagging it here as a legitimate follow-up if the
   team wants standing protection rather than a one-time check. Would need a new test category
   (build-output inspection), which doesn't exist in this repo yet.
2. **Minification changes hex literal representations.** Found live during Step 5: the build's
   CSS minifier shortens 6-digit hex to 3-digit where lossless (`#ff00ff` → `#f0f`). Anyone
   repeating this kind of grep-the-compiled-CSS check by hand should search for the *token
   pattern* (`--clay-well:[^;]*`) and eyeball the resolved value, not literal-match their typed
   input — a naive exact-string grep would have produced a false negative here.
3. **Historical `.glass`-referencing comments left in place.** Three doc comments in
   `app/globals.css` still say "same trap `.glass`... hit" as rationale for why `.glow`/`.flash`/
   `.motion` use `@layer components`. These are accurate and harmless (explaining a CSS-authoring
   pitfall using a now-deleted rule as the historical example), but a future reader unfamiliar
   with the history might be briefly confused that `.glass` no longer exists. Judged not worth
   rewriting — cosmetic, and rewriting risks losing the precise technical rationale. Flag only.
4. **No browser-rendered visual check this session** (no screenshot/browser-automation tool
   available) — consistent with prior E-009 tickets' review artifacts (e.g. T-009-04-01 notes the
   same limitation). The `.glass` deletion has zero consumers so there is nothing to visually
   regress; a human eyeballing the live app is optional here, not required to trust this review.

## Verdict

E-009's acceptance bar is met: dark-neon/glass chrome is gone from `app/`/`components/` (both the
literal AC grep and the broader dead-CSS sweep), and the vendored kit is a proven, exercised
single source of truth for palette — a token bump plus rebuild changes the rendered output with
zero hand-edited component CSS. Recommend closing the epic; the one open item (#1 above,
permanent propagation regression coverage) is a reasonable candidate for a future ticket, not a
blocker.
