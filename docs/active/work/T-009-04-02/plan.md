# T-009-04-02 — Plan: start-overlay-clay-button

## Steps

### Step 1 — Edit `components/StartOverlay.tsx`

1a. Update the doc comment sentence (Design's rewritten line):
> "It pulses to read as an arcade attract prompt and uses the kit's `.clay-button` pill so it
> belongs to the same system as the other overlays, per E-009."

1b. Replace the two nested `<span>`s with the single `clay-button` span (Structure's before/after).

Both edits are in the same file; make them together as one commit-worthy unit (this is a
single-file, single-concern ticket — no reason to split into multiple commits).

**Verification for Step 1:**
- `grep -n "from-cyan-400\|via-fuchsia-400\|to-violet-400\|bg-black/50" components/StartOverlay.tsx`
  returns nothing.
- `grep -n "clay-button" components/StartOverlay.tsx` returns the new span.
- Read the file back to confirm JSX is well-formed (balanced tags, no leftover empty span).

### Step 2 — Run the existing test file

`npx vitest run components/StartOverlay.test.tsx`

Expect all 3 tests green with no edits to the test file. If any fail, the failure itself tells
us which assumption from Design broke (role, text, or `pointer-events-none`) — diagnose against
the actual diff rather than pre-emptively editing the test.

### Step 3 — Run the full test suite

`npx vitest run`

Confirm no other test (e.g. any snapshot or a test that renders `GameContainer` and happens to
assert on `StartOverlay`'s markup) breaks. Research found no such coupling, but this is a cheap
check before considering the ticket done.

### Step 4 — Lint and build

`npm run lint` then `npm run build`. Build matters here specifically because Tailwind v4 scans
source for class names at build time — removing classes doesn't break scanning, but it's the
cheapest way to catch a typo'd `clay-button` class name or malformed JSX before calling this
done.

### Step 5 — Manual visual spot-check (best effort)

Start the dev server (`npm run dev`) and trigger the attract-mode state that shows
`StartOverlay` (`visible=true`), if reachable without deep test-harness wiring in the time this
ticket warrants. If attract-mode isn't trivially reachable via the running app (e.g. requires
idle-timeout or a specific game state), note that as a limitation in `progress.md`/`review.md`
rather than spending disproportionate effort forcing it — this is a narrow, low-risk CSS-class
swap on a non-interactive presentational element, verified structurally by the existing test
plus the grep checks in Step 1.

### Step 6 — Commit

One commit for this ticket (single file, single concern):
```
feat(T-009-04-02): retone StartOverlay pill onto clay-button
```
Stage only `components/StartOverlay.tsx` (plus, if produced by prior/parallel work, nothing
else — this ticket touches no other source file).

### Step 7 — Write `progress.md`

Record what was done, deviations (if any) from this plan, and final verification results.

## Testing strategy

- **Unit/component test**: existing `StartOverlay.test.tsx`, unmodified, is the load-bearing
  regression check — it already asserts the two things this component contractually promises
  (visibility toggling, non-blocking `pointer-events-none`, and text content). No new test is
  warranted: there's no new *behavior*, only a markup/class change, and AC verification (absence
  of specific class strings, presence of `clay-button`) is a static grep, not something worth a
  runtime assertion for a presentational leaf component with no logic branches added.
- **Integration**: none needed — no prop/interface change, so no consumer wiring changes.
- **Visual**: best-effort manual check (Step 5); not a hard gate for this ticket given the
  narrow, low-risk nature of the change and that automated coverage already exists for the
  behavioral contract.

## Risk / rollback

Trivially revertible (single file, single commit, no interface change). Main risk is purely
cosmetic (does the pill look right against the board) — not correctness/behavior risk, since
`pointer-events-none` and `role="status"` (the two properties that matter for the component's
actual job) are untouched and test-covered.

## Order of execution

Steps 1-7 run in sequence, each gating the next (don't commit before tests/build pass). No
parallelizable sub-steps — this is a small enough change that pipelining would add overhead
without benefit.
