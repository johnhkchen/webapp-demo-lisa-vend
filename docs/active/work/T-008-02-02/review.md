# T-008-02-02 — Review: start-handoff-clean

## Summary

Wired the attract→human handoff at the one seam T-008-02-01 left open. While the demo auto-plays,
any ordinary key press now "presses Start": it `reset`s the shared game to a fresh
`createInitialState(DEFAULT_SEED)` and flips `attract` off in the same batched render. The reset is
the crux — the attract driver mutates the single game holder, so at Start `state` holds the bot's
in-progress board/score/active piece; the reset discards it so the human's first game is clean.
Flipping `attract` off cancels the driver's rAF frame (no bot input fires after Start) and re-enables
the human gravity loop + keyboard.

## Files changed

- **`components/GameContainer.tsx`** (modify) — added `isStartKey` predicate; destructured
  `setAttract`; added stable `startHumanGame` callback (`reset(DEFAULT_SEED)` + `setAttract(false)`);
  branched `onKeyDown` to start on an ordinary key while attracting (else swallow); added
  `startHumanGame` to the keyboard effect deps; added `DEFAULT_SEED`/`useCallback` imports; updated
  the leading docstring.
- **`components/GameContainer.test.tsx`** (modify) — removed the now-obsolete
  `"swallows keyboard input while the bot plays"` attract test; added the
  `GameContainer — start handoff (T-008-02-02)` describe block (4 tests).
- **`app/page.tsx`** (modify, copy only) — caption `the CPU is playing` → `press any key to play`.

No files created or deleted. `lib/**` untouched (purity boundary held); `useGame.ts` unchanged
(`reset`/`DEFAULT_SEED` already existed); `StartOverlay.tsx` unchanged.

## Acceptance criteria

> Pressing Start halts the attract driver and hands off to a fresh createInitialState human game; a
> test asserts no bot inputs are dispatched after Start and the first human game begins from a clean
> state (no carried-over board/score/active piece), and the production build plus existing
> playability/scoring suites stay green.

- **Halts the driver / no bot input after Start** — ✅ mechanism (attract-off cancels the driver's
  rAF frame) + test T2: after Start, one gravity interval yields exactly `expectedAfter("tick")`, a
  pure human tick, not a bot rotate/shift.
- **Fresh createInitialState human game, clean state** — ✅ test T1: the board is dirtied by the bot
  first (`filledCoords > 4`), then after Start equals `expectedAfter()` (pristine default-seed spawn
  only); handoff to human control confirmed by T3 (ArrowLeft moves the piece).
- **Build + suites green** — ✅ `npm run build` (vinext client/ssr/worker), `npm run lint` (clean),
  `npm run test` (302 passed / 32 files).

## Test coverage

New (4): clean fresh game on Start; human gravity (not the bot) advances after Start; keyboard
controls the human game after Start; browser chords + bare modifiers do not start. All reuse the
established rAF-pump + `expectedAfter`/`filledCoords` ground-truth idiom — no Tetris rules
reimplemented in tests. The full existing playability/scoring/pause/game-over/attract suites remain
green, confirming the `!attract` human path is byte-for-byte the prior behavior.

## Notable decisions

- **Trigger = any ordinary key**, matching the "PRESS START" prompt, rather than a dedicated key or a
  click (the overlay is `pointer-events-none` by T-008-02-01 design, so clicks can't land on it).
  Chords/modifiers excluded via `isStartKey` so Cmd+R and a resting Shift are left alone.
- **Reset seed = `DEFAULT_SEED`** — the canonical fresh game (identical to `attract={false}`), keeping
  the handoff deterministic and reusing every existing test's ground truth; avoids the
  hydration/randomness hazard documented on `DEFAULT_SEED`.
- **The start press is consumed and is not also a game move** — the fresh piece begins untouched
  (arcade idiom, keeps "clean state" crisp).

## Removed test / reconciliation

The T-008-02-01 attract test `"swallows keyboard input while the bot plays (no bleed-through)"`
encoded the old contract (all keys swallowed during attract). This ticket intentionally supersedes
it — a key now starts the game — so the test was removed (a passing-by-coincidence + then-failing
assertion) and its real intent ("the bot plays uncontested; a key doesn't feed the bot") is now
carried by the start-handoff tests. An explanatory comment marks the removal in the attract block.

## Open concerns / limitations

- **No real-browser E2E** of the physical keydown→handoff; covered by the jsdom rAF pump, consistent
  with every other loop test in this repo. A manual `npm run dev` smoke (load → press a key → play)
  would be the belt-and-suspenders check but is not required by the AC.
- **Repeat/rapid keys at the instant of Start**: the first keydown starts; subsequent keydowns arrive
  after `attract` is false and route through the normal human keymap (e.g. a held ArrowLeft continues
  as a move). This is intended and harmless, not separately tested.
- **Natural top-out gap** inherited from T-008-02-01 (a greedy bot rarely tops out in a unit test) is
  unrelated to this ticket and not reopened here.
- No new-game/restart-after-game-over affordance is added — out of scope; `reset` is the seam a
  future ticket would reuse.
