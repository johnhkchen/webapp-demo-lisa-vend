# Review — T-002-02-03: SRS rotation with wall kicks

## What changed

Two new files, purely additive (no existing files modified):

- **`lib/rotation.ts`** (~150 lines) — SRS rotation policy for the pure game core.
  - `RotationDir = "cw" | "ccw"`.
  - `KICKS_JLSTZ`, `KICKS_I`, `KICKS_O` — the three SRS kick tables, keyed by `"from>to"`, holding
    the 8 ±90° transitions. Offsets are stored in the engine's **y-down** frame (published tables
    are y-up; every y is negated, with the y-up source in a trailing comment on each row).
  - `rotate(board, piece, dir)` — computes the target state (`+1 & 3` CW, `+3 & 3` CCW), walks the
    kick list, and returns a **fresh** `Piece` at the first non-colliding candidate, or the
    **input reference** unchanged if all kicks collide (the repo's no-op contract).
  - `rotateCW` / `rotateCCW` — thin wrappers, parallel to `moveLeft`/`moveRight`.
- **`lib/rotation.test.ts`** (~230 lines) — table-driven vitest.

Commit: `d511cd2`.

## How it meets the acceptance criterion

> Tests cover the canonical SRS wall-kick cases (incl. I-piece and T-spin corner kicks): a blocked
> rotation resolves to the correct kicked position, and a fully blocked rotation is rejected.

- **Blocked rotation → correct kicked position**: three exact-position cases (T left-wall kick via
  test 2, T floor kick via test 3, I right-wall kick via test 2), plus the T-spin double. Each case
  first asserts that the *naive* rotation (test 1, `(0,0)`) genuinely `collides`, so the test proves
  a kick occurred rather than an incidentally-legal in-place turn — then asserts the exact
  `rotation` + `position` and that the resolved placement is collision-free.
- **I-piece**: dedicated `KICKS_I` table and the right-wall kick case exercise the ±2 offsets.
- **T-spin corner kick**: the TSD case seeds two settled blocks so kick tests 1–4 each collide and
  only test 5 (`(-1, +2)` in y-down) fits; asserts the T lands at `(3,7)` in state 1. The test also
  independently verifies tests 1–4 collide and test 5 does not.
- **Fully blocked → rejected**: a full board carved to exactly the T's footprint makes every
  candidate overlap a filled cell; `rotate` returns the same reference (`toBe(piece)`) for both
  directions.

## Test coverage

`npm run test` → **90 passed** across 8 files (up from 76; the new suite adds 14 cases without
touching the others). Groups: kick-table shape (keys/lengths/`(0,0)` first); open-space cycle +
CW/CCW inverse; wall/floor/I kicks; T-spin double; fully-blocked no-op; O invariance; non-mutation
(JSON snapshots on both success and no-op paths). `npm run lint` clean; `npm run build` (incl. TS)
passes.

### Worked kick fixtures (for the reviewer to spot-check)

- **T 1→2 left wall**: piece state 1 at `(-1,1)`; test 1 `(0,0)` clips `x<0`; test 2 `(+1,0)` →
  `(0,1)`. ✓
- **T 0→1 floor**: piece state 0 at `(4,18)`; tests 1–2 poke below floor; test 3 `(-1,-1)` →
  `(3,17)`. ✓
- **I 1→2 right wall**: piece state 1 at `(7,0)`; test 1 clips `x≥10`; test 2 `(-1,0)` → `(6,0)`. ✓
- **T-spin double 0→1**: blocks at `(5,7)`,`(4,5)`; tests 1–4 collide; test 5 `(-1,+2)` → `(3,7)`. ✓

## Correctness notes / the main risk

The dominant risk on this ticket was the **y-sign convention**: SRS tables are published y-up, this
engine is y-down. Mitigations in place: (1) offsets are negated once, in the constants, with the
y-up source inline for audit; (2) every kick test asserts an *exact* position, so a sign flip fails
loudly instead of silently mis-kicking; (3) the shape tables were confirmed to be standard SRS
spawn/CW (the existing `tetrominoes.test.ts` oracle proves the CW chain), so the published tables
apply directly.

## Open concerns / limitations (all out of scope, no action needed here)

- **No 180° rotation.** Only ±90° single steps are supported (guideline standard). If a "flip"
  feature is added later, `KICKS_*` would need the `0↔2`/`1↔3` entries (they are intentionally
  absent now).
- **T-spin *detection/scoring* is not here.** This ticket delivers the kick *geometry* only;
  recognizing a T-spin for scoring is a later scoring ticket.
- **No wiring into a game loop.** `rotate` is a pure function; hooking it to keyboard input and the
  React state lives in the rendering/input tickets, not the `lib/` core.
- **O `rotation` field advances** on rotate even though cells are identical. Harmless and
  consistent (kept uniform through the same code path); a renderer keying purely off cells is
  unaffected.

## Handoff

Nothing blocks review. The module is self-contained, pure, and framework-free; a reviewer can
verify correctness from the four worked fixtures above against the `KICKS_*` tables without running
the game.
