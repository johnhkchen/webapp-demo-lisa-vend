# T-007-05-02 — Design

Goal: bind `P` to `dispatch("pause")`, halt the rAF loop while paused, and surface a
pause overlay via `GameOverlay`, resuming cleanly. Three seam changes, all in
`components/`. The core (`lib/game.ts`) is already complete and is not touched.

The two decisions with real tradeoffs are: (1) how the loop halts, and (2) how `GameOverlay`
grows a pause variant. Everything else (the key binding) is mechanical and follows precedent.

## Decision 1 — Halting the gravity loop while paused

**Chosen: extend the existing `active` gate — `active={!state.gameOver && !state.paused}`.**

`useAnimationFrameLoop`'s third arg already exists precisely as "a seam for pause/game-over"
(useAnimationFrameLoop.ts:31), and flipping it false→true resets `last`/`acc`, giving a
clean resume with no backlog of ticks firing on unpause. This is a one-line change at
GameContainer.tsx:69 and reuses machinery that is already unit-tested.

Rejected alternatives:

- **Let the loop keep running and rely on the core no-op.** `step` already swallows `tick`
  while paused, so gravity would visibly freeze even if the loop kept spinning. But this
  leaves rAF churning ~60×/s doing nothing, and — worse — the accumulator would keep
  banking elapsed time; on unpause the drained backlog would fire a burst of catch-up ticks,
  dropping the piece several rows at once. That violates "resumes descent from the frozen
  state". The `active` gate's `acc = 0` reset is exactly what prevents this. Rejected.
- **A separate pause-only timing mechanism / manual `cancelAnimationFrame`.** Redundant with
  the `active` seam and would duplicate teardown logic. Rejected.

## Decision 2 — Pause variant of `GameOverlay`

The AC mandates the pause overlay is shown "via GameOverlay". The component's text and
`role` are currently hardcoded to game-over. Options for adding a second variant:

**Chosen: a `mode?: "gameOver" | "paused"` prop, defaulting to `"gameOver"`.**

- `mode="gameOver"` (default) renders exactly today's markup — `role="alert"`, "GAME OVER"
  heading, "Score N · Lines N" summary — so all existing tests pass unchanged and callers
  that omit `mode` are unaffected.
- `mode="paused"` renders a `role="status"` layer with a "PAUSED" heading and a
  "Press P to resume" hint. `status` (polite) rather than `alert` (assertive): a pause is a
  user-initiated, non-urgent state, and using a distinct role keeps the game-over
  `getByRole("alert")` queries unambiguous — the pause overlay won't be picked up by them.
- The dimmed-layer chrome (`absolute inset-0 … bg-black/70 backdrop-blur-sm`, centering) is
  shared between both modes; only heading text, sub-text, and `role` differ.

GameContainer then renders two overlay instances (mutually exclusive by construction):

```tsx
<GameOverlay visible={state.gameOver} score={state.score} lines={state.lines} />
<GameOverlay visible={state.paused} mode="paused" score={state.score} lines={state.lines} />
```

Rejected alternatives:

- **A boolean `paused` prop instead of a `mode` enum.** Two independent booleans (`visible`
  + `paused`) admit nonsense combinations and read worse than one closed `mode`. An enum
  states intent and extends cleanly if a third overlay (e.g. countdown) ever appears.
  Rejected in favor of the enum.
- **A brand-new `PauseOverlay` component.** Duplicates the dimmed-layer chrome and directly
  contradicts the AC's "via GameOverlay". Rejected.
- **Keep `score`/`lines` in the pause banner.** Not meaningful mid-game and adds noise; the
  pause variant shows only "PAUSED" + resume hint. `score`/`lines` remain required props
  (unchanged signature for the game-over path) but are simply unused when `mode="paused"`.
  Accepted as-is — not worth making them optional and churning the game-over call sites.

## Decision 3 — Key binding

**Chosen: add `p: "pause"` and `P: "pause"` to `KEY_TO_INPUT`.** Follows the exact
established precedent for case parity (`c`/`C`, `x`/`X`, `z`/`Z`). No special handling
needed:

- `preventDefault()` fires for all mapped keys already (GameContainer.tsx:82) — fine for P
  (P is not a browser-critical shortcut in this context).
- **No `event.repeat` guard.** Hard-drop needs one because each repeat mutates the stack.
  Pause does not: holding `P` would toggle rapidly, but each toggle is a cheap, reversible
  flip and — critically — while paused the loop is halted, so a held-key flurry just settles
  on paused-or-not depending on parity of repeats. To avoid a held `P` flickering the overlay
  and to match the intent "a press toggles", **guard pause against auto-repeat** the same way
  hard-drop is: ignore `event.repeat` for `"pause"`. This is the one deliberate deviation
  from "movement keys ride auto-repeat" and it is justified: a toggle is edge-triggered by
  nature, like hard-drop's lock. Chosen to fold pause into the existing `event.repeat` guard.

## Resume-cleanliness argument (AC: "resumes descent from the frozen state")

On `P`: `state.paused` flips true → `active` becomes false → the loop effect's cleanup
cancels the pending frame and the effect early-returns (no new frame scheduled). The board
is frozen (movement/tick are core no-ops anyway, but the loop is genuinely stopped, not
spinning). On second `P`: `paused` flips false → `active` true → effect re-runs, `last=null`
/ `acc=0`, a fresh frame is scheduled. The first post-resume frame only establishes a
baseline timestamp (no elapsed time), so descent continues from the frozen position with no
catch-up burst. Identical-state resume is guaranteed by the core (toggle-twice equivalence,
already tested) plus this backlog-free loop restart.

## Test strategy (detail in plan.md)

- `GameOverlay.test.tsx`: pause variant renders "PAUSED" + resume hint under `role="status"`;
  default/`gameOver` mode still renders "GAME OVER" under `role="alert"`; hidden renders null.
- `GameContainer.test.tsx`: `P` shows the pause overlay and halts the rAF loop (`pending`
  null via the pump idiom); a second `P` hides it and resumes descent with no tick burst;
  held-`P` auto-repeat is ignored; `p`/`P` parity; game-over overlay path unchanged.
