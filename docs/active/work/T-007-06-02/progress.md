# Progress — T-007-06-02 row-flash-and-60fps-transitions

Status: **Implement complete.** All plan steps executed; full suite + lint + build green.

## Completed steps

| Step | What | Commit |
| --- | --- | --- |
| 1 | `FLASH_DURATION_MS = 500` seam constant in `useGame.ts` | `36d05a7` |
| 2 | `useClearFlash` latch + `useClearFlash.test.ts` (6 tests) | `36d05a7` |
| 3 | Board flash overlay channel + `Board.flash.test.tsx` (4 tests) | `5ee7e8d` |
| 4 | Cell `.motion` compositor-only easing + Cell test assertion | `5ee7e8d` |
| 5 | GameContainer wiring + idle-flash guard test | `d32e549` |
| — | Overlay content-box alignment fix (transparent border) | (follow-up) |

(Steps 1–2 landed in one commit as the constant and its sole consumer are tightly coupled; 3–4 in
one commit as the render pair. Otherwise as planned.)

## Verification

- `npm run test` → **279 passed / 28 files**, including the 10 new tests.
- `npm run lint` → clean at `--max-warnings 0`.
- `npm run build` → vinext production build green (the AC's explicit gate).

## Deviations from plan

1. **`useClearFlash` capture moved from effect to render.** The planned "capture in a `useEffect`"
   tripped `react-hooks/set-state-in-effect` (synchronous `setState` in an effect body). Rewrote the
   capture using React's documented "adjust state while rendering" pattern (compare incoming array
   identity vs. a stored `prev`); only the *release timer* stays in an effect, and it sets state
   solely from its async `setTimeout` callback. Net behaviour is identical and all latch tests pass;
   the hook is arguably cleaner (no synchronous effect-driven re-render cascade).

2. **Added a pixel-alignment fix** not in the plan: the cell grid carries a 1px `border`
   (border-box), so its content box is inset 1px more than the borderless overlay. Added
   `border border-transparent` to the overlay grid so both content boxes match exactly and the flash
   bars sit precisely on their rows. Committed as a follow-up.

3. **GameContainer end-to-end clear test not added** (as flagged in Plan/Structure): GameContainer
   owns a fixed-seed `useGame` with no board-injection seam, and the default seed never completes a
   line through play, so "play → row clears → bars appear" is not deterministically reachable at the
   integration level. Instead added an idle-state guard (no `[data-flash-row]` during normal play);
   the clear→flash mechanism is fully covered by the `useClearFlash` + `Board.flash` unit tests.
   Carried to Review as a known coverage note.

## Files touched

- `components/useGame.ts` — `FLASH_DURATION_MS`.
- `components/useClearFlash.ts` — new latch hook.
- `components/Board.tsx` — `flashRows`/`flashKey` overlay channel + shared grid geometry.
- `components/Cell.tsx` — `.motion` on all three branches.
- `components/GameContainer.tsx` — destructure `clearedRows`, run through latch, pass to Board.
- Tests: `useClearFlash.test.ts` (new), `Board.flash.test.tsx` (new),
  `GameContainer.test.tsx` (+1), `Cell.test.tsx` (+1 assertion).
- `lib/**` — untouched (purity boundary intact).
- `app/globals.css` — untouched (`.flash`/`.motion`/`.glow` already provisioned by E-004).

## Remaining

Nothing for Implement. Review artifact next.
