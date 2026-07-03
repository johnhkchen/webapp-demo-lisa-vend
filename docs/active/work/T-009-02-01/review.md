# T-009-02-01 — Review: retone-piece-oklch-palette-for-clay

## Summary

Retuned the seven `--color-piece-*` oklch tokens in `app/globals.css`'s `@theme static` block
from a high-chroma neon set to a muted-but-distinct set anchored below the b28-clay kit's own
brand-accent chroma (`--clay-primary`, C=0.093). Chroma dropped from the last-committed
baseline's 0.15–0.23 range to 0.065–0.085 (a ~50-70% reduction per piece). Hue angles
(75/190/10/300/120/40/240, one per I/O/T/S/Z/J/L) are unchanged, so the seven pieces are still
individually identifiable by hue; only saturation (and a small compensating lightness trim)
moved.

## Files changed

- `app/globals.css` — 7 lines changed inside the `@theme static` block (the `--color-piece-i`
  through `--color-piece-l` declarations and their trailing comment labels). No other line in
  this ticket's commit touched — confirmed via `git diff --cached` before commit and
  `git show --stat` after.
- `docs/active/work/T-009-02-01/{research,design,structure,plan,progress}.md` — RDSPI artifacts
  for this ticket.

No component, test, or config file was modified. This was by design (Structure/Design): the
`bg-`/`text-`/`border-`/`ring-piece-*` utility family and every consumer (`Cell.tsx`,
`HoldBox.tsx`, `NextPreview.tsx`) reference the tokens by name only, never by value, so a
value-only edit inside `@theme static` cannot require any consumer-side change.

## An important pre-existing condition, surfaced and worked around

At session start, `app/globals.css` already carried a large uncommitted diff spanning several
other in-flight tickets on the same file (the kit `@import`, background/foreground token
rewiring from T-009-01-02, a `.flash` keyframe retone, a Lora/Karla `font-family` change likely
from T-009-01-03, and a "Per-tetromino"→"Per-piece" comment rename) — none of it committed, none
of it backed by RDSPI artifacts for those tickets in this ticket's scope. This is consistent
with the RDSPI concurrency model (multiple threads on one branch, file locking as the only
serialization mechanism) but meant the naive `git diff` for `app/globals.css` mixed several
tickets' work together.

Handled by extracting a minimal patch covering only the `@theme static` hunk (verified via
`git apply --cached --check`) and staging that plus this ticket's own new work-artifact
directory — leaving every other uncommitted hunk in the working tree exactly as found, untouched
and unstaged. `git show --stat HEAD` on the resulting commit confirms exactly one source file
(`app/globals.css`, 14 lines changed) plus the five new artifact files, nothing else. This
avoided committing other tickets' unreviewed, undocumented work under this ticket's name.

**Flag for a human reviewer:** the pre-existing uncommitted hunks (background/foreground
rewiring, `.flash` tint, font-family, comment rename) are still sitting uncommitted in the
working tree after this session. They were not authored by this ticket and are out of its
scope, but they represent real completed-looking work (T-009-01-02 is marked `phase: done` in
its ticket frontmatter, T-009-01-03 is `phase: research`) that has never been committed. Worth
a human checking whether those tickets' sessions simply forgot the commit step, or whether
something is intentionally holding them back.

## Test coverage

- No new automated test added. `git diff --cached` and Research/Structure both confirm no
  existing test in this repo asserts on resolved oklch/hex color values — coverage of
  `bg-piece-*`/`ring-piece-*` is entirely class-name-based (`Board.test.tsx`, `Cell.test.tsx`),
  and those pass unchanged (this change doesn't touch class names).
- Full suite run before and after the edit: 32 test files / 302 tests, identical count, all
  passing both times. This is a regression check, not targeted coverage — appropriate given the
  AC is a designed-value comparison (documented in Structure's "Testing strategy" section as a
  deliberate no-new-test decision, not an oversight).
- `npm run build` and `npm run lint` both clean.

**Gap:** no automated check exists (here or previously in this repo) that would catch a future
accidental chroma/lightness regression on these tokens — e.g., someone reverting to neon values
by mistake. Out of scope to add one here (Structure explicitly reasoned through and rejected a
snapshot-style value test as low-value), but worth naming as a known gap rather than silently
absent.

## Verification performed

1. `npm run build` — exits 0; compiled CSS confirmed to contain the retoned values (downlevelled
   to `lab()` by the build's CSS minifier, expected behavior).
2. `npm run test` — 302/302 passing, same as pre-edit baseline.
3. `npm run lint` — clean.
4. Dev-server check — `npm run dev`, confirmed `/` returns 200 and the served `globals.css`
   resolves all seven tokens to the new oklch strings verbatim.
5. Visual sanity — no screenshot/browser-automation tooling exists in this repo (checked:
   absent from `node_modules`/`package.json`), so this was done by converting each new oklch
   value to sRGB hex via a standalone conversion script and eyeballing the seven resulting
   swatches (documented in `progress.md`) against the "reads correctly on cream clay, still
   distinguishable" bar. All seven read as clearly distinct, none neon, none washed to gray.

## Open concerns / limitations

- **Visual verification is reasoned, not observed.** Point 5 above is the ticket's biggest
  residual risk: nobody has actually looked at the rendered game board with these colors. The
  hex-swatch math is a reasonable proxy but isn't a substitute for eyes on a rendered page. If a
  human reviewer has a moment, loading `npm run dev` and glancing at `NextPreview`/`HoldBox`
  (which render piece colors without needing active gameplay) would close this gap quickly.
- **Z (chartreuse, H120) is the piece furthest from the kit's overall warm-hue tendency** (the
  bg/surface/ink tokens all sit around H56-85, and the brand accent sits at H258 — chartreuse's
  H120 is roughly equidistant from both). Design's rationale (largest lightness trim, mid-range
  chroma) addresses this, and the swatch check reads it as "sage/olive," not sickly, but this is
  the one piece most likely to warrant a follow-up look if a human disagrees with the read.
- **No numeric ceiling/floor was specified by the ticket** — the 0.065-0.085 band and the
  `--clay-primary`-chroma anchor are this session's judgment call (documented in `design.md`'s
  "Options considered"), not a value pulled from an existing spec. If there's a house style
  guide for exact chroma targets elsewhere that this session didn't find, worth a second look.
- The pre-existing uncommitted hunks flagged above remain unresolved — not this ticket's job to
  fix, but noted so it doesn't get lost.

## Nothing else outstanding

Implementation matches the plan with one documented, anticipated deviation (visual check done
via computed swatches rather than a live screenshot, since no such tooling exists — flagged in
`plan.md`'s Step 6 as a likely fallback before implementation started). Ready for hand-off.
