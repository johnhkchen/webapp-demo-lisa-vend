# T-007-05-02 — Review

Ticket: **pause-key-and-overlay**. Bind `P` to toggle pause, halt the rAF gravity loop while
paused, and show a pause overlay (via `GameOverlay`) that resumes descent cleanly. Handoff doc.

## What changed

All changes are in the React seam (`components/`); `lib/` is untouched (the pure pause core
landed in T-007-05-01). No files created or deleted.

### `components/GameOverlay.tsx` (modified)

- Added `mode?: "gameOver" | "paused"` (default `"gameOver"`). `"gameOver"` renders exactly the
  prior markup — `role="alert"`, "GAME OVER", "Score N · Lines N" — so every existing caller and
  test is unaffected. `"paused"` renders `role="status"`, "PAUSED", "Press P to resume".
- The dimmed-layer chrome and heading gradient are shared across modes; only `role`, heading, and
  sub-text differ. `role="status"` (polite) vs. `alert` (assertive) reflects that pause is a
  user-initiated, non-urgent, resumable state — and keeps `getByRole("alert")` game-over queries
  unambiguous.

### `components/GameContainer.tsx` (modified)

- `KEY_TO_INPUT` gains `p`/`P` → `"pause"` (case parity matching `c`/`C`, `x`/`X`, `z`/`Z`).
- Gravity loop gate widened from `!state.gameOver` to `!state.gameOver && !state.paused`, so the
  loop genuinely stops scheduling frames while paused (not merely no-oping `step`).
- `"pause"` folded into the existing `event.repeat` edge-trigger guard alongside `"hardDrop"`, so a
  held `P` does not rapidly flip the overlay.
- A second `<GameOverlay mode="paused" visible={state.paused} … />` sibling in the `relative`
  wrapper. `paused` and `gameOver` are mutually exclusive at the core level, so at most one shows.

### Tests (modified)

- `components/GameOverlay.test.tsx`: +3 cases (paused status banner + resume hint; default-mode
  regression; hidden-paused null). 6 pass.
- `components/GameContainer.test.tsx`: new `GameContainer — pause` describe, +5 cases. 26 pass.

## Test coverage

Full suite: **236 passed / 23 files.** Lint clean (`--max-warnings 0`). `npm run build` green
(AC: "build stays green").

AC → coverage:

- *Pressing P halts the falling loop* → `P shows the pause overlay and halts the gravity loop`
  asserts `pending === null` (no rAF scheduled) via the deterministic pump, and that further pumped
  frames leave the board frozen.
- *Shows a pause overlay* → covered in both the GameOverlay unit test (`role="status"` + PAUSED +
  resume hint) and the container test.
- *Pressing P again resumes descent from the frozen state* → `a second P … resumes descent one row
  per interval — no catch-up burst` re-schedules a frame and asserts exactly one tick after one
  interval, compared against the pure-core `expectedAfter("tick")` ground truth. This is the
  clean-resume guarantee: the loop's `active` reset zeroes the accumulator, so no banked backlog
  drops the piece multiple rows on unpause.
- *Container/overlay tests cover the toggle* → GameOverlay variant tests + the pause describe block
  (toggle on/off, held-key guard, capital-P parity, inert-after-game-over).

Additional guards: held-`P` auto-repeat ignored; capital `P` parity; pause is a no-op once
game-over (no pause banner stacks on the terminal alert).

## Design rationale (recap)

- **Reused the `active` seam** on `useAnimationFrameLoop` rather than adding a pause-specific timer.
  The seam was documented for exactly this and its false→true reset (`last=null`/`acc=0`) is what
  makes resume backlog-free. One-line gate change, no new machinery.
- **`mode` enum on `GameOverlay`** over a second component (would duplicate chrome and contradict
  the AC's "via GameOverlay") or twin booleans (admit nonsense states).
- **Edge-triggered pause** (repeat-guarded) because a toggle is edge-triggered by nature, like
  hard-drop's lock — the one deliberate deviation from "movement keys ride auto-repeat".

## Open concerns / limitations

- **No pause on window blur / tab hidden.** Pause is P-key-only; switching tabs does not auto-pause.
  Out of scope for this ticket; a `visibilitychange`-driven auto-pause would be a small follow-up.
- **`score`/`lines` remain required props** on `GameOverlay` even though the pause variant ignores
  them. Kept required to avoid churning the game-over call sites; a future refactor could make the
  summary a discriminated-union prop if a third variant appears.
- **No visual polish** (neon/glass juice) on the pause banner — deliberately plain, consistent with
  the game-over overlay's E-003 scope boundary; the animated treatment is E-004's.
- Not driven in a real browser this session; behavior is verified through the jsdom deterministic
  rAF pump and the pure-core ground-truth comparison, which exercise the halt/resume/toggle paths
  end-to-end at the component seam.

No critical issues flagged for human attention.
