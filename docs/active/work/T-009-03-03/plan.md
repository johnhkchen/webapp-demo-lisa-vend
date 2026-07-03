# T-009-03-03 — Plan: hold-box-raised-clay-tile

## Steps

### Step 1 — Retone the panel container to `.clay-chip`

Edit `components/HoldBox.tsx`'s panel `<div>` className (Structure §1):
`` `flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl ${canHold ? "" : "opacity-40"}` ``
→ `` `clay-chip flex flex-col gap-2 p-2 ${canHold ? "" : "opacity-40"}` ``

**Verify:** `HoldBox.test.tsx`'s two dim-state tests (`toContain("opacity-40")` /
`.not.toContain(...)`) still pass — they assert only on `opacity-40`'s presence, unaffected by
the surrounding class swap.

### Step 2 — Retone the 'Hold' label to the ink token

Edit the `<span>` className (Structure §2): `text-white/50` → `text-foreground/70`.

**Verify:** no test asserts on label className; visual check only (Step 6).

### Step 3 — Retone the blank mini-grid squares

Edit the blank-square branch (Structure §3): `bg-white/5` → `bg-foreground/5 ring-1 ring-inset
ring-foreground/10`.

**Verify:** none of the `data-hold` count/placement tests touch the blank-square branch's
className (they query `[data-hold]` only, which the filled branch carries, untouched).

### Step 4 — Full-file grep for the forbidden strings

Run `grep -nE "border-white/10|bg-white/5|shadow-2xl" components/HoldBox.tsx` and confirm zero
matches — the AC's literal bar.

### Step 5 — Run the test suite

`npm test -- HoldBox` (or the full `npm test`) — expect all seven `HoldBox.test.tsx` cases green,
no changes needed to the test file (Structure).

### Step 6 — Visual spot-check

Start `npm run dev`, hold a piece, and confirm: the panel reads as a light, raised clay tile
(catches top-left highlight, warm drop-shadow) rather than a dark glass panel; the 'Hold' label
is legible ink-on-clay; blank slot squares show a faint warm recess, not a stark white or invisible
fill; the `canHold=false` dim state (`opacity-40`) still visibly dims the whole tile. Compare
side-by-side against `Board`'s already-retoned `.clay-well` and `GameOverlay`'s banner for family
consistency (this is a manual/subjective check, not a new automated test — no test infra exists
for visual comparison in this repo, consistent with how T-009-03-01/T-009-04-01 verified
themselves).

## Testing strategy

- **Unit:** `HoldBox.test.tsx`, unmodified, is the full automated coverage for this ticket — it
  already exercises every state this change touches (dim/undim, every piece type, empty slot) via
  className/dataset assertions that don't pin the chrome classes being replaced. No new test is
  needed: there is no new *behavior* here (no new prop, no new conditional logic), only a chrome
  substitution, and Research confirmed the existing suite already asserts the right invariants
  (dim state, `data-hold` shape) around it.
- **Integration:** none applicable — `HoldBox` has no cross-component data flow affected by this
  change (`GameContainer.tsx`'s usage is untouched, Structure).
- **Visual:** manual dev-server check only (Step 6), matching precedent from sibling clay-retone
  tickets (T-009-03-01, T-009-04-01) which had no automated visual assertions either.

## Commit plan

Single atomic commit — all three edits are one cohesive change (one component, one concern:
"retone HoldBox's panel chrome to clay"), matching the granularity of the sibling commits already
on this branch (`c52de13 feat(T-009-03-01): retone board container as recessed clay well`,
`376aa4a feat(T-009-04-01): retone GameOverlay banner onto clay palette`). No reason to split
panel/label/blank-square edits into separate commits — they are not independently revertible in
any useful sense and splitting would just add commit-log noise for a ~5-line diff.

Commit message shape: `feat(T-009-03-03): retone HoldBox panel as raised clay tile`

## Step ordering rationale

Steps 1–3 are independent (Structure: no sequencing dependency) but are listed in file order
top-to-bottom for review clarity. Step 4 (grep) is the mechanical AC-literal check, run after all
three edits land so it validates the combined result once, not three times. Step 5 (tests) comes
before Step 6 (manual visual check) so an automated regression is caught before spending time on
a dev-server walkthrough.
