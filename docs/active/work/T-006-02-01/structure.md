# Structure — T-006-02-01

## Shape of the change

This is a verification-gated ticket. Given the all-green `vinext check` observed in
Research/Design, the structural footprint is **zero source files created, modified, or
deleted**. The "structure" here is therefore the structure of the *verification and its
evidence*, plus the contingency structure that would apply had findings surfaced.

## Files — actual (all-green path)

### Created
- `docs/active/work/T-006-02-01/research.md`
- `docs/active/work/T-006-02-01/design.md`
- `docs/active/work/T-006-02-01/structure.md` (this file)
- `docs/active/work/T-006-02-01/plan.md`
- `docs/active/work/T-006-02-01/progress.md`
- `docs/active/work/T-006-02-01/review.md`

### Modified
- **None.** No `app/`, `components/`, `lib/`, or config file is touched.

### Deleted
- `dist/` — transient build output from the verification `vinext build`, removed so the
  working tree stays clean. Not tracked; not a source deletion.

## Invariants this ticket must preserve

1. **`lib/` byte-for-byte unchanged.** All 14 logic modules + their tests untouched.
2. **Render logic unchanged.** `app/layout.tsx`, `app/page.tsx`, every `components/*.tsx`
   untouched.
3. **No new runtime dependencies.** vinext + Vite deps already landed in T-006-01-01/02.
4. **`git diff` over source is empty.** The only additions are docs artifacts under
   `docs/active/work/T-006-02-01/`.

## Contingency structure (had `check` surfaced findings)

Documented so the ticket is reproducible and the triage policy (design Decision 2) has a
concrete target shape. None of this is executed on the observed all-green path.

- **Config/framework-glue fix** would land in exactly one of:
  - `vite.config.ts` — a plugin option or resolve tweak, or
  - `next.config.ts` — a compat flag, or
  - `package.json` — a field/dep adjustment.
  These are the only files eligible for edits under the AC's "config-only" fence.

- **Split-out signal** (finding needs real code change) would land as a new file under
  `.lisa/signals/` describing the finding, the offending App Router usage, and why it can't
  be absorbed here. Code stays untouched; the signal becomes a follow-up ticket source.

## Public interfaces / boundaries

Unchanged. The App Router boundary (`app/` server components → `"use client"` game shell →
pure `lib/`) is exactly as it was. vinext resolves this boundary at build time; the ticket
confirms the resolution, it does not reshape it.

## Ordering

1. Run `vinext check` (gate) — done in Research.
2. Corroborate with `vinext build` + `vitest run` — done in Research.
3. Apply triage policy to findings — no findings, so no fixes.
4. Remove `dist/` verification artifact.
5. Write artifacts (this phase set) + Review.

No inter-file ordering constraints exist because there are no code edits.
