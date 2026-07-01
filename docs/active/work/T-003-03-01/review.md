# Review — T-003-03-01 move-rotate-keys

## What changed

Keyboard now drives the active piece. The pure core already had every needed transition, so
the work was entirely the React seam: expose a dispatch and route keydowns into it.

### `components/useGame.ts` (modified)
- Captured the state setter and added a referentially-stable
  `dispatch = useCallback((input: Input) => setState((s) => step(s, input)), [])`.
- Widened `GameView` with `dispatch: (input: Input) => void`; imported `useCallback`, `step`,
  `Input`. Module doc updated (input dispatch now exists; gravity loop still later).
- Functional updater ⇒ no `state` dep ⇒ stable identity, so the consuming effect subscribes
  once.

### `components/GameContainer.tsx` (modified)
- Added module-level `KEY_TO_INPUT` (`ArrowLeft→left`, `ArrowRight→right`,
  `ArrowUp/x/X→rotateCW`, `z/Z→rotateCCW`).
- `useEffect` attaches a `window` `keydown` listener: unmapped keys return early (untouched),
  mapped keys `preventDefault()` (stop arrow-scroll) then `dispatch`. Cleanup removes the
  exact handler; deps `[dispatch]`. Doc updated with the scope fence.

### `components/GameContainer.test.tsx` (modified)
- Added `filledCoords()` readback + `expectedAfter(...inputs)` (computes ground truth by
  running the pure core at `DEFAULT_SEED`).
- New cases: ArrowLeft, ArrowRight, ArrowUp (rotateCW), z (rotateCCW), left-wall no-op
  (fires `COLS+4` lefts, asserts pinned + no `x<0`), unmapped-key ignore (`Enter`,
  `ArrowDown`), and unmount listener cleanup.

No `lib/` changes; the eslint `lib/**` boundary is untouched.

## Acceptance criteria

> Left/right arrows shift and the rotate key rotates the active piece on screen, with
> collision/wall limits respected (illegal moves are no-ops).

**Met.** ←/→ shift, ↑ (and x/z) rotate — each verified against core ground truth in jsdom.
Wall/collision limits come free from the core's no-op contract (`tryMove`/rotation return the
input piece when blocked); the left-wall test confirms repeated illegal moves don't advance
the piece and nothing escapes the board.

## Test coverage

- **New component/integration:** 6 cases exercising the full keydown → `dispatch` → `step` →
  repaint path plus the no-op and cleanup edges.
- **Core movement/rotation:** already covered by `lib/game.test.ts` / `lib/movement.test.ts`
  / `lib/rotation.test.ts`; not duplicated here.
- **Full suite:** `npm test` → **140 passed / 16 files**. `tsc --noEmit` clean.
- **Gaps (acceptable):** right-wall / floor / rotation-against-stack no-ops aren't re-asserted
  at the component layer (the left wall proves the wiring honors the contract; the core tests
  cover the geometry). Key auto-repeat (DAS/ARR) isn't tested — intentionally unhandled.

## Open concerns / flags for human attention

1. **Pre-existing repo-wide lint failure (NOT this ticket).** `npm run lint` fails with one
   error in `components/useAnimationFrameLoop.ts:39` ("Cannot update ref during render"),
   from sibling ticket **T-003-02-01** (`b5ae0a3`). My three files lint clean. Because
   `lint` runs `--max-warnings 0` repo-wide, CI/the deploy gate will stay red until
   T-003-02-01 fixes its file. Flagging so it isn't misattributed here.
2. **Window-level listener, no focus affordance.** Chosen so a player never has to click to
   play. If multiple keyboard-listening islands ever coexist, revisit scoping to a focusable
   board element.
3. **No `event.repeat` filter (by design).** Held move keys rely on OS auto-repeat for
   continuous motion. Deliberate DAS/ARR tuning is future work, not in the AC.

## Scope hygiene

`ArrowDown` and the hard-drop key are intentionally absent (owned by **T-003-03-02**, which
also depends on the rAF gravity loop T-003-02-01). Both rotate transitions (CW/CCW) are wired
even though the AC says only "the rotate key," since the core already supports both and it's
natural for players.
