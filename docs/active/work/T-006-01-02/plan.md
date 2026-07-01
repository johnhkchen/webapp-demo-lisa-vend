# Plan — T-006-01-02 scaffold-vite-config-and-flip-package-scripts

Ordered, independently-verifiable steps to execute `structure.md`. Two file changes, a live-boot
verification, and a commit. Testing strategy is boot-based (no new unit tests — this is config).

## Testing strategy up front

This ticket adds **no application logic**, so there are no unit tests to write. The AC is a
runtime gate: "`npm run dev` boots the app on the vinext dev server and the game renders at
localhost." Verification is therefore **behavioral / integration**:

- **Config sanity**: `vite.config.ts` type-checks and imports vinext without error.
- **Boot check**: `npm run dev` starts the vinext dev server and binds a port.
- **Render check**: the served HTML contains the app shell (the `TETRIS` heading from `page.tsx`)
  and the client island loads — proving the RSC→client boundary and `@/*` alias resolve.
- **Regression fence**: `git status`/`git diff` confirm only `vite.config.ts` (new) and
  `package.json` (2 edits) changed; no source, no other config.

Explicitly deferred to **S-006-02** (do not run as a gate here): `npm run build`, `npm run lint`,
`npm test` under vinext. Running them now proves nothing this ticket owns and could mislead.

## Step 1 — create `vite.config.ts`

- Write the canonical config from `structure.md` File 1 (`defineConfig({ plugins: [vinext()] })`
  + docblock explaining vinext auto-wires plugin-rsc/plugin-react/paths).
- **Verify**: file exists at repo root; `npx tsc --noEmit`-equivalent is *not* required (the repo
  gate is deferred), but a quick `node -e "import('vite')"`/import resolution is confirmed
  implicitly at boot. Confirm the `vinext` default import resolves (`node -e "import('vinext')"`).
- Inert step: nothing runs Vite yet. Safe to land alone.

## Step 2 — edit `package.json`

- **2a**: insert `"type": "module"` after `"private": true,`.
- **2b**: repoint scripts — `dev`→`vinext dev`, `build`→`vinext build`, `start`→`vinext start`.
  Leave `lint` and `test` untouched. Leave `dependencies`/`devDependencies` untouched.
- **Verify**: `git diff package.json` shows exactly one added `"type"` line and three changed
  script values — nothing else. JSON remains valid (`node -e "require? no — use import"`; simplest:
  `node -e "JSON.parse(require('fs').readFileSync('package.json'))"` still works even under ESM
  since it's a `-e` script, or just rely on the boot step which parses it).

## Step 3 — boot + render verification (the AC gate)

- Start the dev server in the background: `npm run dev` (defaults to port 3000). Capture logs.
- **Wait for readiness**: poll until the server prints its "ready"/local URL line or the port
  answers. If port 3000 is occupied, retry with `PORT=3100 npm run dev` and adjust the curl target
  (operational fallback, not an AC change).
- **Render assertion**: `curl -s http://localhost:3000/` and grep for:
  - `TETRIS` (the `<h1>` from `app/page.tsx`) — proves the RSC server component rendered.
  - evidence the client bundle is referenced (a `<script type="module">` / hydration marker) —
    proves the `"use client"` `GameContainer` island is wired.
- If the HTML is a vinext error page or a blank shell, capture the stderr and treat as a Step-1/2
  defect (most likely: plugin-rsc not registered, or an alias miss). Fix per `structure.md`'s
  revision notes, re-boot.
- **Shut down** the background dev server cleanly after the check.

## Step 4 — regression fence + commit

- `git status` must show: new `vite.config.ts`, modified `package.json`, and (pre-existing,
  untracked, unrelated) `tetris.html` + the ticket/work docs. No changes to `next.config.ts`,
  `vercel.json`, `tsconfig.json`, `vitest.config.ts`, or any file under `app/`, `components/`,
  `lib/`.
- Commit the two implementation files (config + package.json) with a message referencing the
  ticket. Work artifacts (`docs/active/work/T-006-01-02/*`) are committed by the normal RDSPI flow.
- Do **not** commit `tetris.html` (unrelated stray) or the `.next/` build dir.

## Commit boundary

One implementation commit is appropriate: `vite.config.ts` and the `package.json` flip are a single
atomic capability ("app now runs on vinext") — splitting them yields an intermediate state where
the config exists but nothing uses it (harmless) or scripts point at vinext with no config file
committed (works via auto-detection but is less reviewable). Landing both together keeps the tree
in a coherent, boot-verified state.

Suggested message:
```
feat(T-006-01-02): add vite.config.ts (vinext) + flip dev/build/start scripts to vinext

- vite.config.ts: canonical `plugins: [vinext()]` (auto-wires plugin-rsc, plugin-react, tsconfig paths)
- package.json: add "type":"module"; dev/build/start now invoke vinext (lint/test unchanged)
- verified: `npm run dev` boots vinext dev server on :3000 and renders the Tetris board
```

## Rollback / risk handling

- If boot fails irrecoverably (vinext 0.2.0 rendering bug), the change is trivially revertable
  (`git checkout -- package.json && rm vite.config.ts`) — the app returns to Next. Document the
  failure in `progress.md` and surface it in `review.md` rather than forcing a broken green.
- The ESM flip has no expected fallout (no CJS `.js` configs); if some tool complains, the fix is a
  targeted `.cjs` rename of that file only — no such file is anticipated.

## Definition of done for this ticket

- `vite.config.ts` present, wiring vinext (and thereby plugin-rsc). ✓ AC clause 1
- `package.json` is ESM with `dev`/`build`/`start` → vinext. ✓ AC clause 2
- `npm run dev` boots the vinext dev server and the game renders at localhost. ✓ AC clause 3
- No out-of-scope files touched. ✓ scope fence
