# Review — T-003-02-01 raf-gravity-tick

## What shipped

Automatic gravity: on load, with no input, the active piece descends one row per interval, locks
when it can fall no further, and the next piece spawns — the ticket's sole AC. Implemented purely in
the React seam; **no `lib/` change** — the descend → lock → clear → spawn pipeline already lived in
`step(state, "tick")`, and this ticket only built the clock that drives it.

## Files

| File | Change | Notes |
|------|--------|-------|
| `components/useAnimationFrameLoop.ts` | **new** (63 lines) | Game-agnostic rAF loop: fire a `() => void` once per `intervalMs` via a frame-timestamp accumulator. `active` flag for a future pause gate. |
| `components/useAnimationFrameLoop.test.ts` | **new** (5 tests) | Deterministic manual rAF pump — cadence, backlog drain, inactive, latest-callback, unmount-cancel. |
| `components/useGame.ts` | **modify** (+1 export) | Added `GRAVITY_INTERVAL_MS = 800` and its docblock. State/`dispatch` already existed (landed by T-003-03-01). |
| `components/GameContainer.tsx` | **modify** (+2 lines) | `useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS)`; docblock updated. |
| `components/useGame.gravity.test.ts` | **new** (3 tests) | Descend-one-row-per-tick; hook tracks the pure core exactly; lock + respawn. |

Net: 2 new source files' worth of behaviour, 2 small edits, 8 new tests. No files deleted.

## How it works (one paragraph)

`useAnimationFrameLoop` schedules `requestAnimationFrame`; each frame adds `now - last` (from the
callback's own `DOMHighResTimeStamp`) to an accumulator and fires `onTick` once per whole
`intervalMs` drained (`while`, so a long frame drains a backlog and gravity stays wall-clock
accurate). The callback is read through a ref refreshed in a `useLayoutEffect`, so the newest
callback always runs while the loop re-subscribes only on `intervalMs`/`active` change. `GameContainer`
passes `() => dispatch("tick")`; `dispatch` runs `setState(s => step(s, "tick"))` — a functional
update, so every tick steps the *latest* committed state (no stale closure) and repaints via the
memoized composed `view`.

## Verification

- **`npm test`** — 17 files, **143 tests, all green** (8 new).
- **`npm run lint`** — clean at `--max-warnings 0` (fixed a `react-hooks/refs` violation en route:
  ref sync moved from render into `useLayoutEffect`).
- **`npm run build`** — production compile + TypeScript gate passes; `/` still prerenders static.
- **AC coverage:** `useGame.gravity.test.ts` proves descend-per-tick (Case 1), exact delegation to
  the core (Case 2, hook state == hand-rolled `step` chain), and lock-then-spawn (Case 3, settled
  board gains exactly 4 cells and a fresh piece appears above the stack, `gameOver === false`).
- **Not yet done in-app:** a live `npm run dev` eyeball (piece visibly falling every ~0.8s). The
  behaviour is fully covered by the core + hook tests, but a human glance at the running demo is the
  natural final confirmation before merge.

## Test coverage assessment

- **Timing logic** — well covered in isolation via a mocked rAF (cadence, multi-interval drain,
  inactive no-op, latest-callback swap, unmount cancellation). No real timers, so no flake.
- **Gravity/lock/spawn** — covered at the hook level by delegation to the already-well-tested `step`
  (the core has its own determinism/lock/spawn/game-over suites). The hook test deliberately asserts
  *equality with the pure core* rather than re-deriving Tetris rules, matching the codebase's
  "assert against the core, don't reimplement" discipline.
- **Gap (minor):** no test wires the *real* `useAnimationFrameLoop` → `GameContainer` → repaint path
  end-to-end (frame → DOM cell change). It would need a jsdom rAF pump around a full render; the two
  halves are each covered, and the composition is two trivial lines, so the risk is low. Flagged as a
  candidate integration test if the loop grows (pause, level speed).

## Open concerns / for human attention

1. **Strict-Mode × the live 7-bag (dev-only; pre-existing, core-owned).** `reactStrictMode` defaults
   on. In **dev**, React double-invokes state updaters to surface impurity. Our updater
   `s => step(s, "tick")` is impure on a **lock** — `step` calls `bag.next()`, mutating the shared
   bag — so a lock in dev can advance the bag twice and silently skip one piece from the sequence.
   - **Impact is dev-only:** production builds don't double-invoke, so the deployed demo's
     descend/lock/spawn cadence and piece order are correct. Only the identity of the occasional
     next piece can differ under `next dev`.
   - **Not fixed here by design:** the clean fix is core-level — make the bag part of serializable
     state advanced *purely* inside `step` — which `lib/game.ts` already flags as a deliberate later
     refactor. Disabling Strict Mode would hide a genuine signal and isn't this ticket's call.
   - **Recommended follow-up ticket:** serializable RNG/bag in `GameState` so `step` becomes
     value-pure; this also unlocks save/replay.
2. **Fixed gravity speed.** `GRAVITY_INTERVAL_MS = 800` is a single constant; level-scaled speed-up
   is a later epic. The `active` flag on the loop is the ready seam for pause/game-over gating (left
   at default `true` — the loop keeps ticking after game-over, which `step` absorbs as a no-op, exactly
   as the core intends).
3. **Concurrent-branch note.** This ticket and T-003-03-01 (keyboard) both touched
   `useGame.ts`/`GameContainer.tsx` — a missing `depends_on` edge in the DAG. The commit lock
   serialized them cleanly and this ticket reused T-003-03-01's `dispatch` rather than fighting it,
   but the dependency graph would ideally model that both stories extend the same seam.

## Bottom line

AC met, green across test/lint/build, minimal and additive. The one real caveat (Strict-Mode bag
double-advance) is dev-only, pre-existing, and belongs to a core refactor already on the roadmap —
documented, not papered over.
