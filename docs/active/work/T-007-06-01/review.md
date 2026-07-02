# T-007-06-01 — Review: surface-cleared-rows

## Summary

Plumbed the cleared-row indices from the line-clear primitive through the reducer to the React seam,
so the render layer can flash the rows that cleared before the board collapses. Pure data plumbing:
no visual behavior (the flash/transition is the sibling **T-007-06-02**, which `depends_on` this).
`clearLines` already knew which rows were full but discarded the indices in a `filter`; the change
captures them and carries them as a transient per-frame value that pulses for exactly the clear frame.

AC met: the view/state surfaces the cleared-row indices for the clear frame, and a test asserts the
reported rows match the rows `clearLines` removed for a constructed full-row board. Full suite green
(257 tests), lint clean, production build green.

## Changes

| File | Action | Notes |
|------|--------|-------|
| `lib/line-clear.ts` | modified | `LineClearResult` gains `clearedRows: number[]`; body split from `filter` to an indexed `forEach`. Commit `feat(line-clear): …`. |
| `lib/line-clear.test.ts` | modified | +1 describe (5 cases) for cleared-row indices. |
| `lib/game.ts` | modified | `GameState` gains transient `clearedRows`; set on the clear frame, reset otherwise; `createInitialState` seeds `[]`. Commit `feat(game): …`. |
| `lib/game.test.ts` | modified | +1 describe (4 cases): initial empty, populated on clear, resets, empty on move. |
| `components/useGame.ts` | modified | `GameView` gains `clearedRows`; straight pass-through of `state.clearedRows`. Commit `feat(useGame): …`. |
| `components/useGame.clearedRows.test.ts` | created | 3 hook tests: empty start, reference-identity pass-through, core-mirror across a varied sequence. |

No changes to `scoring.ts`, `GameContainer.tsx`, `Board`, `Cell`, or any deploy artifact.

## Design fidelity

Matches design.md D1–D4:
- **D1** — additive `clearedRows` beside `cleared` (invariant `cleared === clearedRows.length`), so
  `scoring.ts` and the five existing `.cleared` assertions are untouched. Single-pass scan.
- **D2** — transient `GameState.clearedRows`: populated only on the clearing lock, reset to `[]` in
  every other constructive branch; both same-reference no-op gates (`gameOver`, `paused`) preserved.
- **D3** — surfaced flat on `GameView` as a no-memo pass-through of `state.clearedRows`.
- **D4** — three test levels; the `line-clear` test is the AC-primary one.

## Test coverage

- **`lib/line-clear.test.ts`** (AC-primary): `clearedRows` equals the removed-row indices for
  constructed full-row boards — adjacent (`[ROWS-2, ROWS-1]`), non-adjacent (`[17, 19]` with a
  survivor between), none (`[]`), all rows (`[0..ROWS-1]`), and the count invariant. Existing purity/
  collapse/dimension tests still pass, so the `filter`→`forEach` rewrite is behavior-preserving.
- **`lib/game.test.ts`**: the transient semantics — empty on a fresh game, `[ROWS-1]` on the frame a
  lock clears the bottom row, reset to `[]` on the next input, and empty on a non-clearing move.
- **`components/useGame.clearedRows.test.ts`**: the seam is a verbatim pass-through — reference
  identity with `state.clearedRows`, mirrored against an independent pure core step-for-step.

Coverage gap (intentional): no test drives a *clear through the hook itself*. `useGame` only accepts a
seed (no board injection) and hard-drops stack at spawn columns without filling a full width, so a
hook-level clear is unreachable without elaborate seed-specific choreography. The reference-identity
assertion proves pass-through for the populated case regardless, and the reducer test covers the clear
semantics directly on a constructed board. See progress.md for the deviation rationale.

## Open concerns / notes for the next ticket (T-007-06-02)

1. **Coordinate space (load-bearing).** `clearedRows` are indices in the **pre-collapse** board — the
   merged, just-locked board `clearLines` received — *not* the collapsed `view` that `useGame`
   returns. The animation must flash those rows against the pre-collapse geometry, but the surfaced
   `view` is already collapsed and re-overlaid with the next active piece. 06-02 will need to
   reconcile this: either render the flash from a retained pre-collapse snapshot, or map indices onto
   the old frame during the transition. This ticket deliberately surfaces indices only (per its AC);
   it does **not** surface the pre-collapse board. If 06-02 finds it needs that board too, that is a
   follow-up seam addition, not a defect here.
2. **One-frame pulse.** `clearedRows` is non-empty for a single `step`. A rAF-driven flash that
   outlives one tick must latch the value on the frame it appears (e.g. copy into an effect/animation
   state) rather than read it live, since the next dispatch resets it to `[]`.
3. **Simultaneous clear + game-over.** If the final lock both clears rows and tops out, the returned
   state carries a populated `clearedRows` *and* `gameOver: true`. That is intended (the last clear can
   still flash), but 06-02's overlay/animation ordering should expect the two to co-occur.

## Risk assessment

Low. Additive, framework-free change confined to the pure core plus a one-line seam pass-through; no
existing behavior altered (all prior tests green, including the same-reference no-op contracts); no
runtime UI or deploy surface touched. Nothing here needs human intervention before 06-02 proceeds.
