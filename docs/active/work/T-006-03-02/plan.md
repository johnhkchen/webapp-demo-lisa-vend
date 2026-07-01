# Plan — T-006-03-02: generate-wrangler-and-document-cloudflare-deploy

Four small, independently-verifiable steps, each committable atomically. No source or dependency
changes, so the testing strategy is: (a) byte-fidelity of the generated artifact against the tool,
(b) JSON validity, (c) the pre-existing green build/lint/test surface stays green, (d) no stray
tracked build output.

## Step 1 — Add `wrangler.jsonc` (the deploy artifact)

- Write `wrangler.jsonc` with the exact `none/none` generator bytes captured in Research.
- **Verify:**
  - Re-run the generator into a temp file and `diff` against the committed file → **empty**
    (byte-fidelity to the tool — the AC's "matches what vinext emits").
  - `node -e "const fs=require('fs');JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'))"` → ok.
  - Assert `name==="webapp-demo-lisa-vend"`, `main==="vinext/server/fetch-handler"`,
    `assets.directory==="dist/client"`, and **no** `kv_namespaces`/`images` keys.
- **Commit:** `feat(T-006-03-02): add wrangler.jsonc (vinext→Cloudflare Workers deploy artifact)`.

## Step 2 — Ignore Cloudflare/vinext build output in git

- Append to `.gitignore` a labeled block ignoring `/dist/` and `.vinext/`.
- **Verify:** `git check-ignore dist .vinext` prints both; a scratch `dist/client/x` is ignored.
- **Commit:** `chore(T-006-03-02): git-ignore dist/ and .vinext/ (vinext build output)`.

## Step 3 — Write `docs/deploy.md` (authenticated deploy runbook)

- Author the runbook per Structure's section outline: overview, `wrangler.jsonc` field table,
  prerequisites (`wrangler` auth), the one-time `vinext init --platform=cloudflare
  --data-cache=none --image-optimization=none` wiring (deps + vite plugin), `npx @vinext/cloudflare
  deploy` (with the deprecated `vinext deploy` alias + `--dry-run` note), and an explicit
  **Out of scope** call-out (live deploy + `*.workers.dev` smoke-test).
- **Verify:** doc names the real generator command (`init`, not `deploy`) for wrangler generation;
  states the live deploy is out of scope; `wrangler.jsonc` field descriptions match the committed
  file. Manual read-through against the AC checklist.
- **Commit:** `docs(T-006-03-02): document authenticated Cloudflare Workers deploy (vinext deploy)`.

## Step 4 — Retarget the CLAUDE.md deploy narrative

- Edit the `## Project` deploy clause ("deployed to Vercel" → "deployed to **Cloudflare Workers**
  via vinext") and add a one-line `docs/deploy.md` pointer in `## Commands`.
- **Verify:** `grep -n Vercel CLAUDE.md` returns nothing in the deploy sentence; the pointer
  resolves to an existing file.
- **Commit:** `docs(T-006-03-02): retarget CLAUDE.md deploy narrative to Cloudflare`.

## Final verification (before Review)

Run the full gate and confirm the invariants from Structure:

| Check | Command | Expected |
|---|---|---|
| Build | `npm run build` | exit 0 |
| Lint | `npm run lint` | 0 problems |
| Test | `npm test` | 163/163 |
| Wrangler byte-fidelity | generator `diff` | empty |
| Wrangler valid JSON | `node -e JSON.parse` | ok |
| Build output ignored | `git check-ignore dist .vinext` | both printed |
| No source diff | `git status --porcelain -- lib components app vite.config.ts package.json` | empty |
| Only intended paths | `git status --porcelain` | `wrangler.jsonc`, `docs/deploy.md`, `.gitignore`, `CLAUDE.md` (+ work/ docs) |

## Testing strategy & rationale

- **No unit tests added — correct for this ticket.** It ships a static config artifact + docs and
  touches zero runtime code, so there is no new behavior to unit-test. The equivalent of a test is
  the **byte-fidelity diff** (proves the artifact equals the tool's output) plus JSON-validity and
  the unchanged 163-test suite (proves no incidental regression).
- **Integration/live deploy:** intentionally **out of scope** (AC). A real `vinext deploy` needs
  Cloudflare auth + the deps/vite wiring the runbook documents; performing it is the login-gated
  follow-up, not this ticket.
- **Risk & mitigation:** the only real risk is committing build output (`dist/`) — mitigated by
  Step 2 running before any build in the final gate, and the `git status` check. Reversibility is
  trivial: every change is additive config/docs; no code path depends on them at runtime.

## Deviation protocol

If the generator output differs from the Research capture (e.g. a vinext version bump), regenerate,
commit the tool's *actual* bytes, and note the delta in `progress.md` — the committed file must
always equal the tool, never a hand-edit.
