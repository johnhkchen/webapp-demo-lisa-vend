# Design — T-007-05-01 pause-state-core

## Decision summary

Add a `paused: boolean` field to `GameState` (default `false`), add a single `"pause"` member to the
`Input` union that **toggles** the flag, and gate `step` with a leading `if (state.paused) return
state;` placed **after** the `gameOver` guard and **after** the `"pause"` toggle is handled. A paused
no-op returns the *same reference*; toggling twice returns a *deep-equal* fresh state.

This mirrors the existing `gameOver` guard idiom exactly — the one structural pattern the reducer
already uses for "swallow all inputs" — so it adds no new concept, only a second guarded mode.

## Question 1 — Input alphabet: single toggle vs. explicit pause/resume

**Options**

- **A. Single `"pause"` toggle** — `paused: !state.paused`. One new `Input` member.
- **B. Explicit `"pause"` + `"resume"`** — two members, each sets the flag to a fixed value.

**Decision: A (single toggle).** The ticket text says "a toggle Input" (singular) — this is the
literal reading. The consumer (T-007-05-02) binds a single **P** key that flips pause on/off; a
toggle maps 1:1 to that affordance with no seam-side "which one do I send?" logic. B would force the
seam to read `state.paused` before dispatching, duplicating the flag's meaning outside the core.

Idempotency is not needed here: the seam sends exactly one `"pause"` per keypress, and a toggle is
self-consistent (two presses = back to running). B's only advantage — idempotent set — matters only
if some caller can't observe current state, which is not the case (the seam holds the state).

## Question 2 — Where the gate sits, and where `"pause"` is handled

The reducer has three logical regions. Ordering is the whole design. Chosen order:

```ts
export function step(state, input) {
  if (state.gameOver) return state;                       // (1) terminal guard — unchanged
  if (input === "pause") return { ...state, paused: !state.paused };  // (2) toggle, always honored (when not over)
  if (state.paused) return state;                         // (3) paused gate — swallow everything else
  switch (input) { /* ...existing cases, unchanged... */ }// (4) normal play
}
```

**Why this order:**

- **(1) before (2): `gameOver` stays first.** A finished game is terminal — "once game-over is set,
  further input is a no-op" is an existing, tested contract (`game.test.ts:288`). Keeping the
  `gameOver` guard first means `"pause"` on a finished game is a no-op too, with **zero special-case
  code**. Pausing a dead game is meaningless; there is nothing to resume. (Rejected alternative:
  honor `"pause"` even after game-over — needs an extra branch and buys nothing.)
- **(2) before (3): the toggle must escape the paused gate.** If (3) ran first, a paused game would
  swallow `"pause"` and could never resume — a deadlock. So the toggle is handled *before* the
  paused early-return. Placing it as an explicit `if` (not a `switch` case) makes this ordering
  self-evident and independent of the `switch`.
- **(3) before (4): one gate covers every play input.** A single `if (state.paused) return state;`
  gates `left/right/rotate*/soft/hard/tick/hold` uniformly — no per-case `paused` checks, no risk of
  missing one. This is precisely how `gameOver` gates them today.

**Rejected: a `"pause"` case inside the `switch`.** The `switch` is reached only *after* the paused
gate, so a `"pause"` case there would be unreachable while paused → couldn't resume. The toggle
fundamentally must live above the gate. An early `if` is the correct structure.

**Rejected: a `case "pause"` plus letting the paused gate live inside each play case.** That
scatters the gate across eight cases and invites a missed one; the leading guard is strictly safer
and shorter.

## Question 3 — Reference identity of a paused no-op

**Options**

- **A. Same reference** — `if (state.paused) return state;` returns the input object.
- **B. Fresh deep-equal copy** — `return { ...state };`.

**Decision: A (same reference).** The reducer's no-op contract is *identity* everywhere it already
declines to act: blocked moves return the same `active`, the `gameOver` guard returns the same
state, and tests assert this with `toBe` (`:71`, `:173`, `:220`, `:295`). Matching that lets the
paused-tick test use the strongest possible assertion — `expect(step(paused, "tick")).toBe(paused)`
— which proves *nothing at all ran* (no spread, no bag touch), not merely "values matched". B would
allocate needlessly and weaken the guarantee to deep-equality.

**Reconciling with the AC's "equivalent state".** The AC uses two different words deliberately:

- *"a paused tick is a no-op"* → strongest form: **same reference** (`toBe`).
- *"toggling twice returns an equivalent state"* → **deep-equal** (`toEqual`), because each `"pause"`
  genuinely produces a new state (the flag changes), so the two toggles yield a fresh object that is
  *equivalent* to — not identical to — the original. "Equivalent" is exactly `toEqual` semantics.

Both are satisfied without tension: the toggle path allocates (it must, the flag flips), the gate
path does not.

## Interaction review

- **Bag / determinism.** Neither the toggle nor the gate touches `state.bag`; no `next()`/`peek()`.
  Inserting `pause,pause` into an input sequence leaves the piece stream identical → `determinism`
  and `bag` suites unaffected.
- **`canHold` / `hold`.** The paused gate sits above `hold(state)`, so a paused `"hold"` is a no-op
  and `canHold` is untouched — correct: pausing mid-drop must not grant or spend a hold.
- **`createInitialState`.** Add `paused: false`. A new game is running. Symmetric with
  `gameOver: false`.
- **Existing tests using `{ ...createInitialState(n), ...overrides }`.** The spread carries
  `paused: false` through; no existing assertion inspects `paused`, and `toEqual`-based state
  comparisons now compare `false === false`. No breakage expected.
- **Type exhaustiveness.** Adding `"pause"` to the `Input` union with the early `if` means the
  `switch` still covers the *remaining* members exhaustively; `tsc` stays happy. (The `"pause"`
  member is consumed before the switch, so it need not appear as a case.)

## What this design explicitly does NOT do

- No key binding, no rAF-loop halt, no overlay — all T-007-05-02.
- No "auto-pause on blur", no pause timer/countdown, no pause-count telemetry — out of scope.
- No separate paused *screen state*; `paused` is a plain flag on the running state, resumable to an
  identical state by design.

## Resulting contract (for Structure/Plan to implement against)

1. `GameState.paused: boolean`, default `false`.
2. `Input` gains `"pause"`.
3. `step`: `gameOver` guard → `"pause"` toggle → `paused` gate → existing `switch`.
4. Paused non-pause input ⇒ same reference. `pause` twice ⇒ deep-equal to the pre-pause state.
