# Plan — T-004-01-01: per-tetromino-neon-color-tokens

Ordered, independently verifiable steps. The deliverable is one CSS block; most of the plan is
verification, because the acceptance criterion is specifically about *emission* and *distinctness*.

## Testing strategy

There is no unit-test harness in this repo (no test runner in `package.json`) and CSS tokens are
not unit-testable in isolation. Verification is therefore **build-based and grep-based**, which is
also exactly how the acceptance criterion is phrased ("emit into the production CSS build,
grep-verifiable") and how the prerequisite T-001-02-01 verified its bridge. Two checks map 1:1 to
the two acceptance clauses:

- **Emission check** (clause 1): production build + grep for all seven `--color-piece-*`, present
  in build / absent at baseline, each a distinct value.
- **Distinctness render check** (clause 2): throwaway swatch shows seven visibly distinct hues.

## Steps

### Step 1 — Baseline the absence
- `git stash` (or grep current build) to confirm no `--color-piece-*` exists in the emitted CSS
  today. Records the "absent at baseline" half of the criterion.
- Verify: grep of the current production chunk returns **zero** `--color-piece-` matches.

### Step 2 — Add the `@theme static` block
- Edit `app/globals.css`: append the block from `structure.md` after the `@theme inline` block —
  seven `--color-piece-{i,o,t,s,z,j,l}` oklch tokens + doc comment.
- Verify: file reads back with exactly seven `--color-piece-*` lines; hues match the Design table.

### Step 3 — Build + emission grep (committed state, no swatch)
- `npm run build` → must exit 0.
- Grep the emitted CSS chunk (`find .next/static -name '*.css'`) for each of the seven token
  names. **Commit-blocking:** all seven must be present. Confirm each resolves to a distinct
  value (7 unique oklch strings; sRGB fallbacks may also appear).
- This is the load-bearing check: it proves `@theme static` defeated tree-shaking with **no**
  component consumer, so the boundary holds.

### Step 4 — Throwaway swatch render proof
- Temporarily add a minimal probe under `app/` (e.g. a scratch `app/_swatch/page.tsx` or a
  transient block on `app/page.tsx`) rendering seven squares with `bg-piece-i … bg-piece-l`.
- `npm run build` (or `npm run dev`) and confirm the swatch compiles and the seven squares are
  visibly distinct hues (cyan/yellow/purple/green/red/blue/orange).
- **Revert the swatch fully** (`git checkout` / delete the scratch file) so the working tree is
  `globals.css`-only. Re-grep to confirm the seven tokens **still** emit without the swatch
  (they must, via `static`) — this is the proof the swatch was not load-bearing.

### Step 5 — Final gate on the swatch-free tree
- `npm run lint` → exit 0 (zero-warning gate; no TS/JS added, so should be trivially clean).
- `npm run build` → exit 0.
- `git status` shows only `app/globals.css` (+ `docs/active/work/**` artifacts) modified. No
  `components/`, `lib/`, or `app/*.tsx` changes.

### Step 6 — Commit
- Commit `app/globals.css` and the artifacts with a `feat(T-004-01-01):` message.

## Commit boundary

Single commit. The deliverable is atomic (one additive CSS block); there is no partial state worth
committing separately. Artifacts ride along in the same commit per the workflow.

## Rollback / risk

- **Risk:** a future Tailwind minor changes `static` semantics. *Mitigation:* the emission grep in
  Step 3 is the guard; if it ever fails, the build check catches it immediately.
- **Risk:** an oklch value lands too dark/muted to read as neon. *Mitigation:* Step 4's visual
  swatch catches it before commit; values are tunable in one place.
- **Rollback:** revert the single commit; nothing else depends on these tokens yet.

## Definition of done

All seven `--color-piece-*` tokens emit into the production build (present in build, absent at
baseline), each distinct; a throwaway swatch rendered seven distinct hues and was reverted; lint
and build pass on a tree whose only source change is `app/globals.css`.
