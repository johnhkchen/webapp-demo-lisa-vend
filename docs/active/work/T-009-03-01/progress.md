# T-009-03-01 — Progress: board-as-recessed-clay-well

## Completed

1. **Cell-grid container className swap.** `components/Board.tsx`, `aria-label="RowClear board"`
   div: `"grid h-full w-full gap-px rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl"`
   → `"clay-well grid h-full w-full gap-px p-2"`. Matches Plan step 1 exactly.

2. **Flash overlay className parity fix.** Same file, `aria-hidden` overlay div:
   `"pointer-events-none absolute inset-0 grid gap-px border border-transparent p-2"` →
   `"pointer-events-none absolute inset-0 grid gap-px p-2"`. Matches Plan step 2 exactly.

3. **Targeted tests:** `npm run test -- --run components/Board.test.tsx
   components/Board.flash.test.tsx` — 2 files / 12 tests, all passing.

4. **Full suite regression check:** `npm run test -- --run` — 32 files / 302 tests, all passing.
   Same count as the pre-change baseline captured at session start.

5. **`npm run lint`** — clean, `--max-warnings 0`.

6. **`npm run build`** (`vinext build`) — clean, all five build stages complete.

7. **Manual dev-server check.** `npm run dev`, fetched `/` via `curl`:
   - Confirmed the served HTML's board container carries exactly
     `class="clay-well grid h-full w-full gap-px p-2"` — no `bg-white/5`/`shadow-2xl`/
     `border-white/10` on the board element (those strings do still appear elsewhere in the
     page, from `HoldBox`/`NextPreview`'s still-dark-glass chrome — out of this ticket's scope,
     confirmed by source location, not a regression here).
   - Fetched the served `app/globals.css` and confirmed the compiled `.clay-well` rule resolves
     to `background: var(--clay-well)` (`#ece7dd`, warm cream-gray) and
     `box-shadow: var(--clay-shadow-well)` — an ink-tinted (`color-mix(... var(--clay-ink) ...)`)
     dual inset shadow, i.e. a genuinely recessed, warm-shadowed look, not a flat gray box.
   - No headless-browser/screenshot tool exists in this repo (confirmed absent from
     `package.json`, matching Research's finding and T-009-02-01's precedent), so the "reads as a
     recessed well" qualitative bar was verified by confirming the exact resolved CSS the browser
     will paint, rather than by an actual rendered screenshot. See Review for this residual gap.
   - Dev server was stopped after the check (`lsof -ti:3000 | xargs kill`).

8. **Commit isolation.** The working tree carries many pre-existing uncommitted hunks across
   `Board.tsx` and sibling files (unrelated `TetrominoType`→`PieceType` rename, aria-label string,
   and various other in-flight S-009 tickets), consistent with the RDSPI concurrency note in
   Research/Structure. Rather than `git add -p` (the two className edits sit on lines adjacent to
   the unrelated aria-label line within the same contiguous diff hunk, so hunk-level splitting
   wasn't available), built the target blob directly: took `git show HEAD:components/Board.tsx`,
   applied only the two className line replacements in Python, hashed it with
   `git hash-object -w`, and staged it with `git update-index --cacheinfo` — leaving the working
   tree file (with every other uncommitted edit) completely untouched. Verified
   `git diff --cached -- components/Board.tsx` showed exactly the two intended hunks before
   committing, and `git diff --stat -- components/Board.tsx` afterward still showed the 4
   remaining unrelated lines unstaged. Committed as `c52de13` together with this ticket's five
   RDSPI artifact files. `git show --stat` on the resulting commit confirms exactly those two
   groups of files, nothing else.

## Deviations from Plan

None. All seven plan steps executed as written; step 7 (commit isolation) needed a different
staging *mechanism* than `git add -p`/`git apply --cached` (blob-crafting instead, per above)
because the two target lines were hunk-adjacent to unrelated content, but the *outcome* — commit
containing only this ticket's two hunks — matches the plan's intent exactly.

## Remaining

Nothing outstanding for this ticket's own scope. Proceeding to Review.
