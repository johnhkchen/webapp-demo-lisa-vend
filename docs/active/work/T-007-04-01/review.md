# Review — T-007-04-01 surface-upcoming-queue

## What was asked

Surface the bag's lookahead into the render-ready view (`useGame`'s `GameView`) so components can
read the next N upcoming tetromino ids **without touching the live bag**. AC: `useGame`'s view
exposes the next N upcoming ids sourced from the bag peek; a test asserts the surfaced queue matches
subsequent spawns for a fixed seed, suite green.

## What changed

### Production code

- **`lib/game.ts`** — added exported pure `upcomingPieces(state: GameState, n: number):
  TetrominoType[]` = `state.bag.peek(n)`. Read-only accessor with a doc comment stating the
  non-consuming contract. Frames "read the lookahead from a `GameState`" as a named, framework-free
  core concept — testable without React, and the seam's one sanctioned way to read the bag ahead.

- **`components/useGame.ts`** — three additive changes:
  - `export const PREVIEW_COUNT = 5` (UI/feel policy in the seam, next to `DEFAULT_SEED` /
    `GRAVITY_INTERVAL_MS`; exported so the render ticket uses one source of truth).
  - `GameView` widened with `queue: TetrominoType[]`.
  - `const queue = useMemo(() => upcomingPieces(state, PREVIEW_COUNT), [state])`, returned from the
    hook. Joins `view` (`overlayPiece`) and `ghost` (`ghostCells`) as a pure-helper-derived,
    `state`-memoized projection — the established seam pattern.

### Tests

- **`lib/game.test.ts`** — `describe("upcomingPieces …")`: (1) queue equals the types of the next N
  hard-drop spawns; (2) non-consuming — double peek is stable and the next spawn is still
  `queue[0]`; (3) fresh array — mutating the result can't corrupt the bag; (4) `n <= 0` → `[]`.
- **`components/useGame.queue.test.ts`** (new, jsdom + `renderHook`): queue length ==
  `PREVIEW_COUNT`; queue predicts spawn order across N hard-drops; queue tracks the pure core after
  each drop (no rules reimplemented in the hook).

Commits: `193159d`, `9bccf31`, `2e338f9`, `54cafed` (feat/test interleaved, each atomic).

## Test coverage assessment

- **AC directly covered.** "view exposes next N upcoming ids from bag peek" → hook test asserts
  `queue.length === PREVIEW_COUNT` and equals an independently-built core peek. "surfaced queue
  matches subsequent spawns for a fixed seed" → both the pure-core test and the hook test drive N
  hard-drops and assert each spawned `active.type` equals the pre-captured queue entry.
- **Regression safety.** Full suite 213/213 green, including `determinism.test.ts`, `bag.test.ts`,
  and `useGame.gravity.test.ts` — unchanged, confirming the read-only peek does not perturb the
  piece stream or any downstream behavior.
- **Gates.** `npm test` green; `npm run lint` clean (0 warnings); `npx tsc --noEmit` clean.

### Gaps / not covered (intentional)

- No render/DOM test for a preview component — rendering is the sibling ticket **T-007-04-02**; this
  ticket stops at surfacing the data.
- Queue behavior specifically *through a `hold`* draw isn't asserted in its own case, but the
  mechanism is identical (`hold`'s empty-slot path also calls `bag.next()`, and peek/next agreement
  is proven in `bag.test.ts` + the non-consuming test here). Low risk; could be added if the render
  ticket surfaces a need.

## Open concerns / notes for a reviewer

- **`PREVIEW_COUNT` placement.** Chosen: the seam (`useGame.ts`), matching the existing convention
  that feel/UI policy stays out of `lib/constants.ts`. If a reviewer prefers it in `lib/`, it's a
  one-line move — but that would contradict the documented rationale for `GRAVITY_INTERVAL_MS`.
- **`queue` is derived, never stored.** It cannot desync from the bag (peek is the source of truth
  read live each render). No serialization concern.
- **Top-out guard in tests.** The spawn-match loops run exactly `PREVIEW_COUNT` (=5) hard-drops,
  which stack at the floor of an empty board and cannot reach the spawn rows; the tests also assert
  `gameOver === false` at each step, so a future change that broke this would fail loudly rather
  than silently skip assertions.

## Verdict

AC met, suite green, additive and pattern-consistent change. No blocking issues. Ready for the
sibling render ticket (T-007-04-02) to consume `PREVIEW_COUNT` + `queue`.
