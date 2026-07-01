# Plan — T-001-03-01: render-placeholder-board-css-grid

Ordered, independently verifiable steps to execute the Structure blueprint. One atomic
commit at the end (code + artifacts), matching prior tickets on the shared `main` branch.

## Step 0 — Baseline (done during Research)

- `npm run lint` → exit 0, zero warnings.
- `npm run build` → exit 0; `/` + `/_not-found` prerendered static.
- **Verification:** captured; this is the green starting point any change must preserve.

## Step 1 — Create `components/Cell.tsx`

- Add the props-less, default-exported `Cell` Server Component rendering one empty cell
  `div` with `rounded-[2px] bg-white/5 ring-1 ring-inset ring-white/5` and a short doc
  comment (per Structure).
- **Verify:** `npx tsc --noEmit` (or `npm run build`) compiles; file lints clean. No
  dependents yet, so the tree stays green even before Board uses it.

## Step 2 — Refactor `components/Board.tsx` to compose `Cell`

- Add `import Cell from "@/components/Cell";`.
- Replace the inline cell `<div key={i} className="rounded-[2px] …" />` inside `cells.map`
  with `<Cell key={i} />`. Leave the container, `Array.from({length: COLS*ROWS})`, sizing,
  chrome, and `aria-label` untouched.
- Update Board's doc comment to note the grid is now composed of `Cell` components.
- **Verify:** `npm run lint` → exit 0; `npm run build` → exit 0. No dangling import; the cell
  classes now live only in `Cell`.

## Step 3 — Functional / visual verification

- `npm run build` passes and `/` still prerenders as static content (no client runtime
  introduced).
- **DOM contract:** confirm the render still emits exactly `COLS*ROWS` (= 200) cell `div`s
  inside one CSS-grid container. Primary check: inspect the built/dev output; the map length
  is unchanged by construction (`Array.from({length: COLS*ROWS})`), so the count is
  structurally preserved.
- **Visual:** start `npm run dev`, load `http://localhost:3000`, confirm the placeholder
  board renders identically to baseline (same 10×20 neutral grid under the TETRIS header).
  If a headless check is impractical in this environment, rely on the unchanged classes +
  unchanged map (extraction is verbatim) plus a passing build, and note that in Review.

## Step 4 — Commit (atomic)

- Stage **only**: `components/Cell.tsx`, `components/Board.tsx`, and
  `docs/active/work/T-001-03-01/*.md`.
- **Do not** stage: any ticket/story/epic frontmatter (Lisa manages `phase`/`status`),
  sibling tickets' files, or unrelated working-tree changes.
- Commit message (Conventional Commits, matching repo style):
  `feat(T-001-03-01): render placeholder board via extracted Cell component`
  with a body noting the literal AC was scaffold-satisfied and this completes the
  CLAUDE.md-named presentational skeleton (Board ∘ Cell).
- **Verify:** `git show --stat` lists only the intended files.

## Step 5 — Write `progress.md` then `review.md`

- `progress.md`: record each step's status and any deviation from this plan.
- `review.md`: the handoff — what changed, verification results, test-coverage assessment,
  open concerns. Then stop; Lisa handles phase/status transitions.

## Testing strategy

- **No new automated tests, by design** — consistent with T-001-01-01/02 and T-001-02-02.
  This ticket adds a stateless presentational component with no branching logic; a DOM render
  test would require introducing jsdom/RTL (a heavier, different dependency than the Vitest
  runner prior tickets deferred to the first pure-`lib/` logic epic). That is disproportionate
  for a static placeholder.
- **Verification is build + lint + visual**, exercising the real AC surface:
  - `npm run lint` (zero-warning gate from T-001-01-02) — proves style/type/import cleanliness,
    including that the T-001-02-02 `lib/` purity rule is not tripped (it isn't; no `lib/`
    change).
  - `npm run build` — proves the production build the deploy epic depends on still passes and
    `/` stays static.
  - Dev visual — proves the placeholder board still shows on the page.
- **Gap carried forward (unchanged):** no `test` script/runner yet; stand one up when E-002's
  pure `lib/` logic (tetromino/collision/scoring/RNG) lands — that is the code that will want
  and reward real unit coverage. Flagged again in Review.

## Rollback

Single atomic commit; revert it (or delete `components/Cell.tsx` and restore Board's inline
cell) to return to the scaffold state. No config, dependency, or `lib/` change to unwind.
