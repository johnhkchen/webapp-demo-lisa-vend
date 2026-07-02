# T-007-05-02 — Structure

The blueprint: file-level changes and the shape of each. Two source files modified, two
test files extended. No files created or deleted. `lib/` untouched.

## Modified: `components/GameOverlay.tsx`

Add a `mode` variant while keeping the game-over rendering byte-identical.

Props interface — add one optional field:

```ts
interface GameOverlayProps {
  visible: boolean;
  mode?: "gameOver" | "paused"; // default "gameOver" — preserves existing callers
  score: number;
  lines: number;
}
```

Component body:

- `if (!visible) return null;` — unchanged.
- Destructure `mode = "gameOver"`.
- Compute per-mode content: game-over → `role="alert"`, heading "GAME OVER", sub-text
  "Score {score} · Lines {lines}"; paused → `role="status"`, heading "PAUSED", sub-text
  "Press P to resume".
- Keep the shared wrapper classes (`absolute inset-0 flex flex-col items-center
  justify-center gap-3 rounded-lg bg-black/70 text-center backdrop-blur-sm`) and the heading
  gradient classes identical across modes — only `role`, heading text, and sub-text differ.
- Update the doc comment to note the overlay now serves both the terminal game-over and the
  resumable pause state, driven by `mode`.

Public interface change: additive and backward-compatible (`mode` optional). Existing
`<GameOverlay visible score lines />` call keeps rendering the game-over layer.

## Modified: `components/GameContainer.tsx`

Three edits, all local:

1. **Key map** — add pause to `KEY_TO_INPUT`:
   ```ts
   p: "pause",
   P: "pause",
   ```
   Update the record's doc comment to mention `p`/`P` = pause (edge-triggered like hard-drop).

2. **Loop gate** — extend the `active` argument at the `useAnimationFrameLoop` call:
   ```ts
   useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS,
     !state.gameOver && !state.paused);
   ```
   Update the adjacent comment to note the loop halts on pause as well as game-over.

3. **Auto-repeat guard** — fold `"pause"` into the existing edge-trigger guard so a held `P`
   doesn't flicker the overlay:
   ```ts
   if ((input === "hardDrop" || input === "pause") && event.repeat) {
     event.preventDefault();
     return;
   }
   ```

4. **Render** — add the pause overlay as a sibling of the game-over overlay inside the
   `relative` wrapper:
   ```tsx
   <GameOverlay visible={state.gameOver} score={state.score} lines={state.lines} />
   <GameOverlay visible={state.paused} mode="paused" score={state.score} lines={state.lines} />
   ```
   Mutually exclusive by construction (core can't pause once `gameOver`).

Update the top-of-file doc comment with a Pause (T-007-05-02) paragraph, matching the style
of the existing Game-over / Hold paragraphs: `P` toggles pause through the same dispatch
path; the loop is gated `!gameOver && !paused` so gravity truly halts; a `mode="paused"`
`GameOverlay` makes the frozen state observable; resume is clean because the loop's `active`
reset zeroes the accumulator.

No change to `useGame.ts` (dispatch is generic; `state.paused` already exposed) or
`useAnimationFrameLoop.ts` (the `active` seam already supports this).

## Modified: `components/GameOverlay.test.tsx`

Add cases (existing three unchanged):

- `mode="paused"` visible → `role="status"` present, text matches `/paused/i` and
  `/press p to resume/i`; no `role="alert"`.
- default mode (no `mode` prop) still renders `role="alert"` + "GAME OVER" (regression guard
  — covered by existing tests, but add an explicit "defaults to game-over" assertion).
- `mode="paused"` with `visible={false}` → renders null.

## Modified: `components/GameContainer.test.tsx`

Add a `GameContainer — pause` describe block reusing the deterministic rAF-pump idiom from
the existing `GameContainer — game over` block (stub `requestAnimationFrame`/
`cancelAnimationFrame`, capture `pending`, drive frames by hand). Cases:

- **P shows the pause overlay and halts the loop.** Pump a baseline frame, press `p`, assert
  the pause overlay (`role="status"`, `/paused/i`) is present and `pending === null` (no
  frame scheduled); pumping further frames does not change the board.
- **Second P resumes with no tick burst.** From paused, press `p` again; assert the overlay
  is gone, a frame is scheduled again, and the piece descends by exactly one row per
  `GRAVITY_INTERVAL_MS` (no accumulated backlog) — compare against the pure-core ground truth
  via `expectedAfter`.
- **Held P is ignored (edge-triggered).** Press `p`, then `p` with `repeat: true` twice;
  assert the overlay stays visible (odd number of *effective* toggles = 1) — i.e. repeats
  did not toggle it back off.
- **`P` (capital) parity** — capital `P` also pauses.
- **Pause is inert after game-over** (optional, cheap): once the game-over overlay is shown,
  pressing `p` does not add a pause overlay (core no-op) — asserts mutual exclusivity.

## Ordering

GameOverlay (component + its test) first — it is a leaf with no dependency on the container.
Then GameContainer (component + its test), which consumes the new `mode` prop. This lets each
step build and test in isolation. See plan.md.
