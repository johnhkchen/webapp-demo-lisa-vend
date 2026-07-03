# T-009-04-03 — Review: page-header-clay-retone

## Summary

Retoned `app/page.tsx`'s header off the neon cyan/fuchsia/violet gradient-clip `<h1>` and
`text-white/N` subtitle/footer copy onto clay tones: a solid steel-blue Lora heading
(`text-primary`, `font-bold`) and ink-on-cream body copy (`text-foreground/50`,
`text-foreground/30`). This is the last ticket in the "gradient-clip heading" retone thread
started by T-009-04-01 (`GameOverlay`); the sibling `.clay-button` ticket (T-009-04-02,
`StartOverlay`) remains open and untouched.

## Files changed

- **`app/globals.css`** — added `--primary: var(--clay-primary)` to `:root` and
  `--color-primary: var(--primary)` to `@theme inline`, registering `text-primary`/`bg-primary`/
  etc. as a new Tailwind utility family resolving to the kit's steel blue (`#44679b`). First
  ticket in E-009 to add a token beyond `background`/`foreground`, per
  [[e-009-clay-retone-conventions]]'s anticipated follow-up.
- **`app/page.tsx`** — three class-group swaps on the `<h1>` and two `<p>` elements (see
  `structure.md` for the full before/after table). No JSX structure, import, or copy changes.

Both changes are commit `3a8f2d5` (`feat(T-009-04-03): retone page header off neon gradient onto
clay steel-blue/ink`).

## A note on the commit's scope

The working tree already carried substantial uncommitted, in-progress changes to both touched
files from other tickets in this epic before this session started (most materially, T-009-01-03's
font/token-pipeline wiring — this ticket's own declared dependency, still uncommitted at session
start despite `phase: done`). Those changes were **necessary** for this ticket's AC to hold (e.g.
`h1`/`h2`/`h3` routing to Lora, and `--clay-bg`/`--clay-ink`/the kit `@import` all come from that
work) and are included in the commit.

Separately, both files also carried genuinely **unrelated** pending work with no bearing on this
ticket — a code-comment wording fix, an unrelated flash-animation tint retune, and a paired
TETRIS→ROWCLEAR rename + legal-disclaimer paragraph addition. These were deliberately **excluded**
from this commit (verified via a side-by-side diff before committing, and reconfirmed by
`git diff` immediately after, which shows exactly those four items as the only remaining
uncommitted delta on the two files) so this ticket's commit doesn't finalize or take credit for
other tickets' unreviewed work. That other work remains in the working tree exactly as it was
found, untouched.

## Test coverage

- **No dedicated test file exists or was added for `app/page.tsx`** — none existed before this
  change (confirmed in `research.md`), and the AC doesn't request one. This is a pure
  presentational className diff with no logic, props, or conditional rendering.
- **Full suite regression-checked:** `npm test` → 302/302 passing across 32 files, unchanged
  from the pre-change baseline.
- **Build + lint:** `npm run build` (vinext/Vite, all 5 stages) and `npm run lint`
  (`--max-warnings 0`) both clean, checked against both the isolated commit content and the
  final full working-tree state.
- **AC grep check:** none of `from-cyan-400`, `via-fuchsia-400`, `to-violet-400`, `bg-clip-text`,
  `text-transparent`, `text-white/50`, `text-white/30`, or `font-black` remain in `app/page.tsx`.
- **Manual visual verification:** dev server + headless Chromium (Playwright) — screenshotted
  `/` and read computed styles directly off the `<h1>`: `color: rgb(68, 103, 155)` (exactly
  `#44679b`), `font-family` leads with `Lora`, `font-weight: 700`. Confirms the token resolves
  end-to-end in a real render, not just at build time. Screenshot showed legible muted-ink
  subtitle/footer against the cream page background, no gradient/transparency artifacts, no
  contrast issues. Dev server and scratch verification script were torn down afterward.

## Open concerns / limitations

- **None blocking.** This ticket's AC is fully satisfied and verified at both the build and
  rendered-DOM level.
- **Pre-existing repo state:** the working tree holds several *other* tickets' completed-but-
  uncommitted work (see "A note on the commit's scope" above, plus untouched `docs/active/work/`
  directories for T-009-01-02, T-009-01-03, T-009-04-02 that predate this session). That's
  pre-existing state this ticket didn't create and its commit deliberately didn't disturb — flagged
  here only so a human reviewer isn't surprised that `git status` still shows many modified files
  after this ticket's commit lands.
- **Follow-up already anticipated:** T-009-04-02 (`StartOverlay`'s `.clay-button` retone) is the
  one remaining open ticket in this epic's "remove the neon gradient" thread; it's independent of
  this change (different file, different primitive) and needs no coordination with this ticket's
  new `--color-primary` token (the kit's `.clay-button` class gets steel blue from its own raw CSS,
  not the Tailwind token layer).
