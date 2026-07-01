# Review — T-006-03-01: retire-vercel-and-next-compiler-wiring

## Outcome

**The repo now names exactly one build/deploy path (vinext → Cloudflare Workers).** All three
Vercel/Next-compiler config artifacts are retired, and a **fresh `npm run build` still succeeds** —
the acceptance criterion's own load-bearing proof that nothing removed was load-bearing. Lint (0
problems) and the full vitest suite (163/163) are green, and `lib/`/`components/`/`app/` are
byte-for-byte unchanged. This was pure configuration retirement: **no product code, no test, no
dependency, and no runtime behavior changed.**

The one non-obvious discovery driving the design: `next.config.ts`'s sole option
(`typescript.ignoreBuildErrors: false`) was a **Next-compiler build gate that is already a no-op
under vinext** — `vinext build` is a Vite/esbuild build that never type-checks (no `tsc` anywhere in
vinext's build path). So removing it loses no *enforced* gate; the gate went inert back at the
T-006-01-02 build flip. This ticket stops the file from pretending otherwise.

## What changed

### Deleted (tracked)
- **`vercel.json`** — Vercel Next.js preset + `main` auto-deploy declaration. Dead: the deploy
  target is Cloudflare Workers via `vinext deploy`; nothing reads this file.
- **`next.config.ts`** — held only `typescript.ignoreBuildErrors: false` (a Next-compiler-only,
  now-inert build gate) and Vercel/`next build` reasoning in its comments. Verified that
  `vinext build` runs cleanly with no `next.config` present (exit 0, zero warnings).

### Edited (tracked)
- **`tsconfig.json`** — removed the legacy `".next/dev/types/**/*.ts"` `include` entry (−1 line).
  vinext emits route types to `.next/types/**` (already included); `.next/dev/types/**` was the old
  Next-compiler dev-types path. Kept `next-env.d.ts`, `paths`, and `plugins:[{name:"next"}]` (the
  editor-only Next TS language-service plugin) unchanged.

### Regenerated (git-ignored — no committed-tree effect)
- **`next-env.d.ts`** — deleted the stale on-disk copy (imported the legacy `./.next/dev/types/…`)
  and let `vinext build` recreate the canonical vinext copy (`import "./.next/types/routes.d.ts"`).
  This file is git-ignored (last line of `.gitignore`), so it is never committed; the reconciliation
  is purely to keep the working tree consistent with vinext's typegen and the reconciled tsconfig.

### Unchanged (no-diff invariant, verified)
`lib/`, `components/`, `app/`, all 18 `*.test.*` files, `vite.config.ts`, `vitest.config.ts`,
`package.json`, `eslint.config.mjs`, `.gitignore`, `postcss.config.mjs` — untouched.

## Commits
1. `chore(T-006-03-01): remove dead vercel.json (deploy is vinext→Cloudflare)`
2. `chore(T-006-03-01): drop next.config.ts + legacy .next/dev types include`

## Evidence (reproducible)

| Gate | Command | Result |
|---|---|---|
| **Fresh build (the AC)** | `rm -rf dist .next && npm run build` | ✅ exit 0, 5 vinext envs |
| Build (steady state) | `npm run build` | ✅ exit 0 |
| Lint | `npm run lint` (`--max-warnings 0`) | ✅ exit 0, **0 problems** |
| Test | `npm test` (vitest) | ✅ **163/163**, 18/18 files, 1.68s |
| `next.config.ts`/`vercel.json` gone | `test ! -e …` | ✅ both absent |
| `next-env.d.ts` reconciled | `grep '.next/types/routes' next-env.d.ts` | ✅ matches, no `/dev/` |
| Product-code untouched | `git status --porcelain -- lib components app` | ✅ empty |

## Test coverage assessment

No tests were added, and that is correct for this ticket: it removes build/deploy **configuration**
and touches zero runtime code, so there is no new behavior to unit-test. Coverage is provided by
(a) the AC's fresh-build check — the direct proof that no removed config was load-bearing — and
(b) the pre-existing 163-test vitest suite, which still passes unchanged, confirming no incidental
game/component regression. **Gap:** none introduced by this change.

## Open concerns / handoff notes

1. **Type-checking is no longer a build gate** (pre-existing, not introduced here). `vinext build`
   does not run `tsc`, so type errors do not fail the build — and `npm run lint` does not do full
   type-aware checking either. This became true at the T-006-01-02 build flip; deleting
   `next.config.ts` merely removes the misleading appearance of a gate. **If the team wants type
   safety enforced**, add a `typecheck` script (`tsc --noEmit`) to `build` or CI. This is a
   deliberate follow-up decision, **out of scope** for a "retire dead config" ticket.
2. **`.gitignore` does not list `dist/`** (vinext's build output). It is git-ignored only by ESLint,
   not by git — so `git status` shows `dist/` as untracked after any build. I cleaned it after every
   build here and did not commit it, but this is a **pre-existing migration gap** (unrelated to
   Vercel/Next-compiler config) worth a one-line `.gitignore` fix in a separate change.
3. **Narrative docs still name Vercel** — `CLAUDE.md` L6 ("deployed to Vercel"), `SEED.md`,
   `docs/knowledge/vision.md`. These are documentation, not config wiring; retargeting them belongs
   to **T-006-03-02** (`…document-cloudflare-deploy`) / a docs pass, not this config ticket.
4. **Next follow-on ticket:** T-006-03-02 (`depends_on: [T-006-03-01]`) generates `wrangler.jsonc`
   and documents the authenticated `vinext deploy`. This ticket unblocks it — the deploy config
   surface is now clean and single-path.

## Acceptance criteria — verdict

> vercel.json is deleted and Next-compiler-specific wiring (next.config.ts, next-env.d.ts) is
> removed or reconciled to vinext; a fresh `npm run build` still succeeds afterward, confirming
> nothing removed was load-bearing.

- ✅ **`vercel.json` deleted.**
- ✅ **`next.config.ts` removed** (its only option was inert under vinext; build clean without it).
- ✅ **`next-env.d.ts` reconciled to vinext** (regenerated to the `.next/types/…` path; stays
  git-ignored) and **`tsconfig.json` reconciled** (legacy dev-types include dropped).
- ✅ **Fresh `npm run build` succeeds** (exit 0) — plus lint and the full test suite green, with no
  product-code diff.

**Met in full.**
