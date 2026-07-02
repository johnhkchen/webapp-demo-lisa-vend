# Structure — T-007-05-01 pause-state-core

The blueprint: exact file-level changes. Two files touched, both under `lib/`. No new files, no
deletions, no seam/React changes.

## Files

| File | Change | Why |
|------|--------|-----|
| `lib/game.ts` | modified | Add `paused` to `GameState`; default it in `createInitialState`; add `"pause"` to `Input`; gate `step`. |
| `lib/game.test.ts` | modified | Add a `describe("pause", …)` block covering the AC + gating + interactions. |

Nothing else. `types.ts` is untouched (`GameState`/`Input` live in `game.ts`, not `types.ts`).

## `lib/game.ts` — four edits

### E1. `GameState` interface — add the flag

Add `paused: boolean;` immediately after `gameOver: boolean;` (its nearest structural analogue), so
the flag ordering reads `gameOver` → `paused` → `hold`/`canHold`.

Update the interface doc comment: one sentence noting `paused` freezes gravity/movement and is a
resumable flag (not a separate screen state), distinct from terminal `gameOver`.

### E2. `Input` union — add the toggle member

Add `| "pause"` to the union. Extend the `Input` doc comment with a short paragraph:

> `pause` toggles the `paused` flag: while paused, `step` swallows every other input (a no-op
> returning the same state) so gravity and movement freeze; a second `pause` resumes to an identical
> state. Honored only while the game is running (a game-over game ignores it, like every input).

### E3. `createInitialState` — default the flag

In the returned literal, add `paused: false,` (next to `gameOver: false,`). A fresh game is running.

### E4. `step` — the gate + toggle ordering

Insert two lines between the existing `gameOver` guard and the `switch`:

```ts
export function step(state: GameState, input: Input): GameState {
  if (state.gameOver) return state;
  if (input === "pause") return { ...state, paused: !state.paused };
  if (state.paused) return state;

  switch (input) {
    /* ...all existing cases unchanged... */
  }
}
```

- The `switch` body is **unchanged** — no `"pause"` case is added (it is consumed by the early `if`
  before the switch is reached, and the union remains exhaustively handled for `tsc`).
- Update the `step` doc comment: add a sentence that `"pause"` toggles `paused` and, while paused,
  every other input is a no-op (same reference), symmetric with the `gameOver` guard.

Public API delta: `Input` gains a member (additive), `GameState` gains a field (additive). No
signature changes to `step`, `createInitialState`, `upcomingPieces`.

## `lib/game.test.ts` — new `describe("pause (AC)", …)`

Reuse existing helpers (`fillRowExcept`, `tickUntilGameOver`, `fillTopCenter`,
`{ ...createInitialState(n), ...overrides }`). Cases:

1. **`"pause"` toggles the flag on then off.**
   `const p = step(s, "pause"); expect(p.paused).toBe(true);`
   `expect(step(p, "pause").paused).toBe(false);`

2. **A paused tick is a no-op (same reference).** *(AC)*
   `const p = step(s, "pause"); expect(step(p, "tick")).toBe(p);`
   Assert gravity did not run: `p.active.position.y` unchanged (implied by `toBe`, but a redundant
   `y` check documents intent).

3. **Toggling twice returns an equivalent state.** *(AC)*
   `expect(step(step(s, "pause"), "pause")).toEqual(s);`
   Use `toEqual` (fresh object each toggle), and confirm it is *not* the same reference:
   `expect(step(step(s, "pause"), "pause")).not.toBe(s);`

4. **Every play input is gated while paused (same reference).**
   Loop over `["left","right","rotateCW","rotateCCW","softDrop","hardDrop","tick","hold"]`, each
   `expect(step(p, input)).toBe(p)` on a paused `p`. Proves the single leading gate covers the whole
   alphabet — the design's core claim.

5. **Resumes cleanly: descent continues from the frozen piece.**
   `s → pause → (paused tick no-op) → pause → tick` lands the piece one row below where it was when
   paused; equivalently, the post-resume state deep-equals `step(s, "tick")` (pause round-trip is
   transparent to the piece stream). Assert `resumed.active.position.y === s.active.position.y + 1`.

6. **Pause does not consume a bag draw / preserves the stream.**
   `step(s, "pause").bag.peek(3)` equals a sibling game's `peek(3)` from the same seed — pausing
   advances no piece (guards against an accidental `next()` on the toggle path).

7. **A paused `hold` does not spend the allowance.**
   On a paused state with `canHold: true`, `step(p, "hold")` is `toBe(p)` and `p.canHold` stays
   `true` — pausing mid-drop neither grants nor spends a hold.

8. **`"pause"` is a no-op once game-over is set.**
   `const ended = tickUntilGameOver(...); expect(step(ended, "pause")).toBe(ended);`
   Confirms the `gameOver` guard sits before the toggle (a dead game cannot be paused).

## Ordering of changes (matters)

1. E1 + E3 (state field + default) — makes the type real and every constructed state carry it.
2. E2 (input member) — extends the alphabet.
3. E4 (gate + toggle) — the behavior; depends on E1–E3 compiling.
4. Tests — assert E1–E4. Commit production + test together per atomic unit (see plan).

## Verification gates

- `npx tsc --noEmit` — exhaustive `switch` still type-checks; new field/member wired everywhere.
- `npm test` — full suite green, including the new `pause` block and unchanged `determinism`/`bag`.
- `npm run lint` — no React import creeps into `lib/`; 0 warnings.

## Risk / blast radius

- **Additive only.** No existing `step` case changes; no field is removed or renamed. Existing tests
  that spread `createInitialState` inherit `paused: false` transparently.
- **Single behavioral seam** (the two new lines in `step`) — small, isolated, fully covered by cases
  2–8. The only way to break existing behavior is if the paused gate ran when `paused === false`,
  which case 5 (clean resume) and the whole untouched suite would catch immediately.
