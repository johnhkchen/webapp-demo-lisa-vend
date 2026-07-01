# Design — T-006-01-02 scaffold-vite-config-and-flip-package-scripts

Grounded in `research.md`. Research established: (1) vinext 0.2.0's `vinext()` plugin auto-registers
`@vitejs/plugin-rsc` (`rsc` default `true`) and `@vitejs/plugin-react` (`react` default `true`) and
resolves tsconfig `paths` internally; (2) vinext's own canonical template is
`plugins: [vinext()]`; (3) `vinext dev` defaults to port 3000; (4) the ESM flip is low-risk (no CJS
`.js` config files). Design decides the config shape, the script set, and the ESM mechanics.

## Decisions at a glance

1. **`vite.config.ts`** = the canonical vinext template: `defineConfig({ plugins: [vinext()] })`.
   Rely on vinext's built-in plugin-rsc/plugin-react registration rather than listing them by hand.
2. **Scripts**: flip only `dev`/`build`/`start` to `vinext dev|build|start`; leave `lint` and
   `test` exactly as they are.
3. **ESM**: add `"type": "module"` to `package.json`; rename/convert nothing (no CJS `.js` configs).
4. **Do not** touch `next.config.ts`, `vercel.json`, `tsconfig.json`, `vitest.config.ts`, or source.
5. Verify by actually booting `npm run dev` and confirming the RSC→client render of the board.

---

## Decision 1 — the `vite.config.ts` shape

The AC says "wiring `vinext()` + `@vitejs/plugin-rsc`." Research showed `vinext()` *already* wires
plugin-rsc internally when an `app/` dir is present.

**Options**

- **A. (chosen) `plugins: [vinext()]`** — the exact template `vinext init` emits. plugin-rsc and
  plugin-react come from vinext's defaults; tsconfig `@/*` paths resolve via vinext's internal
  `loadTsconfigResolutionForRoot`. Smallest correct surface; matches upstream intent 1:1.
- **B. List plugin-rsc explicitly**: `plugins: [vinext({ rsc: false }), rscPlugin()]`. This reads
  more literally against the AC's "+`@vitejs/plugin-rsc`," but it means *disabling* vinext's own
  registration and hand-wiring the plugin in the order/options vinext expects. That reintroduces
  exactly the coupling vinext's default is designed to hide, and any mismatch (plugin order, RSC
  entry options) silently breaks the RSC boundary. Rejected — more fragile, no benefit.
- **C. Add `vite-tsconfig-paths` and/or `@vitejs/plugin-react` explicitly too.** Redundant: vinext
  handles both. Adding them risks double-registration warnings or conflicting Fast Refresh setup.
  Rejected.

**Chosen: A.** "Wiring vinext() + @vitejs/plugin-rsc" is satisfied *through* `vinext()` — the RSC
pipeline is wired; it just isn't hand-instantiated. This is the officially generated config, the
least likely to drift as vinext evolves, and the design records the rationale so a reviewer reading
the AC literally understands why plugin-rsc doesn't appear as a separate import. If a future
requirement needs custom plugin-rsc options, flip to `rsc:false` + explicit plugin then — cheap.

The file is `vite.config.ts` (TS, matching the repo's TS-config convention and the AC's exact
filename), not `.js`/`.mjs`.

## Decision 2 — which scripts to flip

The ticket title is "flip-package-scripts" and the AC names `dev`/`build`/`start`. Research's
README recipe is "replace `next` with `vinext`" for exactly those three.

- `dev`:   `next dev`   → `vinext dev`   (defaults to port 3000 — preserves CLAUDE.md's localhost:3000)
- `build`: `next build` → `vinext build`
- `start`: `next start` → `vinext start`
- `lint`:  **unchanged** (`eslint --max-warnings 0`). vinext offers `vinext lint`, but lint
  re-verification is S-006-02's scope; changing it now widens blast radius for no AC gain.
- `test`:  **unchanged** (`vitest run`). Test config lives in `vitest.config.ts`; untouched here.

Rejected: adding parallel `dev:vinext`/`build:vinext` scripts (vinext init's *co-install* pattern).
That pattern exists to let Next and vinext run side by side during a gradual migration. E-006 is a
*replacement* migration — the whole point is that `npm run dev` now means vinext. Parallel scripts
would leave the primary scripts on Next, failing the AC ("dev/build/start invoking vinext").

Rejected: adding a `deploy` script here. `vinext deploy`/`wrangler.jsonc` belong to S-006-03.

## Decision 3 — ESM flip mechanics

Add `"type": "module"` to `package.json`. Research confirmed the flip is safe: the only config
files are already `.mjs` (postcss, eslint) or TS (next, vitest), and there are no CommonJS `.js`
config files that would break under ESM resolution. So, unlike vinext init's generic step-3
(rename `postcss.config.js`→`.cjs`), **no rename is needed here** — that step is a no-op for this
repo.

- Placement: add `"type": "module"` near the top of `package.json` (after `"private"`), a
  conventional spot.
- Why it's required: vinext is ESM-only, and `vite.config.ts` is loaded as an ES module. Without
  `"type":"module"` some toolchains treat sibling `.js`/config resolution as CJS; declaring ESM
  makes the package's module system unambiguous and matches vinext's own package. It is also an
  explicit AC item ("package.json is ESM").

## Decision 4 — what stays untouched (scope fence)

Deliberately **not** changed, to respect the S-006-02/03 boundary:

| File | Why left alone |
|---|---|
| `next.config.ts` | vinext auto-loads it; retiring Next wiring is S-006-03. |
| `vercel.json` | Vercel→Cloudflare cutover is S-006-03. |
| `tsconfig.json` | `paths`/`bundler` resolution already works with vinext; no change needed. |
| `vitest.config.ts` | Test path-alias resolver; test re-verify is S-006-02. |
| `app/`, `components/`, `lib/` | No source change is needed to run under vinext. |

## Decision 5 — verification approach

The AC's live-boot clause is the real gate. Plan will:
1. `npm run dev` (fresh) → assert the vinext dev server starts and binds localhost:3000.
2. Hit `http://localhost:3000/` and confirm the HTML renders the Tetris shell (the `TETRIS`
   heading) and the client island (`GameContainer`) hydrates the board — i.e. the RSC→client
   boundary works end to end, not just a blank 200.
3. Explicitly out of scope: `npm run build`, `npm run lint`, `npm test` under vinext (S-006-02).

## Risk register

- **vinext auto-registration is implicit.** If a future vinext drops the `rsc`/`react` defaults,
  this config breaks silently. Mitigation: documented here; the fix is one line (`rsc:true`
  explicit or add the plugin). Low probability within 0.2.x.
- **Vitest + vite.config.ts coexistence.** Vitest prefers `vitest.config.ts`, so `vinext()` should
  not leak into tests — but this is *unverified until S-006-02*. Flag as a watch item; if tests
  regress there, this config's existence is the first suspect.
- **Port collision.** If anything already holds 3000, `vinext dev` fails to bind. Operational, not
  a design flaw; note in Plan's verification steps (use `PORT=` override if needed).
- **vinext 0.2.0 is experimental (0.x).** Rendering edge cases may surface at boot; the render
  check in Plan is what catches them before we call the ticket done.
