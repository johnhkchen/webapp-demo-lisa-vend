# Review — T-003-03-02 softdrop-harddrop-keys

## What changed

Soft-drop and hard-drop are now playable from the keyboard. The soft-drop *input* already
existed in the core, so soft-drop was pure wiring; hard-drop needed one new pure transition plus a
reducer case, then both hung off the existing `dispatch`. Five source files + three test files.

### `lib/movement.ts` (modified)
- Added `hardDrop(board, piece): Piece` — repeatedly applies `softDrop` until it no-ops, returning
  the piece at its resting position. **Does not lock/merge** (movement never writes the board);
  preserves the same-reference no-op contract (already-resting piece ⇒ input ref returned).
- Updated the scope-boundary comment to cover hard-drop placement.

### `lib/game.ts` (modified)
- `Input` gained `"hardDrop"`. `step` gained
  `case "hardDrop": return descend({ ...state, active: hardDrop(state.board, state.active) });`.
- Hard-drop reuses `descend`'s existing lock → clear → score → spawn pipeline (an already-resting
  piece locks immediately in `applyGravity`), so there is **no duplicated lock logic** and line
  clears / scoring / spawn / top-out all work for free.
- `gameOver` short-circuit at the top of `step` already covers `"hardDrop"` (no-op when over).
- `Input` doc + module scope note updated: hard-drop implemented; **no drop-distance scoring** for
  either soft- or hard-drop remains the documented boundary.

### `components/GameContainer.tsx` (modified)
- `KEY_TO_INPUT` gained `ArrowDown → "softDrop"` and `" " (Space) → "hardDrop"`.
- Added an edge-trigger guard in `onKeyDown`: `if (input === "hardDrop" && event.repeat) {
  preventDefault(); return; }`. Soft-drop and move keys keep OS auto-repeat; hard-drop fires once
  per physical press. Space/ArrowDown default scroll is still suppressed via `preventDefault`.
- Module + map docs updated.

### `components/useGame.ts` (modified — doc only)
- Rewrote the scope paragraph: every intent (move/rotate/soft/hard-drop) flows through the one
  generic `dispatch`; the drop inputs required no code change here.

### Tests (modified)
- `lib/movement.test.ts`: floor rest, on-stack rest, already-resting no-op (`toBe`), no-mutation,
  agreement with iterated `softDrop`.
- `lib/game.test.ts`: hard-drop lock+spawn from spawn; hard-drop ≡ tick-until-lock equivalence
  (two independent same-seed games — the bag is shared/mutable); row-clear + `scoreFor` award;
  no-op once game-over.
- `components/GameContainer.test.tsx`: ArrowDown soft-drop, Space hard-drop (+ bottom-row ground
  truth), held-Space-fires-once (8 filled cells), and the AC playthrough (Space-only → game-over
  overlay). Reworked the "ignores unmapped keys" case, whose old `ArrowDown` line is now a mapped
  key.

## Acceptance criteria

> Holding down accelerates the piece's descent and the hard-drop key instantly drops and locks the
> piece, letting a stranger play one uninterrupted game from spawn to game-over via keyboard alone.

**Met.**
- **Soft-drop / "holding down accelerates descent":** `ArrowDown` dispatches `"softDrop"` per
  keydown and rides OS key auto-repeat — extra descent steps layered on top of the independent
  gravity tick. Same mechanism the (accepted) move keys use.
- **Hard-drop / "instantly drops and locks":** Space dispatches `"hardDrop"`, which drops to rest
  and locks in a single `step`, then spawns the next piece. Verified against core ground truth in
  jsdom and by the on-stack/floor unit tests. The `event.repeat` guard makes a held Space fire once
  (the "fires exactly once" test).
- **"spawn to game-over via keyboard alone":** the AC integration test drives Space-only presses
  until the real hook + core reach top-out and the game-over overlay (`role="alert"`, "GAME OVER")
  appears.

## Test coverage

- **`lib/` unit:** 5 new `hardDrop` movement cases + 4 new reducer cases. The equivalence test
  pins hard-drop as a *shortcut* of the gravity path, not a divergent one.
- **Component/integration (jsdom):** 4 new cases exercising key → dispatch → step → repaint for
  both drops, the edge-trigger guard, and the keyboard-only game-over.
- **Full suite:** `npx vitest run` → **163 passed / 18 files**. `npx tsc --noEmit` clean.
  `npx eslint` on all touched files clean (repo runs `--max-warnings 0`).
- **Gaps (acceptable):**
  - Soft-drop *auto-repeat acceleration* itself isn't asserted (jsdom doesn't emit OS repeat); the
    single `ArrowDown → softDrop` step is tested, and repeat behavior mirrors the move keys.
  - Hard-drop landing *onto a settled stack mid-game* isn't re-asserted at the component layer; the
    `lib/movement`/`lib/game` tests cover the geometry and the lock pipeline.

## Open concerns / flags for human attention

1. **No drop-distance scoring (by design).** Classic Tetris pays soft-drop +1/cell and hard-drop
   +2/cell; this ticket awards only the line-clear score any lock grants. The AC doesn't require
   points, and `game.ts` documents the deferral. Easy follow-up: thread drop distance out of
   `hardDrop`/`descend` into `scoreFor`-adjacent logic. See `design.md` Q5.
2. **Soft-drop feel rides OS auto-repeat.** There's an initial repeat delay before it machine-guns,
   so acceleration isn't perfectly uniform. `design.md` Q3 Option B (a shorter gravity interval
   while `ArrowDown` is held, reusing `useAnimationFrameLoop`) is the documented upgrade if feel
   needs tightening — deliberately deferred to match the T-003-03-01 precedent.
3. **Space as hard-drop can scroll if unmapped elsewhere.** We `preventDefault` on Space, so page
   scroll/space-activation is suppressed while the game island is mounted. If a focusable control is
   ever added to this view, revisit (window-level listener swallows Space globally while mounted).
4. **Shared mutable 7-bag is a live footgun.** The equivalence test tripped on it (two paths
   draining one bag). Not introduced here, but worth the eventual serializable-RNG refactor already
   noted in `game.ts` — anything comparing two derived states from one `GameState` must clone the
   seed, not the state.

## Scope hygiene

Hard-drop placement lives in `lib/movement.ts` (translation policy) and the lock stays in the
reducer via `descend` — no lock logic duplicated. No score/timing changes. `lib/**` framework-free
boundary untouched. Nothing beyond the ticket's soft/hard-drop keys was added.
