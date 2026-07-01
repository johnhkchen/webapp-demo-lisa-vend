# T-003-02-02 — Plan: ordered steps + test strategy

## Guiding facts

- Lock + line-clear already flow to screen via `view = overlayPiece(state.board, active)`; only
  game-over rendering + tick halt are net-new behavior.
- Loop halt uses the existing `active` param of `useAnimationFrameLoop`.
- Default seed tops out at tick **108**, `lines=0` — deterministic for the integration pump.

## Steps (each independently verifiable; commit after each)

### Step 1 — `GameOverlay` component + isolation tests

Create `components/GameOverlay.tsx` (props `visible`, `score`, `lines`; `null` when hidden;
`role="alert"`, "GAME OVER" heading, score/lines summary; plain Tailwind styling; module doc).

Create `components/GameOverlay.test.tsx`:
- renders nothing when `visible={false}` (`container.firstChild` is null; no `alert` role).
- when `visible`, exposes `role="alert"` and text matching `/game over/i`.
- shows the passed `score` and `lines` in the summary.

Verify: `npx vitest run components/GameOverlay.test.tsx` green.
Commit: `feat(T-003-02-02): add GameOverlay — observable game-over layer`.

### Step 2 — Wire game-over into GameContainer (halt + render)

Modify `components/GameContainer.tsx`:
- `const { state, view, dispatch } = useGame();`
- `useAnimationFrameLoop(() => dispatch("tick"), GRAVITY_INTERVAL_MS, !state.gameOver);`
- wrap in `<div className="relative">` with `<Board board={view} />` and
  `<GameOverlay visible={state.gameOver} score={state.score} lines={state.lines} />`.
- refresh the module doc comment (game-over now halts the loop + shows the overlay).

Verify: existing `components/GameContainer.test.tsx` still green (overlay hidden ⇒ DOM unchanged);
`npm run lint`.
Commit: `feat(T-003-02-02): halt gravity + show game-over overlay in GameContainer`.

### Step 3 — Game-over integration tests + render-reflects-clear guard

Modify `components/GameContainer.test.tsx`, adding a `describe("game-over / transitions")`:

1. **no overlay during normal play**: initial render → `queryByRole("alert")` null,
   `queryByText(/game over/i)` null, `cells(container)` length `ROWS*COLS`.
2. **overlay appears and tick halts**: install the stub-rAF pump (copy the idiom from
   `useAnimationFrameLoop.test.ts`: module-level `pending`, `frame(now)`, `beforeEach` stubs,
   `afterEach` unstub). Render, then in `act` pump frames at 800ms cadence until `/game over/i` is
   found, bounded (e.g. ≤ 400 frames). Assert overlay present. Snapshot `filledCoords`, pump ~5 more
   frames, assert `filledCoords` unchanged (loop halted) and overlay still shown.
3. **locked cells persist**: during the same pump (before top-out) or a separate bounded pump, assert
   the settled board carries non-active locked cells — i.e. filled coords exist that are not the
   current spawn (light check; the hook tests own the rigorous version, keep this minimal).
4. **render reflects a line clear** (pure render-path guard): import `clearLines` + `overlayPiece`;
   build a board whose bottom row is full, run `clearLines`, `overlayPiece` a spawned piece, assert
   the bottom row is now empty in the composed matrix. Proves the matrix handed to `Board` after a
   clear has the row gone (the default seed never completes a line, so this is the deterministic home
   for the clear AC).

Note: stubbing rAF only affects the new game-over test; keep it isolated in its own nested
`describe` with its own `beforeEach/afterEach` so the keyboard tests (which rely on real timing /
none) are unaffected.

Verify: `npm test` (all files) green; `npm run lint`; `npm run build`.
Commit: `test(T-003-02-02): cover game-over overlay, tick halt, clear render`.

## Testing strategy

- **Unit / isolation**: `GameOverlay` behavior (visible toggle, role, content) — no core coupling.
- **Integration**: `GameContainer` drives the real `useGame` + real loop via a deterministic rAF
  pump to a real top-out, asserting the observable end state and the halted tick — the closest
  automated proxy for the AC's "stacking to the top halts the gravity tick in an observable
  game-over state."
- **Render-path guard**: a pure `clearLines`→`overlayPiece` assertion documents that a cleared row
  disappears from what `Board` receives (the AC's "completed row visibly clears").
- **Regression**: existing 20 tests must stay green; the overlay's `null`-when-hidden guarantees the
  normal-play DOM is byte-identical to today.

## Verification checklist (Review inputs)

- [ ] `npm test` all green (existing 20 + new).
- [ ] `npm run lint` clean (max-warnings 0).
- [ ] `npm run build` succeeds.
- [ ] Overlay absent in normal play DOM; present + board frozen after top-out.
- [ ] No `lib/` changes; no rules reimplemented in components.
