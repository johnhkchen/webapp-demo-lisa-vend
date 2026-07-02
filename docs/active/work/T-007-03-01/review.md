# Review — T-007-03-01 hold-slot-core

## What changed

One production file and its test, one atomic commit (`12dd6fd`).

### `lib/game.ts` (modified)

- **`GameState`** gains two required fields:
  - `hold: TetrominoType | null` — the held piece *identity* (null = empty). A held piece
    re-enters fresh via `spawnPiece`; its previous rotation/position is deliberately not
    stored.
  - `canHold: boolean` — the once-per-drop lock flag (true = a hold is allowed now).
- **`Input`** gains `"hold"`. The exhaustive `switch` in `step` forced the new `case`
  (compile-time guardrail).
- **`createInitialState`** seeds `hold: null, canHold: true`.
- **`descend`** sets `canHold: true` on its lock/spawn return only — the single lock site in
  the engine, so hard-drop (which routes through `descend`) inherits the reset with no
  duplicated logic. The non-locking (still-falling) return is untouched, so a mid-air tick
  never re-enables hold.
- **New private `hold(state)`**: guards on `!canHold` (returns the input reference on a second
  hold), stashes `active.type`, takes `state.hold ?? state.bag.next()` as the incoming id,
  re-spawns it fresh, sets `canHold: false`, and reuses `collides` to top out consistently
  with an ordinary spawn. `step` dispatches `case "hold"` to it.

### `lib/game.test.ts` (modified)

Added `describe("hold slot (AC)", …)` (9 cases) and a `createSevenBag` import.

## Test coverage

Full suite: **186 passed / 19 files**. New block: 9 cases covering every AC clause plus edge
cases.

| Behavior | Case |
| --- | --- |
| First hold, empty slot: stash + fresh bag draw | ✅ (asserts drawn id via `peek`) |
| Occupied slot: swap active↔hold, held piece returns fresh | ✅ (rotation 0, y 0) |
| Swap does **not** advance the bag | ✅ (`peek(3)` equality vs. sibling) |
| Second hold before lock is a no-op (same reference) | ✅ (`toBe`) |
| Flag resets on lock and re-enables hold | ✅ |
| Non-locking tick leaves the flag untouched | ✅ |
| Hard-drop shares the reset | ✅ |
| `"hold"` no-op once game-over | ✅ |
| Non-mutation of input state | ✅ |

The AC ("first hold stashes/swaps; second hold before lock is a no-op; flag resets on lock —
asserted by game.test.ts, suite green") is fully covered and green.

### Coverage gaps (minor, by design)

- **No property/fuzz test** that a long random input stream keeps at most one hold per drop —
  the invariant is enforced structurally (only `hold` clears the flag, only `descend` sets it),
  so the targeted cases are sufficient for a pure reducer of this size.
- **No test of an empty-hold draw that tops out** (hold-swap spawning into a full top row →
  `gameOver`). The code path reuses the identical `collides` check `descend` already exercises
  under the game-over suite, so behavior is covered indirectly; a dedicated case could be added
  if hold-triggered top-out becomes a product concern.

## Open concerns / limitations

- **Determinism note**: the empty-hold path advances the shared mutable bag, so a game that
  holds diverges in draw order from one that doesn't. This is correct (holding really does pull
  the next queued piece), but any future replay/serialization work must capture the bag state —
  already flagged as a later refactor in the `game.ts` header.
- **Scope fence honored**: no render, no key binding, no hold-swap scoring, no
  infinite-hold prevention beyond the flag. Rendering the held piece and binding a key is
  T-007-03-02, which depends on this ticket.
- **`GameState` grew two required fields.** All existing construction sites build via
  `{ ...createInitialState(seed), … }` spreads and inherit the defaults, so nothing broke
  (confirmed by the full green suite + build). Any hand-rolled `GameState` literal added later
  must supply both fields — TypeScript enforces this.

## Verification

- `npx vitest run` → 186 passed / 19 files.
- `npm run lint` → clean (`--max-warnings 0`).
- `npm run build` → success.

## Handoff

No critical issues. The pure hold core is complete and consistent with the existing reducer
patterns (delegating helper for multi-line logic, single lock site owning the flag reset,
`collides`-based top-out reuse). Ready for the T-007-03-02 render/input ticket to consume
`GameState.hold`, `GameState.canHold`, and the `"hold"` input.
