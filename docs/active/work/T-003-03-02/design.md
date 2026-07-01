# Design — T-003-03-02 softdrop-harddrop-keys

## Decision summary

- **Hard-drop = new pure `lib/` transition + new `Input` variant.** Add `hardDrop(board, piece)`
  to `lib/movement.ts` (drop to resting position, **no lock** — consistent with `softDrop`). Add
  `"hardDrop"` to `Input`; `step` handles it by `descend({ ...state, active: hardDrop(...) })`,
  reusing the existing lock→clear→score→spawn pipeline.
- **Soft-drop = wire the existing `"softDrop"` input to a key, relying on OS key auto-repeat**
  (same mechanism the move keys already use). No new timing state, no second loop.
- **Keys:** `ArrowDown → "softDrop"`, `" "` (Space) → `"hardDrop"`. Hard-drop is **edge-triggered**
  (ignore `event.repeat`); soft-drop is repeat-driven.
- **No drop-distance scoring** this ticket — the AC doesn't require it and the core's documented
  "no drop score bonus" boundary stays intact.

## Question 1 — Where does hard-drop's "drop to bottom" live?

### Option A (chosen): `hardDrop(board, piece): Piece` in `lib/movement.ts`

Repeatedly apply the existing down-step until it no-ops, return the resting piece. Does **not**
lock — locking stays the reducer's job, exactly like `softDrop`.

```ts
export function hardDrop(board: Board, piece: Piece): Piece {
  let cur = piece;
  for (let next = softDrop(board, cur); next !== cur; next = softDrop(board, cur)) cur = next;
  return cur;   // already-resting piece ⇒ returns the input ref (no-op contract preserved)
}
```

- **Pro:** Movement is *the* translation-policy layer over `collides`; "furthest legal descent" is
  pure translation and belongs here beside `softDrop`. Reuses `softDrop`'s no-op contract as the
  loop terminator — no new collision logic.
- **Pro:** Keeps the lock/merge out of movement (movement never writes the board), matching the
  module's stated boundary. The reducer composes drop + lock.
- **Pro:** Trivially unit-testable in isolation (empty board → floor; stack → rest on top;
  already-resting → same ref).

### Option B (rejected): hard-drop entirely inside `lib/game.ts`

Inline the drop loop in `step`, calling `softDrop` (newly imported) directly.

- **Rejected:** `game.ts` is the composition root; adding a translation import + loop there
  duplicates movement's role and hides a reusable primitive (a ghost/landing-preview feature would
  want the same resting-position math). Keep the geometry in `movement.ts`, the wiring in `game.ts`.

### Option C (rejected): compute drop distance from column heights

Scan each occupied column for the highest obstacle and compute the landing row analytically.

- **Rejected:** Faster asymptotically but irrelevant at 10×20, and it reintroduces bespoke
  collision reasoning that `softDrop`/`collides` already own — a divergence risk. The iterative
  drop is O(rows), bounded and obviously correct.

## Question 2 — How does the reducer lock a hard-dropped piece?

**Chosen:** `case "hardDrop": return descend({ ...state, active: hardDrop(state.board, state.active) });`

`descend` already handles an already-resting piece: `applyGravity` sees `softDrop` return the same
ref → takes the `locked` branch → `lockPiece` merges → `clearLines` → `scoreFor` → `spawn` → sets
`gameOver` on a colliding spawn. So hard-drop reuses the **entire** lock pipeline with zero
duplication — line clears, scoring, spawn, and top-out all "just work". A zero-distance hard-drop
(piece already resting) still locks instantly, which is the correct instant-lock semantics.

Rejected alternative: call `lockPiece` + `clearLines` + spawn inline in the `hardDrop` case. That
re-implements `descend` and would drift from the gravity path. Composing through `descend` keeps a
single lock pipeline.

## Question 3 — Soft-drop: auto-repeat vs. an accelerated loop

### Option A (chosen): `ArrowDown → dispatch("softDrop")` on each keydown, via OS auto-repeat

Exactly mirrors how held left/right already produce continuous motion (T-003-03-01 chose this and
deferred DAS/ARR). Each repeat = one extra `descend`, layered on top of the independent gravity
tick — "composes cleanly with the rAF gravity tick" literally.

- **Pro:** Zero new state, zero new loop, one map entry. Consistent with the established input model.
- **Pro:** Soft-drop steps are just extra `descend`s; they can even trigger a lock+spawn mid-hold,
  which is correct Tetris feel.
- **Con (accepted):** OS auto-repeat has an initial delay (~0.3–0.5s) before it machine-guns, so the
  acceleration isn't perfectly uniform. Acceptable for a demo and identical to the move-key feel
  already shipped. Uniform ARR tuning is future work.

### Option B (rejected here, noted as future): accelerated gravity interval while held

Track an `ArrowDown`-held flag (keydown/keyup) and feed
`useAnimationFrameLoop(..., held ? SOFT_DROP_INTERVAL_MS : GRAVITY_INTERVAL_MS)`.

- **Rejected (for now):** Smoother, repeat-rate-independent acceleration and a clean reuse of the
  loop seam — but it adds held-state, a `keyup` listener, and a new constant for feel that the AC
  doesn't require. T-003-03-01 set the precedent of deferring timing polish; follow it. Documented
  as the natural follow-up if soft-drop feel needs tightening.

## Question 4 — Hard-drop must be edge-triggered (the key asymmetry)

Holding Space must **not** fire hard-drop every OS repeat — that would lock+spawn a new piece each
repeat and blow through the stack/top-out in a fraction of a second. So the listener must ignore
auto-repeat for hard-drop while **keeping** it for soft-drop.

**Chosen:** in `onKeyDown`, after resolving `input`, guard `if (input === "hardDrop" &&
event.repeat) { event.preventDefault(); return; }` before dispatching. Soft-drop and move keys keep
consuming repeats. `preventDefault` is still called (Space would otherwise scroll/activate). Only
one input is edge-only, so a single named guard is clearer than a general "repeatable set" table.

Rejected: filtering all `event.repeat` globally (kills soft-drop/move auto-repeat) or a separate
keyup-based "already dropped" latch (more state than a `.repeat` check needs).

## Question 5 — Drop-distance scoring

**Chosen: none this ticket.** Classic Tetris awards soft-drop +1/cell and hard-drop +2/cell, but
the AC is silent on score and `game.ts` explicitly documents "no soft-drop score bonus" as a
deferred boundary. Adding per-cell scoring now would also require threading drop distance out of
`hardDrop`/`descend` and revisiting the `softDrop`≡`tick` equivalence — scope the reducer already
fences off. Keep `"softDrop"`/`"tick"`/`"hardDrop"` score-neutral except for the line-clear award
that any lock already grants. Flag as an easy follow-up.

## Consequences

- `lib/movement.ts`: `+hardDrop`. `lib/game.ts`: `Input` gains `"hardDrop"`; `step` gains one case;
  imports `hardDrop`; scope/`Input` docs updated (hard-drop now exists; drop scoring still deferred).
- `components/GameContainer.tsx`: `KEY_TO_INPUT` gains `ArrowDown`/`" "`; one `event.repeat` guard;
  docs updated. `useGame.ts`: doc-only (dispatch already carries any `Input`).
- Tests: new `movement`/`game` unit cases for `hardDrop`; new GameContainer cases for ArrowDown,
  Space, held-Space-fires-once; the "ignores unmapped keys" case drops its `ArrowDown` assertion;
  an integration test that plays spawn→game-over by hard-drop alone proves the AC.
