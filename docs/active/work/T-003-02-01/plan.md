# Plan — T-003-02-01 raf-gravity-tick

Three commit-sized steps, leaf → root. Each builds and tests independently. `npm test` and
`npm run build` must stay green throughout.

## Step 1 — `useAnimationFrameLoop` (timing seam) + test

**Create `components/useAnimationFrameLoop.ts`:**
- `"use client"`; import `useEffect`, `useRef`.
- `useAnimationFrameLoop(onTick: () => void, intervalMs: number, active = true): void`.
- `onTickRef` refreshed every render; single `useEffect([intervalMs, active])` running the
  accumulator loop (`while (acc >= intervalMs)`), cleanup `cancelAnimationFrame`.
- Full docblock: purpose, cadence-not-frame-rate, latest-callback ref, cleanup, `active` gate.

**Create `components/useAnimationFrameLoop.test.ts`** (`// @vitest-environment jsdom`):
- Harness: stub `globalThis.requestAnimationFrame` to capture the frame callback into a queue and
  `cancelAnimationFrame` to mark cancellation; a helper `advance(ms)` invokes the latest captured
  callback with a monotonically increasing timestamp. (Manual pump — deterministic, no real timers.)
- Test a tiny component that calls the hook, or use `renderHook` from `@testing-library/react`.
- Cases:
  1. `onTick` fires **once** after one `intervalMs` elapses across frames; **not** before.
  2. A single long frame (`> 3× intervalMs`) drains **3** ticks (accumulator `while`).
  3. `active: false` → never fires.
  4. Unmount → `cancelAnimationFrame` called; no further ticks.

**Verify:** `npm test -- useAnimationFrameLoop` green. Commit:
`feat(T-003-02-01): add useAnimationFrameLoop — fixed-interval rAF tick via time accumulator`.

## Step 2 — extend `useGame` with `tick` + `GRAVITY_INTERVAL_MS` + test

**Modify `components/useGame.ts`:**
- Add imports `useCallback`, and `step` from `@/lib/game`.
- `const [state, setState] = useState(() => createInitialState(seed));`
- `const tick = useCallback(() => setState((s) => step(s, "tick")), []);`
- Add `tick` to the returned object and to the `GameView` interface.
- `export const GRAVITY_INTERVAL_MS = 800;` with a docblock (feel value, why in the seam not `lib/`).
- Rewrite the "no setter / no loop yet" docblock paragraph to describe the now-present loop seam.

**Create `components/useGame.test.ts`** (`// @vitest-environment jsdom`):
- `renderHook(() => useGame(SEED))` with a fixed `SEED`.
- Case A — **delegates to the core:** apply `tick()` inside `act()` N times; independently compute
  `let s = createInitialState(SEED); for … s = step(s, "tick")`. Assert the hook's `state.active`
  position/board match the hand-rolled `step` chain (reimplements nothing).
- Case B — **descends one row per tick:** one `tick()` advances `state.active.position.y` by 1 (piece
  not yet landed for the seed's first piece).
- Case C — **locks then spawns:** enough `tick()`s to land the first piece → the settled `board` gains
  cells and a fresh `active` appears (identity/again via the `step` reference chain). Keeps the AC
  honest at the hook level without real timers.

**Verify:** `npm test -- useGame` green; existing `GameContainer.test.tsx` still green (additive
change). Commit:
`feat(T-003-02-01): expose useGame.tick + GRAVITY_INTERVAL_MS (functional step dispatch)`.

## Step 3 — wire the loop in `GameContainer`

**Modify `components/GameContainer.tsx`:**
- Import `useAnimationFrameLoop` and `GRAVITY_INTERVAL_MS`.
- `const { view, tick } = useGame();`
- `useAnimationFrameLoop(tick, GRAVITY_INTERVAL_MS);`
- Update docblock: gravity loop wired here; input still a later ticket.

**Verify:**
- `npm test` — full suite green (the existing `GameContainer.test.tsx` renders the island; the loop
  hook mounts with jsdom's rAF, which fires no synchronous ticks, so the first-frame assertions still
  hold).
- `npm run build` — production compile/type gate passes.
- `npm run lint` — 0 warnings.

Commit: `feat(T-003-02-01): drive gravity — mount rAF tick loop in GameContainer`.

## Verification criteria (maps to AC)

- **Unit:** `useGame.test` proves descend→lock→spawn via delegation to `step` (Case B/C).
- **Unit:** `useAnimationFrameLoop.test` proves the clock fires one tick per interval and drains
  backlog — i.e. "one row per gravity interval."
- **Build/lint:** green, so the deploy gate (E-005) stays intact.
- **Manual (optional, documented in review):** `npm run dev` → the piece visibly falls one row every
  ~0.8 s, locks at the floor, and the next piece appears — no input.

## Risks / watch-items

- **Stale closure:** mitigated by the functional updater (Step 2, Case A guards it).
- **rAF re-subscribe thrash:** mitigated by stable `tick` + `onTickRef` (Step 1).
- **Strict-Mode × live bag (dev-only):** documented in design/review; not fixed here (core-owned).
  Not asserted in tests (renderHook doesn't wrap in `<StrictMode>` by default), matching real prod
  behaviour.
- **jsdom rAF:** jsdom provides `requestAnimationFrame`; Step-1 tests stub it for determinism, Step-3
  relies only on it not firing synchronously (true in jsdom). No real timers anywhere.
