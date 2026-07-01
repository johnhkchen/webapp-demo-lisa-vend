# Design — T-006-01-01 install-vinext-vite-plugin-rsc-deps

Grounded in `research.md`. The research established two hard facts: (1) a naive install of the
three named packages fails with ERESOLVE because npm floats `@vitejs/plugin-react` to 6.x
(vite 8 peer) against our pinned `vite@^7`; (2) react/react-dom at 19.2.4 are below vinext's
peer floor, which the RSC webpack shim pushes to 19.2.7. Design decides how to get a clean,
`npm ci`-able lockfile that respects the strict "deps only" scope.

## Decisions at a glance

1. Add all of vinext's unmet peers **explicitly** to `package.json` (not rely on auto-install).
2. Pin `@vitejs/plugin-react` to the **5.x** line (`^5.2.0`) to hold vite on 7.
3. Bump `react` + `react-dom` to `^19.2.7` (minimal peer-satisfying bump).
4. Split placement: **runtime** deps → `dependencies`; **build tooling** → `devDependencies`.
5. Install with plain `npm install` (no `--legacy-peer-deps`); verify with `npm ci`.

---

## Decision 1 — list peers explicitly vs. rely on npm auto-install

npm 7+ auto-installs missing peer deps. So in principle, adding just `vinext`, `vite@^7`,
`@vitejs/plugin-rsc` and bumping react *might* let npm fill the rest. But research showed npm's
auto-fill picks the **highest** matching version, which is exactly how we got
`@vitejs/plugin-react@6.0.3` and the vite-8 conflict. Auto-install is the *cause* of the
break, not a workaround for it.

**Options**

- **A. Rely on auto-install, add nothing beyond the named 3 + react bump.** Reproduces the
  ERESOLVE (npm floats plugin-react to 6.x). Rejected — it literally fails the AC.
- **B. Add only `@vitejs/plugin-react@^5.2.0` on top of the 3, let npm auto-fill the rest.**
  Fixes the vite conflict but leaves `@mdx-js/rollup`, `react-server-dom-webpack`,
  `vite-tsconfig-paths` as *implicit* peer installs. Those land in the lockfile but not in
  `package.json`, so their versions drift on any future `npm install` and the peer contract is
  invisible to reviewers. Fragile.
- **C. (chosen) List every unmet vinext peer explicitly in `package.json`.** Makes the peer
  contract a reviewable, version-pinned fact. `npm ci` becomes fully deterministic from
  `package.json` + lockfile. Matches the ticket's framing ("bring the deps into the project").

**Chosen: C.** The whole point of the ticket is that "the toolchain swap has something to
configure against." Implicit transitive peers are not something you can configure against with
confidence. Explicit is the intent.

## Decision 2 — pin `@vitejs/plugin-react` to 5.x

This is forced by research, not a preference. vinext peers `^5.1.4 || ^6.0.0`; the 6.x line
requires `vite ^8`, which contradicts the AC's `vite@^7`. The 5.x line (`5.1.4` peers vite
`…||^7`; `5.2.0` peers vite `…||^7||^8`) supports vite 7.

- Pin `^5.2.0` — highest 5.x, supports both vite 7 and 8 (future-proof if vite floats), and
  stays *below* the 6.x major so npm cannot silently re-introduce the vite-8 peer.
- Rejected `^5.1.4`: works, but `^5.2.0` is a strictly better floor with no downside.
- Rejected leaving it unpinned / `^5 || ^6`: npm picks 6.x → conflict.

Trade-off accepted: when vinext later moves to require plugin-react 6 (vite 8), this pin will
need revisiting. That is a future E-006 concern, not this ticket's; the AC pins vite at 7.

## Decision 3 — bump react/react-dom to `^19.2.7`

The peer floor is 19.2.7 (via `react-server-dom-webpack@19.2.7`), and 19.2.7 exists.
`next@16.2.9` accepts `^19.0.0`, so the bump is safe against the current runtime.

