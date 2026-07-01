# Structure — T-005-01-01: add-vercel-project-config

The file-level blueprint. What is created/modified/deleted, the exact shape of the config, and the
boundaries. Not code execution — the shape of the change.

## Change set

| Action | Path | Purpose |
|--------|------|---------|
| **create** | `vercel.json` | The Vercel project config: Next.js preset + `npm run build` build command + `$schema`. The sole product file. |
| **create** | `docs/active/work/T-005-01-01/research.md` | RDSPI artifact. |
| **create** | `docs/active/work/T-005-01-01/design.md` | RDSPI artifact. |
| **create** | `docs/active/work/T-005-01-01/structure.md` | RDSPI artifact (this file). |
| **create** | `docs/active/work/T-005-01-01/plan.md` | RDSPI artifact. |
| **create** | `docs/active/work/T-005-01-01/progress.md` | RDSPI artifact. |
| **create** | `docs/active/work/T-005-01-01/review.md` | RDSPI artifact. |
| modify | — | none |
| delete | — | none |

**Not touched (asserted by boundary):** `app/**`, `components/**`, `lib/**`, `next.config.ts`,
`package.json`, `package-lock.json`, `.gitignore`, `tsconfig.json`, any ticket/story/epic
frontmatter.

## The one product file — `vercel.json`

Exact content to be written at repo root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build"
}
```

### Field contract

- `$schema` (string, URL) — the official Vercel `vercel.json` JSON-Schema. Non-behavioral; enables
  editor + CLI validation. First key by convention.
- `framework` (string, enum slug) — `"nextjs"`. Satisfies AC "declares the Next.js framework
  preset."
- `buildCommand` (string) — `"npm run build"`. Satisfies AC "npm run build as build command."
  Resolves to `next build`, consistent with the `nextjs` preset.

Trailing newline at EOF. Two-space indent. UTF-8, no BOM.

## Boundaries & interfaces

- **Public interface:** the file itself *is* the interface — it is consumed by the Vercel
  build/deploy platform (and by `npx vercel build` locally), not imported by any repo code. No TS
  types, no runtime coupling.
- **No effect on the app build graph.** `next build` does not read `vercel.json`; only the Vercel
  platform / Vercel CLI does. Therefore adding it cannot change `npm run build`, lint, or test
  output. (Confirmed: build already green this session.)
- **Track isolation.** `vercel.json` is a fresh path shared with no other active ticket. Per the
  epic DAG, the sibling build-gate and Git-auto-deploy tickets are downstream/separate; no
  file-lock contention expected.

## `.gitignore` interaction

No change. `.gitignore` ignores `.vercel` (credentials/link dir) and `.next/` (output) but does
**not** ignore `vercel.json`. The new file will be tracked normally. Verify during Implement that
`git status` shows `vercel.json` as untracked-to-be-added (not ignored).

## Ordering of changes

Because this is a single declarative file, ordering is trivial:

1. Write RDSPI artifacts R→D→S (done / in progress).
2. Write `plan.md`.
3. Write `vercel.json` (Implement).
4. Verify (JSON parse, field check, `npm run build` re-confirm, `git status` boundary check).
5. Commit `vercel.json` + all artifacts atomically.
6. Write `progress.md` and `review.md`.

No inter-file dependency inside the change set beyond "artifacts describe the file."

## Verification shape (what each check asserts)

- **Parse:** `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` → exit 0
  ⇒ well-formed JSON ⇒ "config schema validates" (structural half).
- **Fields:** grep/inspect confirms `framework === "nextjs"` and `buildCommand === "npm run
  build"`.
- **Build gate:** `npm run build` exit 0 (the command the config names actually passes).
- **Boundary:** `git status --porcelain` lists only `vercel.json` + `docs/active/work/T-005-01-01/*`
  — nothing under `app/`, `components/`, `lib/`.
- **Not executable here:** live `npx vercel build` (CLI absent in sandbox) — deferred to CI/human,
  recorded in `review.md`.
