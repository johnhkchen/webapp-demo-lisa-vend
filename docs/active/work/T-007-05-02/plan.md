# T-007-05-02 — Plan

Ordered, independently-verifiable steps. Each step ends green (`npx vitest run` + relevant
files) and is a candidate atomic commit. `lib/` is not touched.

## Step 1 — GameOverlay: add the `mode` variant

- Edit `components/GameOverlay.tsx`:
  - Add `mode?: "gameOver" | "paused"` to `GameOverlayProps` (documented default gameOver).
  - Destructure `mode = "gameOver"`; branch `role` / heading / sub-text on it; keep wrapper
    + heading classes shared.
  - Update the doc comment to describe the two modes.
- Verify: `npx vitest run components/GameOverlay.test.tsx` — existing 3 tests still pass
  (default path unchanged).
- Commit: `feat(pause): add paused variant to GameOverlay`.

## Step 2 — GameOverlay tests

- Extend `components/GameOverlay.test.tsx`:
  - `mode="paused"` visible → `role="status"`, `/paused/i`, `/press p to resume/i`, no alert.
  - explicit default-mode game-over regression assertion.
  - `mode="paused"` hidden → null.
- Verify: `npx vitest run components/GameOverlay.test.tsx` green.
- Commit: `test(pause): cover GameOverlay paused variant`.

## Step 3 — GameContainer: wire the key, the loop gate, and the overlay

- Edit `components/GameContainer.tsx`:
  - Add `p`/`P` → `"pause"` in `KEY_TO_INPUT` (+ comment).
  - Fold `"pause"` into the `event.repeat` edge-trigger guard alongside `"hardDrop"`.
  - Extend the loop gate to `!state.gameOver && !state.paused` (+ comment).
  - Render a second `<GameOverlay mode="paused" visible={state.paused} … />` sibling.
  - Add a Pause paragraph to the top-of-file doc comment.
- Verify: `npx vitest run components/GameContainer.test.tsx` — all existing tests
  (movement, hard-drop repeat guard, game-over pump, hold) still pass; the render tree gains
  a null-rendering pause overlay during normal play, so `cells()` counts are unaffected.
- Commit: `feat(pause): bind P to toggle pause + gate rAF loop + show overlay`.

## Step 4 — GameContainer pause tests

- Add a `GameContainer — pause` describe block (rAF-pump idiom from the game-over block):
  1. `p` shows the pause overlay (`role="status"`, `/paused/i`) and halts the loop
     (`pending === null`); further pumped frames leave the board frozen.
  2. second `p` hides the overlay, re-schedules a frame, and descent continues one row per
     interval with no backlog burst — asserted against `expectedAfter(...)` ground truth.
  3. held `p` (`repeat: true`) is ignored — overlay stays after a press + two repeats.
  4. capital `P` parity.
  5. pause is inert once game-over (mutual exclusivity).
- Verify: `npx vitest run` (full suite) green.
- Commit: `test(pause): cover P toggle, loop halt, clean resume, repeat guard`.

## Step 5 — Full gate

- `npx vitest run` — entire suite green.
- `npm run lint` — zero warnings (`--max-warnings 0`).
- `npm run build` — production build passes (AC: "build stays green").
- If all green, work is done; write review.md.

## Testing strategy summary

- **Unit (component-level), no new integration harness needed.** GameOverlay is pure
  presentational → direct render assertions. GameContainer reuses the existing deterministic
  rAF pump (stubbed `requestAnimationFrame`) — no real timers, exact cadence, `pending` is
  the observable "is the loop scheduled" signal for halt/resume.
- **Ground-truth comparison, not reimplementation.** Resume-descent correctness is checked
  by feeding the same inputs/ticks through the pure core (`expectedAfter`) and comparing DOM,
  consistent with every existing container test.
- **Regression guard.** The game-over overlay and all existing key behaviors must remain
  green — they exercise the unchanged default `mode` and the unchanged non-pause dispatch
  paths.

## Verification criteria (maps to AC)

- Pressing P halts the falling loop → Step 4.1 (`pending === null`, board frozen).
- Shows a pause overlay → Steps 2 + 4.1 (`role="status"`, PAUSED).
- Pressing P again resumes descent from the frozen state → Step 4.2 (clean one-row-per-
  interval resume vs. core ground truth).
- Container/overlay tests cover the toggle → Steps 2 + 4.
- Build stays green → Step 5.

## Risks / notes

- Two `GameOverlay` instances both render `null` during normal play, so DOM footprint and
  `cells()` counts are unchanged — no existing assertion breaks.
- Using `role="status"` (not `alert`) for pause keeps `getByRole("alert")` game-over queries
  unambiguous; pause tests must query `role="status"` accordingly.
- `preventDefault()` on `P` is harmless (not a critical browser shortcut here).