- Chosen: `^19.2.7` for both `react` and `react-dom` (keep them lockstep, as they are now).
- Rejected `^19.2.6`: satisfies vinext's direct peer but not RSC-webpack's `^19.2.7` → npm
  would still need 19.2.7 to resolve; pinning 19.2.6 just understates the real floor.
- Rejected pinning exact `19.2.7`: the existing deps use caret ranges (`next 16.2.9` is exact
  by project convention, but react was `19.2.4` as an exact literal). Research shows react is
  written as bare `19.2.4`. To minimize surprise and allow patch uptake, use caret `^19.2.7`.
  This is a deliberate small convention nudge; noted for the reviewer.

Note this is the one place the ticket reaches beyond "add new packages" into "modify existing
runtime deps." It is unavoidable: the clean-install AC cannot be met with react 19.2.4. This
is documented prominently so it is a visible, intentional diff — not a smuggled change.

## Decision 4 — dependencies vs devDependencies placement

Guiding principle: things present in the deployed Worker runtime → `dependencies`; things only
needed to *build* → `devDependencies`. Mirrors the existing split (`next` is a dependency).

| Package | Placement | Why |
|---|---|---|
| `vinext` | `dependencies` | The runtime, successor to `next` (which is a dependency). |
| `react-server-dom-webpack` | `dependencies` | RSC runtime shim, present at render time. |
| `vite` | `devDependencies` | Build/dev server only. |
| `@vitejs/plugin-rsc` | `devDependencies` | Vite build plugin. |
| `@vitejs/plugin-react` | `devDependencies` | Vite build plugin. |
| `@mdx-js/rollup` | `devDependencies` | Build-time transform (MDX; unused by app but a vinext peer). |
| `vite-tsconfig-paths` | `devDependencies` | Build-time path-alias resolver. |
| `react` / `react-dom` | `dependencies` (already) | Bump in place; do not move. |

This split is defensible but not load-bearing for the AC (which only checks presence + clean
`npm ci`). If T-006-01-02/03 reveal a package needs to move, that is cheap. `@mdx-js/rollup`
is genuinely unused by a Tetris app, but it is a *required* vinext peer — omitting it
reintroduces a peer warning, so it stays as a devDependency with a comment in the plan.

Rejected alternative: dump everything in `devDependencies`. Simpler, but misrepresents vinext
(the runtime) as build-only and diverges from how `next` is declared today.

## Decision 5 — install mechanics & verification

- Run a single `npm install <all packages with the chosen ranges>` so npm rewrites both
  `package.json` and `package-lock.json` in one coherent pass. (Alternatively hand-edit
  `package.json` then `npm install` to regenerate the lock; the explicit-args form is less
  error-prone and yields identical results.)
- **Do not** use `--legacy-peer-deps` or `--force`. The AC demands "no peer-dependency
  errors"; masking flags would leave a latently broken tree. The design's whole job is that
  the honest resolution already succeeds (proven by dry run).
- Verify by deleting `node_modules` and running `npm ci` — this is the exact AC check and
  proves the committed lockfile is self-consistent and peer-clean.
- Explicitly out of scope for verification here: `npm run build`, `npm run lint`, `npm test`
  under vinext. Those are S-006-02 tickets. This ticket only proves *install* cleanliness.

## Risk register

- **vinext 0.2.0 is early (0.x).** Pinning `^0.2.0` means `^` on a 0.x locks to `0.2.x`
  (npm caret semantics), which is the conservative, intended behavior. Good.
- **Sharp/esbuild/fsevents install scripts** show as `allow-scripts` warnings — benign, not
  peer errors, and outside this ticket's gate. Note but do not act.
- **vite drop 8→7 could theoretically affect vitest** at runtime; version ranges say no, and
  actual test execution is validated in T-006-02-02. Flag as a watch item, not a blocker.
