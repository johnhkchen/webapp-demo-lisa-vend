# T-008-02-02 — Plan: start-handoff-clean

## Testing strategy (overview)

- **Unit/integration (vitest + jsdom, `npm run test`):** the four new start-handoff tests in
  `GameContainer.test.tsx` (design Decision 4) plus the untouched existing suites (playability,
  scoring, attract, pause, game-over) proving no regression.
- **Ground truth, not reimplementation:** assert against `expectedAfter(...)` / `createInitialState`
  as every other GameContainer test does — the reset/flip is verified by comparing the rendered
  board to the pure core, never by re-deriving Tetris rules in the test.
- **Build/lint gate:** `npm run build` and `npm run lint --max-warnings 0` must pass (the AC's
  "production build … stays green"). Note: `build` runs through vinext/Vite → Cloudflare; if the
  sandbox can't complete a Workers build, fall back to `tsc`/lint + full test run and record that in
  progress.md.

## Step 1 — Implement the handoff in `GameContainer.tsx`

Single, self-contained edit (per structure.md):
1. Imports: add `useCallback`; add `DEFAULT_SEED` to the `useGame` import.
2. Add the `isStartKey` module helper beside `KEY_TO_INPUT`.
3. Destructure the setter: `const [attract, setAttract] = useState(initialAttract);`.
4. Add `startHumanGame = useCallback(() => { reset(DEFAULT_SEED); setAttract(false); }, [reset])`
   after the `useAttractLoop` call.
5. Prepend the attract branch to `onKeyDown`; add `startHumanGame` to the effect dep array.
6. Update the component's leading docstring to describe the handoff (supersede the "T-008-02-02 will
   flip attract" note with "does flip it").

**Verify:** `npm run test -- GameContainer` should still pass the *existing* tests except the
soon-to-be-removed swallow test (which will now fail — expected, fixed in Step 2). Commit after
Step 2 so the tree is green at the commit.

## Step 2 — Update `GameContainer.test.tsx`

1. Delete the attract-block test `"swallows keyboard input while the bot plays (no bleed-through)"`.
2. Add the `GameContainer — start handoff (T-008-02-02)` describe block with the per-block rAF pump
   scaffold and four tests:

   - **T1 — clean fresh game.** Render `<GameContainer />`. `frame(0)` baseline, then pump
     `t += 120` attract frames (bound ~60) until `filledCoords().length > 4` (bot locked a piece →
     board is dirty). Assert `locked` is true (guards the premise). `fireEvent.keyDown(window,
     { key: "Enter" })`. Assert `screen.queryByRole("status")` is null (PRESS START gone) and
     `filledCoords()` `toEqual(expectedAfter())` (fresh default-seed spawn only — dirty board
     discarded).
   - **T2 — human gravity, not the bot, advances.** Continue from a started game (or start fresh:
     render, `frame(0)`, press Enter immediately, then baseline `frame(t0)`). Pump one
     `GRAVITY_INTERVAL_MS` (advance `t` by 800 across two frames: baseline + one interval) and assert
     `filledCoords()` `toEqual(expectedAfter("tick"))`. (A bot move would be a rotate/shift, never a
     bare tick — so matching a pure tick proves the driver is silent.)
   - **T3 — keyboard controls the human game.** Render, `frame(0)`, press Enter (start). Then
     `fireEvent.keyDown(window, { key: "ArrowLeft" })` and assert `filledCoords()`
     `toEqual(expectedAfter("left"))`.
   - **T4 — chords / bare modifiers don't start.** Render (attract), `frame(0)`. Fire
     `keyDown(window, { key: "r", metaKey: true })` and `keyDown(window, { key: "Shift" })`. Assert
     `screen.queryByRole("status")?.textContent` still matches `/press start/i` (no handoff) and that
     the board still auto-advances: pump an attract frame and confirm state still moves as attract
     (e.g. overlay remains, board not the frozen fresh spawn). Keep assertions minimal/robust.

   Note on timing in T2/T3: reuse the sibling blocks' idiom — `frame(0)` sets a baseline (no elapsed
   time, no tick), the *next* frame at `+interval` fires exactly one tick. For T3 the ArrowLeft is a
   direct `fireEvent`, independent of the pump.

**Verify:** `npm run test` green (all files). Commit: `test(T-008-02-02) + feat(attract): Start
hands off to a fresh human game`.

## Step 3 — Caption honesty in `app/page.tsx`

Change caption to `Auto-play demo — press any key to play`. No test needed (copy only); the existing
render tests don't assert this string.

**Verify:** `npm run lint`, `npm run build` (or documented fallback). Commit:
`docs(ui): caption reflects press-any-key handoff` (or fold into Step 2 commit if trivial).

## Step 4 — Full gate + Review artifact

Run `npm run test`, `npm run lint`, `npm run build`. Record outcomes in progress.md. Write
review.md (files changed, coverage, gaps: no real-browser E2E of a keyboard handoff — covered by the
jsdom pump; note the natural-top-out gap is inherited from T-008-02-01 and not reopened here).

## Commit sequence (atomic)

1. `feat(attract): Start key hands off to a fresh clean human game` — Step 1 + Step 2 together (so
   the tree is green: the implementation and its test/reconciliation land as one).
2. `docs(ui): caption reflects press-any-key handoff` — Step 3 (optional standalone).

## Rollback / risk

- Lowest-risk change: one component, additive control flow guarded by `if (attract)`. When
  `attract` is false (the entire existing human-play surface and all its tests), the code path is
  byte-for-byte the prior behavior.
- Chief risk is test-timing (baseline-frame semantics of the rAF pump). Mitigated by copying the
  exact pump idiom the passing pause/game-over blocks already use.
