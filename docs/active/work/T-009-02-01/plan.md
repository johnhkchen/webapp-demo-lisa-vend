# T-009-02-01 — Plan: retone-piece-oklch-palette-for-clay

## Steps

### Step 1 — Edit the seven `--color-piece-*` values in `app/globals.css`

Replace the current `@theme static` block's seven `oklch(...)` literals with the Design-phase
values (Structure's "After" block), in one edit. All seven change together since they were
designed as a coherent set.

**Verify:** re-read the edited block, confirm all seven lines match Structure's "After" table
exactly (values and comment labels), confirm no other line in the file was touched (`git diff
app/globals.css` should show exactly these 7 value-line changes on top of the pre-existing
uncommitted diff, nothing new elsewhere).

### Step 2 — `npm run build`

**Verify:** exits 0. Confirms `@theme static` still parses/resolves and the build pipeline
(vinext) has no issue with the new oklch strings (same syntax shape as before — only the
numbers change — so this is a low-risk check, but it's cheap and catches typos like a missing
`)` or stray character).

### Step 3 — `npm run test`

**Verify:** same pass count as the pre-existing working-tree baseline (no test in this repo
asserts oklch/hex values — Research/Structure — so this step exists purely to catch an
unrelated regression, not to validate this specific change). Record the baseline count before
Step 1's edit and confirm it's unchanged after.

### Step 4 — `npm run lint`

**Verify:** clean, zero warnings/errors.

### Step 5 — Confirm resolved values via build output or dev server

Grep the compiled CSS output (or curl a running `npm run dev` instance's served
`globals.css`) for the seven `--color-piece-*` declarations and confirm each resolves to the
new oklch string, not the old one. This directly checks the AC's "measurably lower... when
checked against the pre-change values" clause against the actual build artifact, not just the
source file.

### Step 6 — Visual sanity check

Start `npm run dev`, load the page in a way that renders at least one of each of the seven
piece colors (the simplest available surface: `NextPreview`/`HoldBox` render pieces
independent of active gameplay state, so a fresh page load should show several piece colors
without needing to play). Confirm by eye: (a) the seven pieces still look like seven distinct
colors against the cream/clay background, (b) none of them reads as jarring/neon anymore
relative to the surrounding clay surfaces. This is the qualitative half of the AC
("visually distinguishable," "read correctly on cream clay") that no automated check covers
(Structure).

If step 6 surfaces a piece that reads poorly (e.g., two pieces look too similar, or one still
looks neon/one looks too washed-out), adjust that piece's chroma/lightness by a small delta
and re-run steps 2-6 — do not silently accept a value that fails the eyeball check just because
it passed build/test/lint.

## Testing strategy

No new automated tests are added (Structure: no established pattern for asserting resolved CSS
custom-property values in this repo, and the AC is a designed-value comparison, not a behavioral
one). Verification is:
- **Regression coverage**: existing `npm run test` suite, confirming this change breaks nothing
  (all existing coverage is class-name-based, not value-based, so this is a smoke check).
- **Build coverage**: `npm run build` + grep of compiled output, confirming the new values
  actually reach the shipped artifact.
- **Manual/qualitative coverage**: Step 6, the only check that can validate "reads correctly on
  cream clay" and "visually distinguishable," since those are perceptual judgments outside what
  a unit test can assert.

## Commit boundary

This is a single atomic change (Structure: one file, one block, seven values designed as a
set) — one commit at the end of Implement, not staged incrementally per-piece. The commit
message should note this also finishes work an earlier, uncommitted, undocumented edit had
partially started (per Research's "two baselines" finding), so history reflects what actually
shipped rather than implying the retone happened in one shot from the original neon set.

## Risks / rollback

Lowest-risk category of change in this codebase: pure CSS custom-property value edits, no
logic, no consumer touched, confirmed zero test coverage of the specific values (so nothing to
break in a way `npm run test` would catch, but also nothing that could regress behaviorally).
Rollback, if ever needed, is reverting the single commit — no migration, no data, no API
surface involved.
