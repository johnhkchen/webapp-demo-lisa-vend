# Design — T-006-03-01: retire-vercel-and-next-compiler-wiring

## Decision summary

1. **`vercel.json`** → **delete** (git rm). Dead Vercel deploy config; nothing reads it.
2. **`next.config.ts`** → **delete** (git rm). Its sole option (`typescript.ignoreBuildErrors:
   false`) is a Next-*compiler* build gate that is a **no-op under vinext** (Vite build doesn't
   type-check). vinext builds cleanly with no `next.config` present (verified).
3. **`next-env.d.ts`** → **reconcile, not git-track**. It's already git-ignored/generated. Delete
   the stale on-disk copy (points at legacy `.next/dev/types/…`) so vinext regenerates the canonical
   vinext copy (`.next/types/…`). No committed-tree change results.
4. **`tsconfig.json`** → **reconcile** the type-path plumbing to vinext: drop the legacy
   `.next/dev/types/**/*.ts` include entry (keep `.next/types/**/*.ts`). Keep `next-env.d.ts` in
   `include` and keep the `plugins:[{name:"next"}]` language-service entry.

Definition of done: a fresh `npm run build` succeeds afterward, and `git status` shows only the
intended deletions/edit with no stray files committed.

## Per-file rationale

### `vercel.json` — delete (no alternatives worth weighing)
The deploy target is Cloudflare Workers via `vinext deploy`. The Vercel preset, build command, and
`main` auto-deploy declaration are meaningless off Vercel. Keeping it is precisely the "two deploy
paths named in-repo" ambiguity the ticket exists to remove. Delete.

### `next.config.ts` — delete vs. reconcile-to-vinext

**Option A — Delete entirely (CHOSEN).**
- The only option present is `typescript.ignoreBuildErrors: false`. Research proved vinext's build
  never type-checks, so this option enforces nothing; the file's comments are all Next-compiler /
  Vercel reasoning ("`npm run build` is the Vercel build command", "`next build` no longer runs
  ESLint"). It is 100% Next-compiler wiring.
- Verified: `vinext build` with the file moved aside → exit 0, zero warnings. vinext falls back to
  its defaults; no behavior changes.
- Result: one fewer file, one deploy/build story, no dead reasoning left to mislead a reader.

**Option B — Reconcile: keep a trimmed `next.config.ts` with vinext-relevant options.**
- Rejected: there are **no** options this app needs vinext to honor (no rewrites, redirects,
  images, MDX config, `output`, base path). A config file that only exists to hold defaults is
  noise, and vinext explicitly supports running with **no** `next.config` (or an inline `nextConfig`
  in `vite.config.ts` if ever needed). Keeping an empty shell reintroduces exactly the
  compiler-era cruft we're retiring.

**Option C — Move the type gate into `vite.config.ts` / a `typecheck` script.**
- Rejected **for this ticket** (scope). Re-establishing type-checking as a gate under vinext is a
  real, separate decision (add `tsc --noEmit` to `build` or `lint`, or a CI `typecheck` step). It
  is *not* "retire dead config" and would change the build's behavior/runtime. Surfaced as an
  **open concern** in Review for a follow-up, not done here. (Note: the gate was already inert the
  moment build flipped to vinext in T-006-01-02 — this ticket doesn't regress it, it just stops
  pretending the file still enforces it.)

### `next-env.d.ts` — reconcile (let vinext own it)

It is git-ignored, so it is never part of a commit; "remove" in the AC cannot mean a tracked
deletion. Two sub-choices:

**Chosen:** delete the **stale working-tree copy** and let `vinext build` regenerate the canonical
one (`import "./.next/types/routes.d.ts"`). This makes the on-disk file consistent with vinext's
typegen and with the reconciled tsconfig. Because vinext writes it with `wx` (create-if-absent),
the only way to refresh a stale copy is to delete-then-build — exactly this step. Verified in Plan.

**Rejected:** leaving the stale copy in place. It still resolves (both `.next/types` and
`.next/dev/types` exist on disk today), so nothing breaks *now* — but it references the legacy
compiler path we're retiring, so after we drop `.next/dev/types` from tsconfig it would point at a
path tsconfig no longer includes. Regenerating removes that inconsistency for near-zero cost.

### `tsconfig.json` — reconcile the include, minimally

- **Drop** `".next/dev/types/**/*.ts"`: it's the legacy Next-compiler dev-types output. vinext emits
  route types to `.next/types/**`, already included. Removing the legacy entry is the tsconfig-level
  analog of retiring `.next/dev`'s role — it makes the type plumbing name one path.
- **Keep** `"next-env.d.ts"` in `include`: vinext still generates it and it pulls in `next` ambient
  types the app relies on.
- **Keep** `plugins:[{ "name":"next" }]`: this is the Next **TypeScript language-service** plugin —
  editor-only route IntelliSense, not a build input and not Vercel/compiler deploy wiring. vinext
  apps keep it. Removing it is out of scope and would degrade editor DX for no correctness gain.
- **Do not** touch `moduleResolution`, `jsx`, `paths`, etc. — all still correct under Vite.

This is the narrowest edit that leaves tsconfig internally consistent after the deletions; skipping
it would leave a dangling reference to a path we've decided is legacy. Kept deliberately small to
respect the "config retirement, no behavior change" boundary.

## Explicitly out of scope (grounded in Research)

- **Docs** still naming Vercel (`CLAUDE.md` L6, `SEED.md`, `vision.md`): narrative retargeting is
  T-006-03-02 / a docs pass, not config retirement.
- **`wrangler.jsonc` + deploy docs**: T-006-03-02.
- **`.gitignore` missing `dist/`**: pre-existing migration gap; unrelated to Vercel/Next-compiler
  config. Note in Review, don't fix here (avoid scope creep + cross-ticket file collisions).
- **Re-adding a type-check gate**: open concern, follow-up decision.
- **Dependencies** (`next`, `react-server-dom-webpack`, transitive `@vercel/og`): not config
  *wiring*; untouched.

## Risk & reversibility

Low risk: three of four changes are deletions of files nothing reads at build time, and the fourth
is a one-line tsconfig include removal. Fully reversible via git. The AC's own safety check — a
fresh `npm run build` must still pass — is the load-bearing verification and is run after each
change (Plan §Verification).
