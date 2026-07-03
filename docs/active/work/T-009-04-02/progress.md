# T-009-04-02 — Progress: start-overlay-clay-button

## Status: implementation complete, verified, committed

## What was done

Followed `plan.md` exactly, no deviations.

1. **Edited `components/StartOverlay.tsx`**:
   - Doc comment: replaced the stale "uses the app's cyan→fuchsia→violet gradient so it
     belongs to the same system as the title and the other overlays" sentence with "uses the
     kit's `.clay-button` pill so it belongs to the same system as the other overlays, per
     E-009" (matches `GameOverlay.tsx`'s post-retone doc-comment phrasing).
   - JSX: collapsed the two nested `<span>`s (outer translucent/gradient-border pill + inner
     gradient-clip text span) into one `<span className="clay-button animate-pulse text-sm
     uppercase tracking-widest">Press Start</span>`. Removed `rounded-full`, `border
     border-white/20`, `bg-black/50`, `backdrop-blur-sm`, `px-5 py-2`, `font-bold`, and the
     entire `bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text
     text-transparent` inner span — all now either redundant with (padding, radius, weight,
     color, shadow all owned by `.clay-button`) or literally removed (the gradient). Kept
     `animate-pulse` and `text-sm uppercase tracking-widest` (palette-independent motion/type).
   - Outer `<div role="status" className="pointer-events-none absolute inset-x-0 bottom-4 flex
     justify-center">` — untouched, exactly as before.

## Verification results

- `grep` for `from-cyan-400|via-fuchsia-400|to-violet-400|bg-black/50` against
  `components/StartOverlay.tsx` → **no matches** (AC satisfied).
- `grep` for `clay-button` → present on the pill span (AC satisfied).
- `npx vitest run components/StartOverlay.test.tsx` → **3/3 passed**, no test file changes.
- `npx vitest run` (full suite) → **302/302 passed** across 32 test files — no regressions
  elsewhere.
- `npm run lint` → clean, zero warnings (`--max-warnings 0`).
- `npm run build` (`vinext build`) → succeeded, all 5 build stages completed.
- Manual spot-check: started `npm run dev`, curled `http://localhost:3000/`, confirmed the
  server-rendered HTML contains `class="clay-button animate-pulse text-sm uppercase
  tracking-widest"` on the "Press Start" pill (attract mode is on by default on a fresh load,
  per `GameContainer.tsx:210`'s `<StartOverlay visible={attract} />`, so this was reachable
  without extra harness work). Dev server stopped after the check.

## Deviations from plan

None. Step 5 (manual visual spot-check) turned out to be trivially reachable — attract mode is
the default state on page load — so it was done via a curl of the SSR'd HTML rather than a
screenshot; sufficient to confirm the class is present in real rendered output, not just in the
source file.

## Commit

Single commit, `components/StartOverlay.tsx` only, per plan Step 6.
