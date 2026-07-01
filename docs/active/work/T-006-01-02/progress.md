# Progress — T-006-01-02 scaffold-vite-config-and-flip-package-scripts

Execution log for the Implement phase. Commit: **`8b50ead`**.

## Completed

- **Step 1 — `vite.config.ts` created.** Canonical vinext config
  (`defineConfig({ plugins: [vinext()] })`) plus a docblock explaining that `vinext()` auto-wires
  `@vitejs/plugin-rsc`, `@vitejs/plugin-react`, and tsconfig `@/*` resolution. Default import of
  `vinext`. Matches `structure.md` File 1 exactly.
- **Step 2 — `package.json` edited.** Added `"type": "module"` after `"private": true`; repointed
  `dev`→`vinext dev`, `build`→`vinext build`, `start`→`vinext start`. `lint` (`eslint
  --max-warnings 0`) and `test` (`vitest run`) left byte-for-byte. Confirmed valid JSON and
  `type: module` via a node parse probe.
- **Step 3 — boot + render verified** (see Verification below). ✅ AC gate met.
- **Step 4 — regression fence + commit.** `git status` showed only `vite.config.ts` (new),
  `package.json`, `package-lock.json` changed by this work; `.next/` is gitignored; `tetris.html`
  (pre-existing stray) and the Lisa-managed ticket `.md` files were deliberately **not** staged.
  Committed the three implementation files as `8b50ead`.

## DEVIATION FROM PLAN — vite `^7` → `^8` (required; not anticipated in Design/Plan)

**What the plan assumed:** research.md and design.md were written expecting `vite@^7` (T-006-01-01's
pin) to run vinext, because vinext's *declared* peer range is `vite ^7.0.0 || ^8.0.0`.

**What Implement discovered:** `npm run dev` **crashed at boot** under vite 7:
```
node_modules/vinext/dist/build/report.js:3
import { parseSync } from "vite";
SyntaxError: The requested module 'vite' does not provide an export named 'parseSync'
```
`parseSync` is a **vite 8 (Rolldown/Oxc) export** — vite 7.3.6 does not provide it (verified:
`import('vite')` → `parseSync: undefined`). vinext's README states plainly "vinext targets Vite 8."
So vinext 0.2.0's declared `^7||^8` peer range **understates its real runtime floor of vite 8**;
the app cannot boot on vite 7 at all.

**Why the deviation was taken rather than stopping:** this ticket's primary AC is "`npm run dev`
boots the app on the vinext dev server and the game renders at localhost." That is impossible on
vite 7. The RDSPI workflow sanctions documenting a plan deviation and proceeding; delivering a
config that provably crashes at boot would be a false green. The whole point of E-006 is to run on
vinext, which mandates vite 8.

**What was changed:** `npm install vite@^8` → `vite 7.3.6 → 8.1.2` (pulls in `rolldown`,
`@oxc-project/types`, drops standalone `esbuild`). Chosen minimal and clean:
- `@vitejs/plugin-react@5.2.0` already peers `…||^8` (per T-006-01-01 research) — **no bump needed**.
- `vitest@4.1.9` peers `^6||^7||^8` — vite 8 satisfies it.
- Dry-run and actual install resolved with **no ERESOLVE / no peer errors** (only the benign
  `allow-scripts` warnings for fsevents/sharp/unrs-resolver).

**Impact on a sibling ticket:** this **revises T-006-01-01's `vite@^7` AC**. That ticket is marked
done; its vite-7 pin was made to avoid `@vitejs/plugin-react@6` (a vite-8 peer), but it turns out
vite 7 is incompatible with vinext itself. Flagged for human attention in `review.md`.

## Verification

- **Boot:** `npm run dev` → `vinext dev (Vite 8.1.2)`, `Local: http://localhost:3000/`, RSC + SSR
  environments connected. Ready in ~3s.
- **Render (RSC→client boundary):** `curl http://localhost:3000/` → **HTTP 200**, 32 KB HTML
  containing:
  - `TETRIS` `<h1>` — the App Router **server component** rendered.
  - `<script type="module" ... virtual:vite-rsc/entry-browser>` — the **client island** hydrates.
  - `aria-label="Tetris board"` + `Live board` + `GameContainer` — the board actually renders.
  - Server log: `GET / 200 in 1.1s (compile 829ms, render 311ms)` then a warm `200 in 17ms`.
- Dev server shut down cleanly after the check.

## Not done here (correctly out of scope)

- `npm run build` / `npm run lint` / `npm test` under vinext — **S-006-02**.
- Retiring `next.config.ts` / `vercel.json`, generating `wrangler.jsonc`, `vinext deploy` —
  **S-006-03**.
- `npm audit` triage (advisories in vinext's tree) — flagged since T-006-01-01; still open.
