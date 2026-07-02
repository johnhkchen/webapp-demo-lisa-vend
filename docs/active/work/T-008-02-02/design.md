# T-008-02-02 — Design: start-handoff-clean

## What must be true when done

1. Pressing Start while the demo auto-plays **halts the attract driver** (no bot input dispatched
   afterward) and hands off to a **fresh** `createInitialState` human game.
2. The first human game begins from a **clean state**: empty board, first spawn, zeroed
   score/lines — none of the bot's in-progress board/score/active piece carried over.
3. After Start the keyboard controls the human game and human gravity runs (the normal play path,
   unchanged).
4. The production build and existing playability/scoring suites stay green.
5. Covered by a test asserting (a) no bot inputs after Start and (b) a clean first human game.

## Decision 1 — Start does `reset(DEFAULT_SEED)` **and** `setAttract(false)`

The crux from Research: one game holder, and the attract loop has been mutating it, so `state` at
Start holds the bot's leftover game. A clean handoff is therefore two coupled state updates in the
same event handler:

```ts
const startHumanGame = useCallback(() => {
  reset(DEFAULT_SEED); // discard the bot's in-progress board/score/piece → fresh core state
  setAttract(false);   // halt the attract driver; enable human gravity + keyboard
}, [reset]);
```

Both are React state setters, so they batch into one render. After commit: `state` is a fresh
`createInitialState(DEFAULT_SEED)` and `attract` is false. The attract loop's effect re-runs with
`active=false` and its cleanup cancels the pending frame; the human gravity loop's effect re-runs
with `active=true` and schedules its frame. So the *only* thing that advances the board after Start
is human gravity — "no bot input after Start" is a property of the loop teardown, not something we
police by hand.

**Seed = `DEFAULT_SEED`**, not a fresh/random one:
- It is the canonical fresh game — identical to what `attract={false}` renders — so the human's
  first game is deterministic and every existing playability/scoring test's ground truth
  (`createInitialState(DEFAULT_SEED)` / `expectedAfter(...)`) applies unchanged.
- Random would reintroduce the hydration hazard `DEFAULT_SEED`'s docstring warns about and make the
  handoff untestable. Per-load variety is explicitly a non-goal here.

Rejected: flip `attract` only (no reset). Fails AC #2 — the human inherits the bot's board/score.
Rejected: reset but keep the loop wiring implicit. The reset alone doesn't stop the bot loop; both
updates are required.

## Decision 2 — Trigger: any ordinary key ("PRESS START"), not a click, not one dedicated key

The overlay literally says **PRESS START** and is `pointer-events-none` (T-008-02-01, so the demo
shows through) — a click can't land on it, and wiring a board-wide click handler is more surface
than the AC asks for. So the trigger is the keyboard.

*Any* ordinary key starts (arcade convention), rather than a single dedicated key:
- "PRESS START" implies "press a key," not "press Enter specifically." Any-key is the least
  surprising.
- A dedicated key (e.g. Space) is awkward: Space is also hard-drop, so the first press would read
  ambiguously, and other keys would stay dead during attract for no reason.

**Excluded from "any key"** so we neither hijack browser shortcuts nor misfire:
- chords with `metaKey`/`ctrlKey`/`altKey` held (Cmd+R, Ctrl+L, …) — leave the browser alone;
- lone modifier keys (`Shift`, `Control`, `Alt`, `Meta`) — resting a finger on Shift shouldn't start.

A small `isStartKey(event)` predicate encodes exactly this. The start press is **consumed**
(`preventDefault`) and does **not** double as a game move — the fresh piece begins untouched, which
is the arcade idiom and keeps the "clean state" guarantee crisp.

```ts
function onKeyDown(event: KeyboardEvent) {
  if (attract) {
    if (isStartKey(event)) { event.preventDefault(); startHumanGame(); }
    return; // still swallow bare modifiers / chords while attracting
  }
  /* …existing human keymap unchanged… */
}
```

`attract` and `startHumanGame` join the effect's dep array; `startHumanGame` is stable (depends
only on the stable `reset`), so the listener re-subscribes only when `attract` flips — once.

Rejected: keep swallowing keys and add a visible "Start" `<button>`. More DOM/focus/layout surface,
doesn't match the existing arcade pill, and still needs the same reset+flip underneath.

## Decision 3 — Reconcile the obsolete "swallows keyboard input" attract test

T-008-02-01's attract block asserts a keypress during attract leaves the board unchanged (keys
swallowed). This ticket **intentionally changes that contract**: a key now starts the game. Leaving
the test would either fail (its second keypress, Space, now hard-drops the freshly-started human
game) or pass only by coincidence and misdescribe behavior.

**Chosen:** replace that single test with the new start-handoff coverage (Decision 4). The honest
truth it protected — "the bot plays uncontested; a stray key doesn't feed the bot" — is preserved
by the new tests (a key doesn't move *the bot's* piece; it starts a *fresh* game). Document the
supersession in the review so the diff isn't read as lost coverage.

Rejected: keep both. The old assertion is now false; keeping it is misleading, not extra safety.

## Decision 4 — Test strategy: prove the two AC halves directly, reuse the rAF pump

Reuse `GameContainer.test.tsx`'s deterministic pump (`frame(now)`), `filledCoords`, and
`expectedAfter`. New describe block **"GameContainer — start handoff (T-008-02-02)"**:

1. **Clean fresh game.** Render `<GameContainer />` (attract). Pump attract frames until the bot has
   locked ≥1 piece (`filledCoords().length > 4`, mirroring the existing auto-play test) so the board
   is provably *dirty*. Press Enter. Assert: the PRESS START status is gone, and `filledCoords()`
   equals `expectedAfter()` (exactly the fresh default-seed spawn) — i.e. the dirty board/score were
   discarded, not inherited.
2. **No bot input after Start; human gravity drives.** After Start, pump one `GRAVITY_INTERVAL_MS`
   and assert `filledCoords()` equals `expectedAfter("tick")`. A bot move's first input is a
   rotate/shift (never a bare `tick` on the default spawn), so matching a pure `tick` proves the
   attract driver is silent and the human gravity loop is what advanced the board.
3. **Keyboard controls the human game after Start.** After Start, press ArrowLeft and assert
   `filledCoords()` equals `expectedAfter("left")` — the handoff actually gave control to the human.
4. **Browser chords / bare modifiers don't start.** During attract, fire `Meta+r` and a lone
   `Shift`; assert the PRESS START overlay is still visible (no handoff) and the board still
   auto-advances on the next attract frame.

This mirrors the existing "isolate the seam, assert against core ground truth" idiom
(`expectedAfter`) and covers exactly the AC. The build/lint gate (`npm run test`, `npm run build`,
`npm run lint`) is the "suites stay green" check.
