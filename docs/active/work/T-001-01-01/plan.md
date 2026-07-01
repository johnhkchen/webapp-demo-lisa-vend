# Plan — T-001-01-01: scaffold-nextjs-approuter-typescript-project

Ordered, independently-verifiable steps. Each step ends in a checkable state; commits are
atomic. Grounded in `structure.md`.

## Testing strategy

This is a scaffold — there is **no application logic to unit-test yet** (the pure `lib/`
game logic that would warrant Vitest/Jest is a downstream epic). Verification is therefore
**build- and boot-level**, matching the acceptance criteria:

- **Compile/type check:** `npm run build` performs `tsc`-level type checking and a full
  production build. Passing build = types resolve, `@/*` alias works, Tailwind compiles.
- **Boot check:** `npm run dev` serves http://localhost:3000 and returns HTTP 200 with the
  board markup present.
- **Lint check:** `npm run lint` exits 0 (also the acceptance target of sibling
  T-001-01-02; we ensure green here).
- **Visual/DOM check:** the served HTML contains the grid of cell divs and a Tailwind
  utility class visibly present, confirming Tailwind applies.

No test runner is added in this ticket (would be scope creep and an un-asked dependency).
A `test` script / Vitest arrives with the first `lib/` logic epic.

## Steps

### Step 1 — Generate the Next.js scaffold
- Run `create-next-app` non-interactively into the current empty repo:
  `npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir
  --import-alias "@/*" --use-npm --no-turbopack --yes`.
- If the tool refuses on a non-empty dir (untracked `docs/`, `CLAUDE.md`, dotfiles),
  generate into a temp dir and copy the generated files in, or fall back to hand-authoring
  the file set from `structure.md`.
- **Verify:** `package.json`, `tsconfig.json`, `next.config.*`, `app/`, `eslint.config.*`,
  and a `package-lock.json` exist.
- **Commit:** `chore: scaffold Next.js App Router + TypeScript + Tailwind`.

### Step 2 — Confirm the raw scaffold builds
- Run `npm install` (if not already) then `npm run build`.
- **Verify:** build exits 0 before we customize — isolates generator issues from our edits.
- No commit (verification only).

### Step 3 — Prune generator demo content
- Delete demo assets in `public/` (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`,
  `window.svg` if present).
- Empty out generator boilerplate from `app/page.tsx` and `app/globals.css` (keep the
  Tailwind entry line in globals; keep a minimal dark base).
- Confirm `.gitignore` covers `node_modules/`, `.next/`.
- **Verify:** `npm run build` still exits 0.
- **Commit:** `chore: prune create-next-app demo boilerplate`.

### Step 4 — Seed `lib/constants.ts`
- Create `lib/constants.ts` exporting `COLS = 10`, `ROWS = 20` (pure, no imports).
- **Verify:** `npx tsc --noEmit` clean (or defer to Step 6 build).
- **Commit:** `feat: add board dimension constants in lib/`.

### Step 5 — Seed `components/Board.tsx` and wire `page.tsx` + layout + globals
- Create `components/Board.tsx`: static CSS-grid placeholder of `COLS × ROWS` empty cell
  divs, importing dims from `@/lib/constants`; Tailwind classes for the grid + cells.
- Write `app/page.tsx`: centered container + heading + `<Board />`.
- Write `app/layout.tsx`: root layout importing `globals.css`, `metadata.title = "Tetris"`.
- Finalize `app/globals.css`: Tailwind entry + dark full-height body base.
- **Verify:** covered by Step 6.
- **Commit:** `feat: render placeholder board grid on the home page`.

### Step 6 — Full verification from a clean state
- `npm run lint` → expect exit 0, zero warnings.
- `npm run build` → expect passing production build.
- `npm run dev` (background) → `curl -s localhost:3000` returns 200 and HTML containing the
  cell-grid markup; then stop the dev server.
- Optionally `npm run start` against the build to confirm the production server boots.
- **Verify:** all four commands succeed; acceptance criteria met.
- No code change; if any check fails, fix and fold into the relevant step's commit.

### Step 7 — Commit lockfile + final state
- Ensure `package-lock.json` and `next-env.d.ts` are committed (clean-checkout
  reproducibility).
- **Commit** (if anything outstanding): `chore: commit lockfile and finalize scaffold`.

## Commit sequence (atomic)

1. scaffold Next.js (Step 1)
2. prune demo boilerplate (Step 3)
3. add lib/ constants (Step 4)
4. render placeholder board (Step 5)
5. finalize lockfile if needed (Step 7)

Steps 2 and 6 are verification gates, not commits.

## Verification criteria (acceptance mapping)

| Acceptance clause | Check |
|---|---|
| `npm run dev` serves at :3000 | Step 6 curl → HTTP 200 |
| `npm run build` passes | Steps 2 & 6 build exit 0 |
| package.json/tsconfig/next config exist & committed | Steps 1, 7 |
| `app/{layout,page}.tsx` + `globals.css` exist | Step 5 |
| (epic) lint clean | Step 6 lint exit 0 |
| (epic) placeholder board as CSS grid of divs | Step 5 + Step 6 DOM check |

## Risks & mitigations

- **Generator won't run on non-empty dir** → temp-dir generate + copy, or hand-author
  (Structure lists every file).
- **Tailwind v4 vs v3 config drift** → follow whatever the generator installs; Structure
  covers both shapes.
- **Node 26 ahead of Next's tested range** → unlikely to break; if a peer warning appears,
  it's non-fatal for build. Note any warning in `progress.md`.
- **`create-next-app` network/registry failure** → fall back to hand-authoring + explicit
  `npm install`.
