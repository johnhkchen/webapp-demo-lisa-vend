# Research — T-006-02-02: verify-build-lint-vitest-green-under-vinext

## Ticket in one line

Prove the vinext migration preserves all three quality gates — a clean production build
(`npm run build`), a passing lint (`npm run lint`, `--max-warnings 0`), and a green test
suite (`npm test`, vitest) — with no game/logic diff.

## Where we are in E-006

- **T-006-01-01** — added `vinext` + `vite@8` + `@vitejs/plugin-rsc` build deps.
- **T-006-01-02** — added `vite.config.ts` and flipped `dev`/`build`/`start` to vinext.
- **T-006-02-01** (done) — `vinext check` compat scan: 100% compatible, 0 issues; no source
  change. Verified `vinext build` and `vitest run` green.
- **T-006-02-02** (this) — the *combined* gate: build **and** lint **and** vitest all green
  together. T-006-02-01 covered build+test but **did not run lint** at all.

That gap matters: lint is the gate T-006-02-01 never exercised, and it is where the migration's
side effects surface (see Finding 1).

## The three gates as currently wired

`package.json` scripts:
```
"dev":   "vinext dev"
"build": "vinext build"
"start": "vinext start"
"lint":  "eslint --max-warnings 0"      ← no path arg: lints the whole repo
"test":  "vitest run"
```

### Build — `vinext build`
Driven by `vite.config.ts` (`plugins: [vinext()]`). vinext auto-registers `@vitejs/plugin-rsc`
and `@vitejs/plugin-react` and resolves the `@/*` tsconfig alias internally. Builds 5
environments (client-ref analysis, server-ref analysis, rsc, client, ssr). **Output goes to
`dist/`** (Vite default), not `.next/`. `next.config.ts` pins `typescript.ignoreBuildErrors:
false` so a type error fails the build.

### Lint — `eslint --max-warnings 0`
Config: `eslint.config.mjs` (flat config). Composes `eslint-config-next/core-web-vitals` +
`.../typescript`, a `globalIgnores([...])` list, and a `lib/**` rule banning React/Next
imports (the pure-logic track boundary). **The ignore list is the crux — see Finding 1.**
Current ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`. The `eslint` invocation
passes **no path argument**, so ESLint walks the entire project from cwd, minus ignores.

### Test — `vitest run`
Config: `vitest.config.ts` — only job is to resolve the `@/*` alias. Default environment is
**node** (fast lib suite); component tests opt into jsdom per-file via a
`// @vitest-environment jsdom` docblock. 18 test files, 163 tests (13 `lib/*.test.ts`,
5 `components/*.test.{ts,tsx}`).

## Observed state (measured this session)

| Gate | Command | Result |
|---|---|---|
| Build | `npm run build` | ✅ exit 0 — 5 envs built, no errors |
| Test  | `npm test`      | ✅ exit 0 — **163/163** tests, **18/18** files, ~1.6s |
| Lint  | `npm run lint`  | ❌ **fails — 1756 problems (10 errors, 1746 warnings)** |

## Finding 1 — lint fails, and 100% of the failures are in `dist/`

Every single one of the 1756 lint problems comes from files under `dist/` — the `vinext build`
output. A representative slice:
```
dist/server/index.js
dist/client/_next/static/chunks/framework-*.js
dist/server/ssr/vinext-client-assets.js
dist/client/_next/static/.../_buildManifest.js   ... (30 files total, all under dist/)
```
Confirmation: `eslint --max-warnings 0 --ignore-pattern 'dist/**'` exits **0** with no output.
So **source (`app/`, `components/`, `lib/`) is lint-clean.** The failure is entirely an
artifact of ESLint walking the bundled, minified build output.

### Root cause
The ESLint `globalIgnores` list ignores the *old* runtime's build dirs (`.next/**`, `out/**`,
`build/**`) but **not vinext's `dist/**`**. This is a direct migration side effect: T-006-01-02
changed `build` to emit `dist/`, but the lint ignore list was never updated to match. As long as
`dist/` is absent, lint passes — which is why T-006-02-01 (which removed `dist/` afterward and
never ran lint) did not catch it. But the AC here requires build **and** lint green together,
and a real deploy pipeline runs `build` then `lint` against the same tree.

### Why this is config-glue, not a code change
The fix is adding `dist/**` (and, defensively, `.vinext/**`) to the existing `globalIgnores`
array — the exact same mechanism already used for `.next/**`/`out/**`/`build/**`. It is the
runtime-rename analog of ignores that already exist. No source, no `lib/`, no gameplay, no test
touched. Byte-for-byte-unchanged game logic is preserved.

## Constraints & assumptions

- **No game/logic diff** (AC + CLAUDE.md track boundary). The fix must not touch `lib/`,
  `components/` render logic, or any `*.test.*`. Config file only.
- **`--max-warnings 0`** means warnings are as fatal as errors — the 1746 warnings alone would
  fail the gate even without the 10 errors.
- **`dist/` is untracked and not gitignored** (`.gitignore` lists `/.next/`, `/out/`, `/build`,
  not `/dist/`). T-006-02-01 flagged this and deferred the `.gitignore` change to the Cloudflare
  deploy ticket. Relevant here because ESLint ignores are independent of git ignores — ESLint
  will walk `dist/` whether or not git tracks it, so the ESLint ignore is the load-bearing fix
  for *this* AC regardless of what the deploy ticket does about `.gitignore`.
- **Determinism**: build/test are reproducible; lint result depends only on the file tree +
  config, so the fix is deterministic once `dist/**` is ignored.

## Open questions for Design
1. Ignore `dist/**` only, or also `.vinext/**` (vinext's internal cache dir, present at repo
   root)? Does `.vinext/` contain lintable `.js`/`.ts`?
2. Add `/dist/` to `.gitignore` here, or leave it to the deploy ticket per T-006-02-01's
   deferral?
3. Should the "no game/logic diff" clause be actively proven (git diff of `lib/`) or is a clean
   `git status` on source sufficient?
