# T-009-01-02 — Progress: wire-clay-tokens-into-tailwind-theme

## Status: implementation complete, all verification passed

## Steps completed

### Step 1 — Edit `app/globals.css` ✅

Applied both edits exactly as planned:
1. Added `@import "../styles/vendor/b28-clay.css";` as line 2, immediately after
   `@import "tailwindcss";`.
2. Changed the `:root` block:
   - `--background: #0a0a0f;` → `--background: var(--clay-bg);`
   - `--foreground: #ededf2;` → `--foreground: var(--clay-ink);`

No other line in the two touched blocks changed. `@theme inline` below was left untouched, as
planned.

**Verification:** `npm run build` (`vinext build`) exits 0, all 5 build stages succeed.

### Step 2 — Verify resolved token values ✅

Used both approaches from the plan (build-output inspection and a live dev-server render),
since both were cheap to run:

- **Build output:** grepped the compiled CSS at
  `dist/client/_next/static/css/index.BGpKmtxp.css`. Confirmed the full chain:
  `--clay-bg:#faf8f5` → `--background:var(--clay-bg)` → `--color-background:var(--background)`,
  and `--clay-ink:#1c1917` → `--foreground:var(--clay-ink)` → `--color-foreground:var(--foreground)`.
- **Dev server:** ran `npm run dev`, curled `http://localhost:3000/` (200 OK, confirmed
  `bg-background`/`text-foreground` classes present in the rendered `<body>`), then curled the
  served `/app/globals.css` directly and confirmed the same resolved chain:
  `--clay-bg: #faf8f5`, `--clay-ink: #1c1917`, `--background: var(--clay-bg)`,
  `--foreground: var(--clay-ink)`. Killed the dev server afterward.

**Result:** `--color-background` resolves to the kit's warm off-white (`#faf8f5`), and
`--color-foreground` resolves to the kit's warm ink (`#1c1917`) — not the old
`#0a0a0f`/`#ededf2`. Acceptance criterion satisfied in both build and dev-server contexts.

### Step 3 — Regression check ✅

- `npm run test` — 32 test files, 302 tests, all passing (no change from T-009-01-01's
  baseline; this ticket touches no `lib/`, no component, no test file).
- `npm run lint` — clean, zero warnings/errors.

## Deviations from plan

None. All three steps executed exactly as planned in `plan.md`.

## Note on working-tree state

`app/globals.css` had pre-existing uncommitted changes in the working tree before this
ticket's session started (visible in the initial `git status`, and confirmed by inspecting
`git diff app/globals.css` after my edits — it includes unrelated hunks: a piece-palette
oklch retone, a `.flash` tint retone, and a comment wording change, none of which I made).
Per the RDSPI workflow's Concurrency model, multiple threads can work the same branch
concurrently; this looks like a piece-palette-retoning ticket from S-009-02+ mid-flight on the
same file. My edits are scoped to exactly the two spots described above and don't touch or
depend on that other in-flight work — confirmed by diffing my own edit calls against the
`:root` background/foreground block and the new `@import` line only. No merge conflict risk
observed since the touched regions don't overlap.

## Remaining work

None for this ticket. Ready for Review.
