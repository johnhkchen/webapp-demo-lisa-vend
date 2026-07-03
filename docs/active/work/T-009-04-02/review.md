# T-009-04-02 — Review: start-overlay-clay-button

## Summary

Retoned `StartOverlay.tsx`'s "Press Start" pill off the dark translucent/gradient-clip
treatment and onto the vendored `b28-clay.css` kit's `.clay-button` primitive — the first
consumer of `.clay-button` anywhere in this codebase. Single-file change, one commit
(`58f55ef`), no test file edits.

## What changed

**`components/StartOverlay.tsx`** (4 insertions, 6 deletions):

- Doc comment: the line claiming the pill "uses the app's cyan→fuchsia→violet gradient so it
  belongs to the same system as the title and the other overlays" (now false — `GameOverlay`
  dropped that gradient in `T-009-04-01`, and `app/page.tsx`'s title still has it but isn't
  "the same system" as this pill anymore) was rewritten to: "uses the kit's `.clay-button` pill
  so it belongs to the same system as the other overlays, per E-009."
- JSX: two nested `<span>`s collapsed into one. Removed `rounded-full border border-white/20
  bg-black/50 px-5 py-2 font-bold backdrop-blur-sm` and the inner
  `bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent`
  span entirely. Kept `animate-pulse text-sm uppercase tracking-widest` (palette-independent
  motion/typography) plus the new `clay-button` class, which supplies background, text color,
  padding, pill radius, and raised-clay box-shadow.
- Outer `<div role="status" className="pointer-events-none absolute inset-x-0 bottom-4 flex
  justify-center">` — unchanged, verbatim.

No other files touched. No changes to `styles/vendor/b28-clay.css`, `app/globals.css`,
`GameContainer.tsx`, or any test file.

## Acceptance criteria check

- [x] No `from-cyan-400`/`via-fuchsia-400`/`to-violet-400`/`bg-black/50` remain in
      `StartOverlay.tsx` (grep-verified).
- [x] The pill uses the kit's `clay-button` class (grep-verified, and confirmed present in
      actual SSR'd HTML via a dev-server curl).
- [x] `StartOverlay.test.tsx` still passes (3/3, unmodified).

## Test coverage

- `StartOverlay.test.tsx`'s three existing assertions (renders nothing when hidden, shows
  "Press Start" text under `role="status"` when visible, `pointer-events-none` present) are
  unchanged and passing — they cover the component's actual behavioral contract, which this
  ticket didn't touch (no prop, state, or interaction change).
- Full suite: 302/302 tests passing across 32 files — no regressions in sibling components
  (`GameOverlay`, `HoldBox`, `NextPreview`, `Cell`, `Board`, etc.) that also touch clay tokens
  or share `GameContainer.tsx` as a parent.
- **Gap, by design, not oversight**: no new automated test asserts the specific className
  string (`clay-button` presence, or absence of the old gradient classes). This was a deliberate
  call in `plan.md` — the AC's bar is a static markup/class fact on a presentational leaf
  component with no new logic branches, verified here by grep + a real SSR render check, not
  something that earns a new runtime assertion. A `className`-snapshot-style test would be
  brittle (couples the test to exact class-string composition) for low incremental value over
  the existing behavioral test. Flagging this tradeoff explicitly in case a future policy wants
  className-level regression coverage across the whole clay-retone epic (would be better done
  as one shared convention/test than per-ticket).

## Verification performed

- Targeted test: `npx vitest run components/StartOverlay.test.tsx` → 3/3 passed.
- Full suite: `npx vitest run` → 302/302 passed.
- `npm run lint` → clean (`--max-warnings 0`).
- `npm run build` (`vinext build`) → succeeded, all 5 stages.
- Manual: `npm run dev` + `curl localhost:3000/`, confirmed `class="clay-button animate-pulse
  text-sm uppercase tracking-widest"` present in real server-rendered HTML (attract mode is the
  default state on a fresh page load, so this was reachable with no extra harness). Dev server
  stopped afterward.

## Open concerns / limitations

- **None blocking.** This is a narrow, low-risk, purely cosmetic class swap on a
  non-interactive, presentational component; the behavioral contract (visibility toggle,
  non-blocking pointer-events, status role, text content) is untouched and test-covered.
- **Follow-up already anticipated, not this ticket's job**: `app/page.tsx`'s `<h1>` still has
  the `from-cyan-400 via-fuchsia-400 to-violet-400` gradient-clip treatment — the last surviving
  instance of the old palette in the app. Flagged in `research.md`/`design.md` as out of this
  AC's scope (matches `T-009-04-01`'s design.md, which deferred both `StartOverlay.tsx` and
  `app/page.tsx` and only this ticket picked up `StartOverlay.tsx`). Presumably a
  `T-009-04-03`-shaped ticket if the epic continues that numbering.
- **No `--soft`/secondary variant considered or needed**: this is the app's one CTA-shaped
  surface (ticket's own framing), so the bare primary `.clay-button` was correct; noting only so
  a reviewer doesn't wonder why no modifier class was evaluated in code — it was, in `design.md`
  Option D, and rejected.
- **Visual-only confirmation**: verification confirmed the correct class is applied and rendered
  server-side; no pixel/screenshot comparison was taken. Given the kit's `.clay-button` is
  already a proven, shared primitive (consumed conceptually the same way by the kit's own docs
  and other b28 properties) and this is its first use here, a human eyeballing the running app
  once is still worthwhile to confirm the arcade-pulse pill reads well against the board, but
  isn't a correctness risk — worth a quick look, not a blocker.

## Files for a human reviewer to read

- `components/StartOverlay.tsx` — the entire diff (10 lines changed).
- This `review.md` for the "why" behind what was and wasn't done.
