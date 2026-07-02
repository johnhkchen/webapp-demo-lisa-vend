# T-008-01-03 — Progress: choose-move-planner

## Status: complete

All plan steps executed in a single atomic commit. No deviations from `plan.md` / `design.md`.

## Steps

- [x] **Step 1 — `lib/bot.ts`** created (~95 lines w/ docstrings). `bestPlacement` (argmax over
  `evaluate(candidate.board)`, strict-`>` keep-first tie-break, `null` on empty), `inputsFor`
  (rotateCW ×k → shift ×dx → hardDrop), `chooseMove` (enumerate → best → inputs, `[]` when no
  candidate). Imports only from `lib/` — boundary honored.
- [x] **Step 2 — `lib/bot.test.ts`** created (~135 lines). Helpers `stateWith` / `play` /
  `expectedBest` / `jaggedBoard`; 6 tests across 4 describe blocks (enactment & legality,
  sane choices ×2, determinism & purity, no-legal-placement).
- [x] **Step 3 — verify.** `npx vitest run lib/bot.test.ts` → 6/6. `npm test` → **285 passed, 29
  files**. `npm run lint` → clean (`--max-warnings 0`). `npm run build` → succeeds (type-check
  passes; the vinext "Unknown route" note is the pre-existing static-analysis message, unrelated).
- [x] **Step 4 — commit** `19a71bb` (`feat(bot): compose seam + heuristic into chooseMove planner`)
  — `lib/bot.ts`, `lib/bot.test.ts`, and the T-008-01-03 artifacts.

## Deviations

None. The central board-equality-through-`step` assertion (Design Decision 5) worked as planned for
all seven piece types; no reachability blockage on the clear-topped test boards.

## Notes for review

- Block 2 (near-complete row): used a 1-wide well at `x = 9` on an otherwise-full bottom row, filled
  by a vertical `I` — asserts `final.lines === 1`, proving the completed-lines reward drives the
  choice through the direct (un-cleared) pass into `evaluate`.
- Block 3 (avoids holes): asserted both that the oracle's chosen board is the true max and that it
  adds no holes vs. the input, then that `chooseMove` enacts it.
- The empty-candidate case is exercised on a fully-filled board (`enumeratePlacements` → `[]` →
  `chooseMove` → `[]`).
