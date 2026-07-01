# Design — T-003-02-01 raf-gravity-tick

## Decision summary

Add a **generic rAF loop hook** (`useAnimationFrameLoop`) that fires a callback once per fixed
`intervalMs`, driven by frame-timestamp deltas with a time accumulator. Extend **`useGame`** to own a
mutable `state` (add the `setState` the prior ticket deferred) and expose a stable **`tick()`** that
dispatches `step(state, "tick")` via a *functional* updater. Wire them in **`GameContainer`**:
`useAnimationFrameLoop(tick, GRAVITY_INTERVAL_MS)`. No `lib/` change — the AC pipeline already lives in
`step`.

This keeps three responsibilities separate and independently testable:
- **What advances** — `step` (core, already tested).
- **How React holds it / when to advance one step** — `useGame.tick` (state seam).
- **When ticks fire in wall-clock time** — `useAnimationFrameLoop` (timing seam).

## Options considered

### A. The loop location

- **A1 — fold rAF into `useGame`.** A `useEffect` inside the hook starts the loop and calls `setState`
  directly. Fewer files. *Rejected:* couples game-state ownership to a timing mechanism; makes the
  interval un-swappable (hard-drop, pause, level speed all want to control cadence later); and makes
  the timing logic untestable without also standing up the whole game. Violates the codebase's
  strong separation ethic (pure core vs. thin seams).
- **A2 — generic `useAnimationFrameLoop(onTick, intervalMs, active?)` + `useGame.tick`, composed in
  `GameContainer`.** ✅ **Chosen.** The clock is a reusable, isolate-testable primitive; `useGame`
  stays "hold the game, expose a way to advance it"; the island composes them. Mirrors
  `overlayPiece`/`step` (pure, single-purpose) one layer up. `active?` flag is a cheap seam for a
  future pause/game-over gate without adding scope now (defaults to `true`).

### B. Cadence: frame-driven vs. interval-driven

- **B1 — one `"tick"` per animation frame.** Trivial, but ~60 rows/s — unplayable, and couples game
  speed to refresh rate. *Rejected.*
