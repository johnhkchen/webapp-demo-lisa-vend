# Research — T-006-01-01 install-vinext-vite-plugin-rsc-deps

Ticket: bring vinext build/runtime dependencies into the project so later tickets have
something to configure against. Acceptance: `package.json` + `package-lock.json` list
`vinext`, `vite@^7`, and `@vitejs/plugin-rsc`; `npm ci` installs cleanly with **no
peer-dependency errors**. Current phase: research.

This artifact is descriptive. It maps what exists, what the new packages demand, and where
those two collide. It does not propose the fix — that is Design.

## Where this ticket sits

Epic E-006 migrates the toolchain from Next's compiler + Vercel to **vinext** (Cloudflare's
Vite-based Next.js-compatible runtime) deployed to Cloudflare Workers. Story S-006-01
(`scaffold-vinext-toolchain`) has two tickets:

- **T-006-01-01 (this)** — install the deps. Pure dependency/lockfile work. No config, no
  script flips, no runtime wiring.
- **T-006-01-02** — author `vite.config.ts` wiring `vinext()` + `@vitejs/plugin-rsc`, make
  the package ESM (`"type":"module"`), and repoint `dev`/`build`/`start` at vinext.

Downstream: S-006-02 runs `vinext check` and re-verifies build/lint/vitest; S-006-03 retires
`vercel.json` + Next-compiler wiring and generates `wrangler.jsonc`. So the boundary for THIS
ticket is strict: get the packages into `package.json` and produce a clean, `npm ci`-able
`package-lock.json`. Nothing that changes how the app runs today.

## Current dependency state (package.json)

Runtime deps: `next@16.2.9`, `react@19.2.4`, `react-dom@19.2.4`.
Dev deps: Tailwind v4 (`@tailwindcss/postcss`, `tailwindcss`), `@testing-library/react`,
`eslint@^9` + `eslint-config-next@16.2.9`, `jsdom@^29`, `typescript@^5`, `vitest@^4.1.9`,
plus `@types/*`. Scripts: `dev/build/start` still call `next`; `test` calls `vitest run`.

Toolchain versions on this machine: **node v26.4.0**, **npm 11.17.0**. vinext requires
`node >=22`, so the runtime is fine.

Notably, **`vite` is already installed** — `node_modules/vite@8.1.2`, pulled in transitively
by `vitest@4.1.9` (`vitest → vite@8.1.2`, `@vitest/mocker → vite@8.1.2 deduped`). It is not a
direct dependency and is not listed in `package.json`. `wrangler` is not installed.

## What the three named packages are, on the registry

- `vinext` — latest **0.2.0**. `engines.node >=22`. Has its own deps (`@vercel/og`,
  `@unpic/react`, `image-size`, `vite-plugin-commonjs`, `web-vitals`, `magic-string`, …) and,
  critically, a **broad peerDependencies set** (see below).
- `@vitejs/plugin-rsc` — latest **0.5.27**. Peers are all wildcards
  (`react/react-dom/react-server-dom-webpack/vite: '*'`), so it constrains nothing itself.
- `vite` — dist-tags: `latest 8.1.2`, `previous 7.3.6`. The `^7` line resolves to **7.3.6**.

## vinext's peer requirements (the heart of this ticket)

`npm view vinext@0.2.0 peerDependencies`:

```
@mdx-js/rollup          ^3.0.0
@vitejs/plugin-react    ^5.1.4 || ^6.0.0
@vitejs/plugin-rsc      ^0.5.26
react                   ^19.2.6
react-dom               ^19.2.6
react-server-dom-webpack ^19.2.6
vite                    ^7.0.0 || ^8.0.0
vite-tsconfig-paths     ^6.1.1
```

Two of these collide with the project as it stands today:

### Collision 1 — react/react-dom are too old

Installed `react`/`react-dom` are **19.2.4**. vinext peers require **^19.2.6**. Worse, the
peer `react-server-dom-webpack` resolves to its latest **19.2.7**, whose own peers require
`react ^19.2.7` and `react-dom ^19.2.7`. So the transitive floor is actually **19.2.7**, not
19.2.6. `react@19.2.7` / `react-dom@19.2.7` both exist on the registry. `next@16.2.9` peers
accept `^19.0.0`, so a bump to 19.2.7 stays inside Next's supported range.

### Collision 2 — plugin-react's newest major wants vite 8, but we're pinning vite 7

vinext accepts `@vitejs/plugin-react@^5.1.4 || ^6.0.0`. npm greedily picks the **highest**
match, **6.0.3**, whose peer is `vite: '^8.0.0'`. That directly contradicts our pinned
`vite@^7`. Confirmed by dry run:

```
$ npm install --dry-run vinext@^0.2.0 vite@^7 @vitejs/plugin-rsc@^0.5.27
npm error ERESOLVE unable to resolve dependency tree
npm error   Found: vite@7.3.6 (vite@"^7" from root; peer ^7||^8 from vinext)
npm error   Could not resolve: peer vite@"^8.0.0" from @vitejs/plugin-react@6.0.3
```

The `@vitejs/plugin-react` **5.x** line does not have this problem: `5.1.4` peers
`vite ^4.2||^5||^6||^7`, and `5.2.0` (highest 5.x) peers `vite ^4.2||^5||^6||^7||^8`. Either
5.x supports vite 7; the 6.x line does not. So the conflict is fixable by holding
`@vitejs/plugin-react` on the 5.x line rather than letting npm float it to 6.x.

## vite@7 vs the existing vitest@4

`vitest@4.1.9` peers `vite: '^6.0.0 || ^7.0.0 || ^8.0.0'` — 7 is inside the range. Today the
tree uses vite 8 only because nothing pinned it lower. Introducing a direct `vite@^7` makes
npm dedupe the whole tree onto 7.3.6; vitest continues to satisfy its peer. Whether the test
suite still passes on vite 7 is *verified downstream* (T-006-02-02), not here — but there is
no version-level obstruction.

## Confirmed clean resolution (dry run)

Adding the three named packages **plus** the unmet vinext peers explicitly, pinning
plugin-react to 5.x, and bumping react/react-dom to 19.2.7, resolves with no ERESOLVE:

```
$ npm install --dry-run \
    vinext@^0.2.0 vite@^7 @vitejs/plugin-rsc@^0.5.27 \
    @vitejs/plugin-react@^5.2.0 @mdx-js/rollup@^3 \
    react-server-dom-webpack@^19.2.7 vite-tsconfig-paths@^6.1.1 \
    react@^19.2.7 react-dom@^19.2.7
→ resolves; only benign `allow-scripts` warnings (fsevents, sharp, esbuild, unrs-resolver),
  no peer errors.
```

(The dry runs did not mutate `package.json`/`package-lock.json`; verified via `git status`.)

## Assumptions & constraints

- **Strict scope.** This ticket only touches `package.json` + `package-lock.json`. No
  `vite.config.ts`, no `"type":"module"`, no script changes, no source under `lib/`,
  `components/`, or `app/`. Those belong to T-006-01-02 and later.
- The **react/react-dom bump to 19.2.7 is not optional** given the "clean `npm ci`, no peer
  errors" acceptance criterion — it is the minimal change that satisfies the peer graph.
- The AC names three packages but a clean install is impossible without vinext's peer set;
  Design must decide whether to list those peers explicitly or rely on npm auto-install.
- `--legacy-peer-deps` / `--force` would mask the conflict but violate "no peer-dependency
  errors" — off the table for a clean solution.
- Registry access is available in this environment (all `npm view`/dry-run calls succeeded).
- An untracked stray `tetris.html` exists at repo root; unrelated to this ticket, leave it.
