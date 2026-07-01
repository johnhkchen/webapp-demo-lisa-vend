# Plan — T-006-01-01 install-vinext-vite-plugin-rsc-deps

Ordered, independently verifiable steps. The work is small (two files) so the plan is short,
but each step has an explicit check so a failure is caught at the step that caused it.

## Testing strategy

There is no application code to unit-test in this ticket — the deliverable is a dependency
manifest + lockfile. "Tests" here are **install-integrity checks**:

- **Primary gate (the AC):** `rm -rf node_modules && npm ci` completes with **no
  peer-dependency errors** and a non-error exit code.
- **Presence check:** `package.json` lists `vinext`, `vite@^7`, `@vitejs/plugin-rsc`;
  `package-lock.json` contains resolved entries for all three.
- **Version-guard check:** `@vitejs/plugin-react` resolved is 5.x (not 6.x); `vite` resolved
  is 7.x; `react`/`react-dom` resolved are ≥19.2.7.
- **Out of scope (deferred to S-006-02):** `npm run build`, `npm run lint`, `npm test`. Do not
  run them as gates here; the scripts still invoke Next and the runtime is not yet wired.

## Steps

### Step 1 — Snapshot the pre-change state
- Record current resolved versions: `npm ls vite react react-dom --depth=0` (expect
  vite 8.1.2, react/react-dom 19.2.4) and confirm `git status` is clean except the pre-existing
  ticket edit + untracked `tetris.html`.
- **Verify:** snapshot captured; nothing unexpected staged.
- Commit: none (read-only).

### Step 2 — Install all packages in one resolution pass
- Run:
  ```
  npm install \
    vinext@^0.2.0 \
    react-server-dom-webpack@^19.2.7 \
    react@^19.2.7 react-dom@^19.2.7 \
    --save-exact=false
  npm install --save-dev \
    vite@^7 @vitejs/plugin-rsc@^0.5.27 \
    @vitejs/plugin-react@^5.2.0 @mdx-js/rollup@^3 vite-tsconfig-paths@^6.1.1
  ```
  (Two calls only to route packages into `dependencies` vs `devDependencies`; npm merges the
  tree coherently. A single combined call also works — the split is purely for placement.)
- **No `--legacy-peer-deps`, no `--force`.** If npm errors with ERESOLVE, STOP: the resolution
  design is wrong and must be revisited, not masked.
- **Verify:** both commands exit 0 with only benign `allow-scripts` warnings (sharp, esbuild,
  fsevents, unrs-resolver) — no `npm error`, no `UNMET PEER DEPENDENCY`.

### Step 3 — Confirm package.json shape
- Inspect `package.json`:
  - `dependencies` has `vinext ^0.2.0`, `react ^19.2.7`, `react-dom ^19.2.7`,
    `react-server-dom-webpack ^19.2.7`, plus existing `next 16.2.9`.
  - `devDependencies` has `vite ^7`, `@vitejs/plugin-rsc ^0.5.27`,
    `@vitejs/plugin-react ^5.2.0`, `@mdx-js/rollup ^3`, `vite-tsconfig-paths ^6.1.1`.
  - `scripts` and all other keys unchanged; no `"type"` key added.
- **Verify:** diff of `package.json` shows only the intended additions + the react/react-dom
  bump.

### Step 4 — Version-guard the resolved tree
- `npm ls @vitejs/plugin-react vite react react-dom react-server-dom-webpack --depth=0`.
- **Verify:** `@vitejs/plugin-react` is **5.2.x** (not 6.x); `vite` is **7.3.x**;
  `react`/`react-dom` are **19.2.7+**; `react-server-dom-webpack` is **19.2.7+**. If
  plugin-react shows 6.x, the pin failed — fix before proceeding.

### Step 5 — Prove clean `npm ci` from scratch (the AC gate)
- `rm -rf node_modules && npm ci`.
- **Verify:** exits 0; output contains no `ERESOLVE` / peer-dependency error. This is the
  literal acceptance check ("`npm ci` installs cleanly with no peer-dependency errors").

### Step 6 — Commit
- Stage `package.json` + `package-lock.json` only (leave the `docs/active/tickets/*` edit and
  `tetris.html` alone — not part of this change).
- Commit message:
  ```
  feat(T-006-01-01): add vinext + vite@7 + plugin-rsc build deps

  Install vinext@^0.2.0 and its build stack (vite@^7, @vitejs/plugin-rsc,
  @vitejs/plugin-react pinned to 5.x, @mdx-js/rollup, vite-tsconfig-paths,
  react-server-dom-webpack) so the toolchain swap has deps to configure against.
  Bump react/react-dom 19.2.4 -> ^19.2.7 to satisfy the RSC peer floor. Pin
  plugin-react to 5.x because 6.x requires vite 8, conflicting with vite@^7.
  npm ci resolves peer-clean. No config/script wiring yet (T-006-01-02).
  ```
- **Verify:** `git show --stat` lists exactly `package.json` + `package-lock.json`.

## Rollback

If any step fails irrecoverably: `git checkout -- package.json package-lock.json &&
rm -rf node_modules && npm ci` restores the pre-ticket state. No other files are involved, so
rollback is total and clean.

## Deviation policy

The dry-run in Research already proved the resolution. If reality diverges (e.g. a newer
plugin-react 6.x becomes the only match, or a peer floor shifts), record the divergence and the
adjusted version pins in `progress.md` **before** editing, per RDSPI rules. Do not reach for
`--legacy-peer-deps` as an escape hatch — that fails the AC's intent.
