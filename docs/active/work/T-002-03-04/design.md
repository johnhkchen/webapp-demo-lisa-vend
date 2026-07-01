# T-002-03-04 — Design: determinism-test-harness

## Goal

A vitest suite that asserts: two independent games from the same seed, driven by the same
input sequence, end in an identical state — board, score/lines/level, active piece, game-over
flag — and with their piece sources (bags) at the same position in the same stream. Plus a
divergence guard (different seeds ⇒ different outcome) so the assertion can actually fail.

## Key design problem: comparing states that carry a live bag

From Research: `GameState.bag` is a closure, so (a) whole-state `toEqual` fails on the `bag`
function reference, and (b) `step` mutates the bag, so a state must be run through the
sequence exactly once. Every option below is shaped by these two facts.

### Option A — Compare a bag-excluding projection, probe the bag separately (CHOSEN)

Define a `snapshot(state)` that returns everything *except* `bag`
(`{ board, active, score, lines, level, gameOver }`) and `toEqual` two snapshots. Then, for
the AC's "piece-sequence state" clause, draw the next K ids from each run's bag and `toEqual`
those two id arrays — proving both bags sit at the same point in the same stream.

- **Pros**: directly matches the three AC clauses (board, score, piece-sequence state);
  `toEqual` on a plain projection is exact and gives a readable diff; probing the bag is the
  most direct possible evidence that the id streams are aligned. No production change.
- **Cons**: the projection must be kept in sync if `GameState` grows a field — mitigated by
  deriving it from the state object and by a comment.

### Option B — Make the bag serializable, compare whole states

Refactor `bag.ts`/`game.ts` so the bag exposes its internal state as plain data, then
`toEqual` whole `GameState`s.

- **Pros**: one clean deep-equal; also unlocks save/replay.
- **Cons**: **out of scope** — `game.ts:28` explicitly defers "fully serializable RNG/bag"
  to a later ticket. This ticket is a *test harness to prove* an existing property, not an
  engine refactor. Rejected: changes production code the ticket doesn't ask for and couples a
  determinism proof to an unrelated redesign.

### Option C — Stringify states with a custom replacer and compare strings

`JSON.stringify(state, replacer)` dropping `bag`, compare strings.

- **Pros**: trivially excludes functions.
- **Cons**: string diffs are unreadable on failure; silent field-ordering fragility; no
  advantage over Option A's structured `toEqual`. Rejected on ergonomics.

### Option D — Only compare the two final `active.type`s + score (minimal)

- **Pros**: tiny.
- **Cons**: weak — a bug that corrupts settled board cells or mis-clears a line while leaving
  score coincidentally equal would pass. The AC explicitly wants the *board* deep-equal.
  Rejected as insufficient coverage of the keystone property.

**Decision: Option A.** It maps one-to-one onto the acceptance criterion, changes no
production code (honoring the scope boundary in `game.ts`), and produces the most legible
failure diffs. B is a future ticket; C/D are strictly worse than A.

## The driver

A single scripted `Input[]` run through both states via a `run(seed, script)` helper that
folds `step` over the script starting from `createInitialState(seed)`. The script is chosen
to be *eventful*: interleave `left`/`right`/`rotateCW`/`rotateCCW` with long runs of `tick`
so that **multiple pieces lock and respawn** (advancing the bag past a refill boundary, ≥ ~8
spawns) and **at least one row clears** (so scoring and line-clear are on the compared path).
The exact script content doesn't matter for correctness — only that it is identical for both
runs and exercises the interesting machinery.

## What gets asserted

1. **Deep-equal snapshot** — `expect(snapshot(a)).toEqual(snapshot(b))` after the full
   script. Covers board (AC clause 1), score + lines + level (clause 2), and active piece +
   gameOver.
2. **Bag parity** — draw next K (e.g. 14, two bags' worth) ids from each finished run's bag;
   `expect(idsA).toEqual(idsB)` (AC clause 3, "piece-sequence state"). Done last since it
   mutates the bags.
3. **Step-by-step convergence (strengthening)** — run both and compare the snapshot after
   *every* step, not just the end, so a divergence is caught at its first occurrence with a
   pinpointed step index. Cheap and dramatically improves diagnosability.
4. **Divergence guard** — a different seed yields a different final snapshot *or* a different
   bag probe (asserted `.not.toEqual` on at least the piece stream), proving the equality
   tests aren't vacuously true.
5. **Idempotent replay of a single state's laterals** — a light sanity check that a lateral
   input (no bag mutation) is a pure function: same state + same lateral ⇒ equal snapshot.

## Non-goals

- No production `lib/` changes. No serialization/replay format. No hard-drop/soft-drop
  scoring semantics. No level progression. These are later tickets per `game.ts` scope notes.
- Not a property-based/fuzzing harness — a fixed, eventful, human-readable script is enough to
  prove the keystone property and stays deterministic itself (no `Math.random` in the test).

## Risks & mitigations

- *State grows a new field later* → snapshot silently misses it. Mitigation: build the
  snapshot by explicit destructure with a comment tying it to `GameState`, so a new field is
  a visible, intentional decision.
- *Script terminates in game-over early* → still deterministic (no-op steps freeze both runs
  identically); the per-step comparison and bag probe remain valid. No mitigation needed, but
  pick a seed/script that gets through several spawns before any top-out.
