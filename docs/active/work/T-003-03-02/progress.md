# Progress — T-003-03-02 softdrop-harddrop-keys

Executed the plan core-up. All steps landed; no plan deviations of substance (one test-only fix,
noted below).

## Step 1 — `lib/movement.ts`: `hardDrop` primitive ✅
- Added `hardDrop(board, piece): Piece` — loops `softDrop` until the same-reference no-op, returns
  the resting piece (does NOT lock). Updated the module scope comment.
- `lib/movement.test.ts`: floor rest, on-stack rest (O at y=16 above a settled floor), already-
  resting no-op (`toBe`), no-mutation, and agreement with iterated `softDrop`.
- `npx vitest run lib/movement.test.ts` → 30 passed.

## Step 2 — `lib/game.ts`: `"hardDrop"` input + reducer case ✅
- Imported `hardDrop`; added `"hardDrop"` to `Input`; added
  `case "hardDrop": return descend({ ...state, active: hardDrop(state.board, state.active) });`.
- Updated the `Input` doc and the module scope note (hard-drop implemented; drop-distance scoring
  still deferred for BOTH soft and hard).
- `lib/game.test.ts`: lock+spawn from spawn, the "hard-drop ≡ tick-until-lock" equivalence, row
  clear + score award, and no-op once game-over.
- **Deviation (test-only):** the equivalence test first shared one `GameState` across the tick and
  hard-drop paths and failed — the 7-bag is a *shared mutable* object, so both paths drained the
  same bag and spawned different next pieces. Fixed by building two independent
  `createInitialState(1)` games (same seed, separate bags). No production-code change.
- `npx vitest run lib/game.test.ts` → 13 passed.

## Step 3 — `components/GameContainer.tsx`: keys + edge guard + AC ✅
- `KEY_TO_INPUT` gained `ArrowDown: "softDrop"` and `" ": "hardDrop"`.
- Added the edge-trigger guard: `if (input === "hardDrop" && event.repeat) { preventDefault();
  return; }` — soft-drop/move keys keep their auto-repeat. Updated the module + map docs.
- `components/GameContainer.test.tsx`: ArrowDown soft-drop, Space hard-drop (+ ground-truth
  bottom-row cross-check), held-Space-fires-once (8 filled cells), and the AC playthrough
  (Space-only → game-over overlay). Rewrote the "ignores unmapped keys" case (its old `ArrowDown`
  assertion is now a mapped key) to use `Enter`/`a`.
- Note: the file had advanced under me (T-003-02-02 added the `GameOverlay` + game-over gating);
  applied edits to the current version — the AC test reuses that overlay's `role="alert"` /
  `/game over/i`.
- `npx vitest run components/GameContainer.test.tsx` → 17 passed.

## Step 4 — `components/useGame.ts` doc ✅
- Rewrote the scope paragraph: all intents incl. soft/hard-drop flow through the one generic
  `dispatch`; the drop inputs needed no code change here.

## Final verification
- `npx vitest run` → **163 passed / 18 files**.
- `npx tsc --noEmit` → clean.
- `npx eslint` on all seven touched files → clean (repo runs `--max-warnings 0`).

## Notes / non-goals confirmed
- No drop-distance scoring (soft or hard) — deferred per the design; `game.ts` boundary comment
  updated to say so explicitly.
- Soft-drop uses OS key auto-repeat (matching the move keys); accelerated-interval soft-drop is
  documented in `design.md` as the follow-up if feel needs tightening.
