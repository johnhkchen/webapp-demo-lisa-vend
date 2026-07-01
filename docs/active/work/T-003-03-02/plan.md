# Plan — T-003-03-02 softdrop-harddrop-keys

Four commit-sized steps, each independently verifiable (`vitest run` + `tsc`/`eslint`). Ordered
core-up: pure primitive → reducer → React seam → docs.

## Step 1 — `lib/movement.ts`: `hardDrop` primitive

**Change:** add exported `hardDrop(board, piece): Piece` (loop `softDrop` until same-ref; return
resting piece). Update the scope-boundary comment (hard-drop placement now here; lock still the
reducer's).

**Tests (`lib/movement.test.ts`):**
- empty board → rests on floor (max occupied `y === ROWS-1`).
- settled stack in a column → rests one row above the top obstacle.
- already-resting piece → returns the **same reference** (`toBe`).
- input board not mutated.

**Verify:** `npx vitest run lib/movement.test.ts` green; `npx tsc --noEmit` clean.
**Commit:** `feat(T-003-03-02): add hardDrop placement to movement`.

## Step 2 — `lib/game.ts`: `"hardDrop"` input + reducer case

**Change:** import `hardDrop`; add `"hardDrop"` to `Input`; add
`case "hardDrop": return descend({ ...state, active: hardDrop(state.board, state.active) });`.
Update `Input` doc + module scope note (hard-drop done; drop-distance scoring still deferred).

**Tests (`lib/game.test.ts`):**
- from spawn, `step(_, "hardDrop")` → 4 settled cells + fresh active above stack, `gameOver` false.
- hard-drop equals ticking to lock: build a state, compare `step(s,"hardDrop")` board/score/lines
  against a helper that `step`s `"tick"` until the first lock (settled-cell count goes 0→4).
- hard-drop completing a bottom row (via `fillRowExcept`) clears it and awards `scoreFor(1,1)=40`.
- `gameOver` state → `step(ended,"hardDrop")` returns the input ref (no-op).

**Verify:** `npx vitest run lib/game.test.ts` green; `tsc` clean; `step` switch still exhaustive.
**Commit:** `feat(T-003-03-02): wire hardDrop input into step reducer`.

## Step 3 — `components/GameContainer.tsx`: keys + edge guard + AC integration

**Change:** `KEY_TO_INPUT` gains `ArrowDown: "softDrop"`, `" ": "hardDrop"`. Add the
`input === "hardDrop" && event.repeat` guard (preventDefault + return) before the dispatch. Update
the module doc (drop keys now wired: ArrowDown soft/repeat, Space hard/edge).

**Tests (`components/GameContainer.test.tsx`):**
- `ArrowDown` ⇒ `expectedAfter("softDrop")`.
- Space (`{key:" "}`) ⇒ `expectedAfter("hardDrop")`.
- held Space (`{key:" "}` then `{key:" ", repeat:true}`) settles exactly one piece (4 settled DOM
  cells, not 8).
- edit "ignores unmapped keys": remove the `ArrowDown` line (now mapped); keep `Enter`.
- **AC:** fire Space in a bounded loop (≤ ~ROWS*… safety bound) until the board tops out; assert the
  game reaches game-over — proves keyboard-only spawn→over. Detect over via the board no longer
  changing / a fresh spawn overlapping settled cells; keep the loop bounded like `tickUntilGameOver`.

**Verify:** `npx vitest run components/GameContainer.test.tsx` green (jsdom env).
**Commit:** `feat(T-003-03-02): map ArrowDown soft-drop + Space hard-drop keys`.

## Step 4 — docs seam

**Change:** `components/useGame.ts` scope paragraph — soft/hard-drop now flow through `dispatch`
(no code change).

**Verify:** full `npx vitest run` green; `npx eslint .` (repo `--max-warnings 0`) clean on touched
files; `npx tsc --noEmit` clean.
**Commit:** `docs(T-003-03-02): note soft/hard-drop wired through dispatch`.

## Testing strategy

- **Unit (`lib/`):** `hardDrop` geometry + no-op contract (movement); reducer lock/clear/score/
  spawn/game-over + the "hard-drop ≡ tick-to-lock" equivalence (game). These carry correctness.
- **Component/integration (jsdom):** the key→dispatch→step→repaint path for both drop keys, the
  edge-trigger guard, and the spawn→game-over AC playthrough.
- **Not retested:** line-clear/scoring/spawn internals (owned by `lib/line-clear`, `lib/scoring`,
  `lib/game` gravity tests); soft-drop descent geometry (identical to the covered tick path).

## Verification criteria (AC)

> Holding down accelerates descent; the hard-drop key instantly drops+locks; a stranger can play
> one uninterrupted game spawn→game-over by keyboard alone.

- ArrowDown adds descent steps on top of gravity (auto-repeat) — soft-drop case + move-key-repeat
  precedent.
- Space instantly drops+locks+spawns (hardDrop case + Space component test), once per press
  (edge guard test).
- The AC integration test plays to game-over with Space only.

## Risks / mitigations

- **Held Space machine-guns pieces** → `event.repeat` guard + explicit "fires once" test.
- **`hardDrop` off-by-one (rest position)** → movement tests pin floor and on-stack rest rows.
- **jsdom Space keycode** → assert via `{ key: " " }` (the mapped table key), not `keyCode`.
- **Divergence from gravity path** → the "hard-drop ≡ tick-to-lock" equivalence test.
