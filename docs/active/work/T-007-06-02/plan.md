# Plan — T-007-06-02 row-flash-and-60fps-transitions

Ordered, independently-verifiable steps. Each step is one atomic commit and leaves the suite green.
Verification per step: `npm run test` (or the named files), plus `npm run lint` and `npm run build`
at the end.

## Step 1 — timing constant in the seam

- Add `export const FLASH_DURATION_MS = 500;` to `components/useGame.ts` with a docstring in the
  `GRAVITY_INTERVAL_MS` style: feel/timing lives in the seam, and this must equal the globals.css
  `.flash` `--flash-duration` default (one source of truth).
- **Verify:** `npm run lint` clean; existing `useGame.*` tests unaffected. No behaviour change.
- **Commit:** `feat(useGame): add FLASH_DURATION_MS seam constant for clear flash`

## Step 2 — the latch hook + unit tests

- Create `components/useClearFlash.ts` per Structure: capture non-empty `clearedRows` into state,
  bump a `generation`, arm a `setTimeout(durationMs)` to reset to `[]`; cancel prior timer on
  re-fire and on unmount; ignore empty inputs (they must not cancel an in-flight flash).
- Create `components/useClearFlash.test.ts` with fake timers:
  1. idle → `{ rows: [], generation: 0 }`.
  2. non-empty input latches those rows, `generation` becomes 1.
  3. a subsequent empty-input render does **not** clear `rows` (latch holds).
  4. after `advanceTimersByTime(durationMs)`, `rows` → `[]`.
  5. a second non-empty input before expiry re-captures and bumps `generation` to 2; timer resets.
  6. unmount mid-flash → no pending timer, no act/setState-after-unmount warning.
- **Testing note:** use `vi.useFakeTimers()`/`vi.useRealTimers()` in `beforeEach`/`afterEach`;
  wrap `renderHook` rerenders and timer advances in `act`.
- **Verify:** `vitest run components/useClearFlash.test.ts` green.
- **Commit:** `feat(useClearFlash): latch transient clearedRows for full-duration flash`

## Step 3 — Board flash overlay channel + tests

- Modify `components/Board.tsx`:
  - Extract the shared grid style (`gridTemplateColumns/Rows`, `width`, `aspectRatio`) into one
    object; apply to both the cell grid and the overlay.
  - Add `flashRows: number[] = []`, `flashKey?: number` props.
  - Wrap output in a `relative` container; after the cell grid, when `flashRows.length > 0`, render
    an `absolute inset-0` overlay grid (same style + `gap-px p-2 pointer-events-none`), keyed by
    `flashKey`, containing one `data-flash-row` bar per index at `gridRow: y+1; gridColumn: 1 / -1`
    with classes `flash glow rounded-[2px]`.
  - Add the "Flash channel (T-007-06-02)" docstring paragraph.
- Create `components/Board.flash.test.tsx`:
  1. `flashRows={[3, 5]}` → exactly two `[data-flash-row]` nodes with values `"3"`,`"5"`, each
     className contains `flash`, style `gridRow` matches `y+1`.
  2. `[data-cell]` count stays `ROWS*COLS` (bars don't pollute the grid).
  3. no `flashRows` → zero `[data-flash-row]` nodes; the `relative` wrapper still renders the grid.
  4. bars carry neither `data-cell` nor `data-ghost`.
- **Verify:** `vitest run components/Board.test.tsx components/Board.flash.test.tsx` green
  (existing Board tests unchanged — additive props default off).
- **Commit:** `feat(Board): flash overlay channel for cleared rows`

## Step 4 — Cell compositor-only motion

- Modify `components/Cell.tsx`: append `motion` to the root className of all three branches; add the
  one-line docstring note (60fps compositor-only transition hook; background-color deliberately not
  transitioned).
- Optionally add one assertion to `Cell.test.tsx` that the rendered className contains `motion`.
- **Verify:** `vitest run components/Cell.test.tsx` green (asserted `bg-piece-*` substrings
  unaffected).
- **Commit:** `feat(Cell): compositor-only motion for smooth 60fps transitions`

## Step 5 — wire it in GameContainer

- Modify `components/GameContainer.tsx`:
  - Destructure `clearedRows` from `useGame()`.
  - Import `useClearFlash` and `FLASH_DURATION_MS`.
  - `const flash = useClearFlash(clearedRows, FLASH_DURATION_MS);`
  - Pass `flashRows={flash.rows} flashKey={flash.generation}` to `<Board .../>`.
  - Add the "Row-clear flash (T-007-06-02)" docstring paragraph.
- Modify `components/GameContainer.test.tsx`: add a light assertion that a freshly-rendered
  container shows **no** `[data-flash-row]` bars (idle) — guards against the overlay ever showing
  during normal play. (End-to-end clear→flash isn't deterministically reachable from the fixed seed;
  the mechanism is covered by Steps 2–3. Recorded as a coverage note in Review.)
- **Verify:** full `npm run test` green (game-over and pause rAF-pump blocks must still pass — the
  latch's `setTimeout` never arms because the default seed never clears).
- **Commit:** `feat(GameContainer): drive row-clear flash off latched clearedRows`

## Step 6 — full verification pass

- `npm run test` — entire suite green.
- `npm run lint` — `--max-warnings 0` clean.
- `npm run build` — vinext production build green (the AC's explicit "production build stays green").
- Optional manual/visual sanity via `/run` if time permits: confirm a real clear flashes (build a
  full row by play). Not gating — deterministic coverage is in the unit tests.
- **Commit (if any doc/tweak):** fold into Step 5 or a docs commit.

## Testing strategy summary

- **Unit (pure mechanism):** `useClearFlash` (timer/latch/generation lifecycle) and `Board` overlay
  (rendering, invariants) — the two pieces that carry the real logic, tested in isolation with fake
  timers and direct props. This is where correctness is pinned.
- **Integration:** existing `GameContainer` suite proves the wiring doesn't regress play/gravity/
  pause/game-over; the added idle-state assertion proves the overlay stays absent until a clear.
- **Static:** lint + `tsc` via build catch prop/type wiring errors across the seam.
- **Known coverage gap (to flag in Review):** no automated end-to-end "play until a line clears →
  bars appear" test, because GameContainer owns a fixed-seed `useGame` with no board-injection seam
  and the default seed never completes a row. Mitigated by unit coverage of both halves + optional
  manual verification.

## Rollback / risk notes

- Every step is additive and independently revertible; the pre-existing suite is the safety net.
- If the neutral flash tint reads poorly over the collapsed board, the only sanctioned adjustment is
  retuning existing `--flash-*` defaults in globals.css (no new CSS rules) — a Step 6 visual tweak.
