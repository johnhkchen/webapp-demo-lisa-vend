# Progress — T-006-01-01 install-vinext-vite-plugin-rsc-deps

Status: **complete.** All plan steps executed; committed as `8f6c88d`.

## Step log

- **Step 1 — snapshot.** Pre-change resolved: `react`/`react-dom` 19.2.4, `vite` 8.1.2
  (transitive via vitest). Working tree clean except the pre-existing ticket edit and untracked
  `tetris.html`. ✅
- **Step 2 — install.** Two `npm install` passes (runtime deps, then `--save-dev` build stack).
  Both exited 0. **No ERESOLVE, no UNMET PEER DEPENDENCY** — only benign `allow-scripts`
  warnings (fsevents, sharp, esbuild, unrs-resolver) and a pre-existing `npm audit` note
  (4 moderate advisories in the new transitive tree; see Deviations). ✅
- **Step 3 — package.json shape.** Verified: `dependencies` gained `vinext ^0.2.0`,
  `react-server-dom-webpack ^19.2.7`, and react/react-dom bumped to `^19.2.7`;
  `devDependencies` gained `vite ^7.3.6`, `@vitejs/plugin-rsc ^0.5.27`,
  `@vitejs/plugin-react ^5.2.0`, `@mdx-js/rollup ^3.1.1`, `vite-tsconfig-paths ^6.1.1`.
  `scripts` unchanged; no `"type"` key added. ✅
- **Step 4 — version guard.** `npm ls` resolved: `@vitejs/plugin-react 5.2.0` (NOT 6.x —
  the pin held), `vite 7.3.6`, `react`/`react-dom` `19.2.7`, `react-server-dom-webpack 19.2.7`,
  `vinext 0.2.0`, `@vitejs/plugin-rsc 0.5.27`, `@mdx-js/rollup 3.1.1`,
  `vite-tsconfig-paths 6.1.1`. ✅
- **Step 5 — clean `npm ci` (the AC gate).** `rm -rf node_modules && npm ci` → `added 655
  packages` in ~8s, **exit 0, zero peer errors**. Re-ran to confirm deterministic exit 0. ✅
- **Step 6 — commit.** Staged only `package.json` + `package-lock.json`. Commit `8f6c88d`
  (`feat(T-006-01-01): add vinext + vite@7 + plugin-rsc build deps`), stat: 2 files changed.
  The ticket edit and `tetris.html` were left untouched. ✅

## Deviations from plan

- **`vite` written as `^7.3.6`, not `^7`.** npm records the resolved version with a caret when
  you pass a range floor; `^7.3.6` is semantically inside `^7` and satisfies the AC ("list
  vite@^7"). No action — accepted as npm's normal behavior.
- **`@mdx-js/rollup` written as `^3.1.1`** (plan said `^3`). Same npm caret-resolution
  behavior; `^3.1.1` ⊂ `^3`. Accepted.
- **`npm audit` reports 4 moderate advisories** in the newly pulled transitive tree. This is
  **not** a peer-dependency error and is outside this ticket's AC (which gates only clean
  install). Not addressed here; flagged in `review.md` as an open concern for the epic.
- No version-pin surprises: the Research dry-run predicted the exact clean resolution, and
  reality matched. No `--legacy-peer-deps`/`--force` was needed or used.

## Remaining

Nothing for this ticket. Downstream (T-006-01-02) will add `vite.config.ts`, set
`"type":"module"`, and flip the `dev/build/start` scripts to vinext.
