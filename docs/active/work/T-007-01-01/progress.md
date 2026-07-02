# Progress — T-007-01-01 seven-bag-lookahead-peek

## Status: implementation complete, all tests green

## Completed

- **Refactor + feature (combined into one commit).** `lib/bag.ts`:
  - Renamed internal `queue` → `buffer`; added private `ensure(n)` that grows the buffer by
    appending fresh shuffled bags until `buffer.length >= n`. `ensure` is the sole consumer of
    `rand`.
  - `next()` → `ensure(1); buffer.shift()!` (behavior-preserving; same per-bag shuffle cadence).
  - Added `peek(n)` to the `SevenBag` interface and implementation:
    `n <= 0 ? [] : (ensure(n), buffer.slice(0, n))` — returns a copy.
  - Updated module + interface doc comments to document non-consuming lookahead and the
    single-generation-path guarantee.
- **Tests.** `lib/bag.test.ts` — new `describe("SevenBag.peek")` with 6 cases: peek/next agreement
  across `SEEDS × n∈0..21` (crosses 7/14/21 refill boundaries), non-mutation vs a never-peeked
  sibling, interleaved peek-after-draw agreement, idempotence, `n<=0 ⇒ []`, and copy-safety.
- **Verification.**
  - `npx vitest run lib/bag.test.ts lib/determinism.test.ts lib/game.test.ts` → 28 passed.
  - `npm run lint` → clean (`--max-warnings 0`).
  - `npx vitest run` (full suite) → 18 files, 169 tests passed.
- **Commit:** `97972dd feat(bag): add non-consuming peek(n) lookahead`.

## Deviations from plan

- Plan sequenced three commits (refactor / feat / test). Collapsed into **one** commit because the
  buffer refactor is only meaningful together with `peek` and the tests that exercise it; splitting
  would have committed a refactor with no observable behavior change and no new test. Low blast
  radius (two files), so a single atomic commit is cleaner. No change to the design or scope.

## Remaining

- None for this ticket. Wiring `peek` into the next-preview UI is downstream E-007 work, explicitly
  out of scope here (see `design.md` → "Why not add peek to game.ts now").
