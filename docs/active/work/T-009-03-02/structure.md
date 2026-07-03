# T-009-03-02 — Structure: cell-empty-state-clay-retone

## Files touched

### Modified

- **`components/Cell.tsx`**
  - Empty-square branch (currently lines 83–88): className literal changes from
    `"motion rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5"` to
    `"motion rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10"`.
  - No prop, interface, branch structure, or logic change. `data-cell="empty"` unchanged.
  - `CELL_COLOR`, `GHOST_COLOR`, and the settled/ghost branches (lines 30–81) are untouched.
  - File doc comment (lines 1–29): the block above `CELL_COLOR` describes settled/ghost color
    sourcing but does not currently describe the empty branch's fill at all — no existing prose
    references `bg-white/5`, so no comment correction is required. No new comment needed either:
    the className is self-describing (`bg-foreground/5` reads as "faint ink tint" without
    explanation), consistent with the project's "no comment unless the WHY is non-obvious"
    convention.

### Created (this RDSPI pass only — no other new files)

- `docs/active/work/T-009-03-02/research.md` (done)
- `docs/active/work/T-009-03-02/design.md` (done)
- `docs/active/work/T-009-03-02/structure.md` (this file)
- `docs/active/work/T-009-03-02/plan.md`
- `docs/active/work/T-009-03-02/progress.md`
- `docs/active/work/T-009-03-02/review.md`

### Explicitly not touched

- `components/Board.tsx`, `components/HoldBox.tsx`, `components/NextPreview.tsx`,
  `app/globals.css`, `styles/vendor/b28-clay.css` — no code change in any of these; Design ruled
  out both a new theme token and reuse of the `.clay-well` primitive at cell scale.
- `components/Cell.test.tsx`, `components/Board.test.tsx`, `components/Board.flash.test.tsx` —
  no test file requires editing (Research confirmed no test pins the specific fill class
  string); these are re-run as a regression check only, not modified.

## Module boundaries / interfaces

No interface changes. `Cell`'s props (`CellProps`: `cell`, `ghost`) and its render contract
(`data-cell`, `data-ghost`, one `<div>` per call) are identical before and after. This is a
leaf-level, presentation-only className substitution — the same shape as `T-009-04-01`'s
`GameOverlay.tsx` retone (single file, className-only, no test file touched).

## Ordering

Single-file, single-hunk change — no ordering concerns between files. Within the RDSPI pass:
Structure → Plan → Implement (edit `Cell.tsx`, then run tests) → Review. No intermediate
commits needed before the final one; this is small enough for one atomic commit covering the
component edit plus all six RDSPI artifacts, mirroring how `T-009-04-01` and `T-009-02-01`
landed (one `feat(...)` commit for the code, one `docs(...)` review-artifact commit — checked
via `git log`, both tickets committed their `feat` change and its `review.md` separately).

## Verification surface

- `npm test -- --run components/Cell.test.tsx components/Board.test.tsx components/Board.flash.test.tsx`
  — the three files the AC and Research identify as touching this render path.
- Full `npm test` as a repo-wide regression check (matches `T-009-04-01`'s review.md practice of
  running the whole suite, not just the named files).
- `npm run lint` — `eslint --max-warnings 0`, matches prior ticket practice.
- No dev-server visual check is planned as a blocking step (no browser-automation tool available
  in this session, same limitation `T-009-04-01`'s review.md flagged) — will be noted as an open
  concern in `review.md` per that precedent, not treated as a blocker to finishing the ticket.