- **B2 — `setInterval(tick, intervalMs)`.** Simple and correct cadence. *Rejected:* the ticket
  explicitly says *requestAnimationFrame*; rAF pauses in background tabs (no runaway catch-up / no
  battery burn), aligns repaints to frames, and is the E-003 "done looks like" wording ("rAF-driven
  gravity tick"). Keeping the mechanism rAF also lets the same loop later drive sub-row animation.
- **B3 — rAF with a time accumulator.** ✅ **Chosen.** Each frame adds `now - last` to an accumulator;
  while `acc >= intervalMs`, fire `onTick()` and subtract `intervalMs`. Decouples gravity cadence
  from frame rate, is robust to variable frame times, and uses the rAF callback's own
  `DOMHighResTimeStamp` (no `Date.now()`/`performance.now()`). A `while` (not `if`) drains multiple
  intervals if a frame was long, so gravity stays wall-clock-accurate after a hitch.

### C. Feeding latest state to the tick

- **C1 — `setState(step(state, "tick"))` closing over `state`.** *Rejected:* the loop effect captures
  one `state` snapshot; every tick would step the *same* stale state → the piece drops one row
  forever and never locks. Classic stale-closure bug.
- **C2 — functional updater `setState(s => step(s, "tick"))`.** ✅ **Chosen.** Always steps the latest
  committed state regardless of when the effect was created. Lets `tick` be a **stable** `useCallback`
  with `[]` deps, so the rAF effect never needs to re-subscribe as state changes.

### D. Keeping `tick` stable vs. re-subscribing rAF each render

- The rAF effect should start **once** and run until unmount/interval-change. If `onTick` changed
  identity every render, the effect would tear down and rebuild the loop each frame (it calls
  `setState`, which re-renders). **Chosen:** `tick` is stable (C2 + `useCallback([])`), *and*
  `useAnimationFrameLoop` additionally stores `onTick` in a **ref** refreshed every render — belt and
  suspenders — so the loop identity depends only on `intervalMs`/`active`, never on the callback.

### E. Where `GRAVITY_INTERVAL_MS` lives

- *Not `lib/constants.ts`* — that file is deliberately "pure game logic" (board dims), and `gravity.ts`
  states timing is "a feel/timing concern, not pure logic." **Chosen:** export
  `GRAVITY_INTERVAL_MS` from the seam. Co-locate it with `useGame` (the game seam) so the one place
  that owns "the game" also owns "how fast it falls." Value **800 ms** — classic level-1 feel, snappy
  enough to see the AC (descend→lock→spawn) in a few seconds.

## The shape of the code

### `components/useAnimationFrameLoop.ts` (new)

```ts
"use client";
import { useEffect, useRef } from "react";

/** Fire `onTick` once per `intervalMs`, driven by rAF frame-timestamp deltas. Inactive when
 *  `active` is false. Latest `onTick` is always used (ref); the loop re-subscribes only on
 *  intervalMs/active change. Cancels the frame on cleanup. */
export function useAnimationFrameLoop(onTick, intervalMs, active = true) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;               // refreshed every render — no stale callback

  useEffect(() => {
    if (!active) return;
    let raf = 0, last = null, acc = 0;
    const frame = (now) => {
      if (last !== null) {
        acc += now - last;
        while (acc >= intervalMs) { acc -= intervalMs; onTickRef.current(); }
      }
      last = now;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [intervalMs, active]);
}
```

(Types elided here; the real file is fully typed — `onTick: () => void`, `intervalMs: number`,
`active?: boolean`, `last: number | null`.)

### `components/useGame.ts` (extend)

- `const [state, setState] = useState(() => createInitialState(seed));`
- `const tick = useCallback(() => setState((s) => step(s, "tick")), []);`
- Return `{ state, view, tick }` — additive; existing consumers/tests keep working.
- Export `GRAVITY_INTERVAL_MS = 800`.

### `components/GameContainer.tsx` (wire)

```tsx
const { view, tick } = useGame();
useAnimationFrameLoop(tick, GRAVITY_INTERVAL_MS);
return <Board board={view} />;
```

## Why this satisfies the AC

- *Descends one row per interval:* each interval fires `tick` → `step(_, "tick")` → `applyGravity`
  moves the piece down one row; the new `view` repaints via `Board`.
- *Locks when it can fall no further:* `applyGravity` returns `Locked`; `descend` merges it into the
  settled board.
- *Next piece spawns:* same `descend` branch spawns from the bag. All three already exist in `step`;
  the loop just drives them.

## Known tension — Strict Mode × the live bag (documented, not fixed)

`reactStrictMode` defaults to **on**. In **dev**, Strict Mode double-invokes state updaters to catch
impurity. Our updater `s => step(s, "tick")` is impure on a **lock**: `step` calls `bag.next()`, which
mutates the shared 7-bag. So a lock in dev can advance the bag twice → one piece silently skipped from
the sequence. This is exactly the impurity Strict Mode exists to flag, and it is **pre-existing,
core-owned** tension: `game.ts` explicitly defers a serializable bag to a later refactor.

- **Not in scope to fix here** (the fix is core-level; disabling Strict Mode would hide a real signal
  and isn't this ticket's call).
- **Impact is dev-only:** production builds do not double-invoke, so gravity/lock/spawn cadence and the
  AC hold in the deployed demo. The visible falling/locking behaviour is correct either way; only the
  *identity* of the occasional next piece can differ in dev.
- Flagged again in `review.md` with the recommended follow-up (make the bag part of serializable state
  advanced purely inside `step`).

## Testing strategy (detail in plan.md)

1. **`useAnimationFrameLoop`** (jsdom + fake rAF/timers): with a mocked `requestAnimationFrame` fed
   increasing timestamps, assert `onTick` fires ~once per `intervalMs`, drains multiple intervals on a
   long frame, does nothing when `active:false`, and cancels on unmount.
2. **`useGame.tick`** (`renderHook` + `act`): after N `tick()`s on a known seed, the hook's `state`
   equals `N×step(_,"tick")` applied to `createInitialState(seed)` — i.e. it delegates to the core,
   reimplementing nothing. Assert the piece's `y` advanced and that enough ticks reach a lock+spawn.
3. Keep it deterministic (fixed seed, no real timers).
