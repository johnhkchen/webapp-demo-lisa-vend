# Review — T-006-02-02: verify-build-lint-vitest-green-under-vinext

## Outcome

**All three quality gates are green under vinext, with no game/logic diff.** Build and test
already passed; **lint was broken** — `eslint --max-warnings 0` reported 1756 problems (10
errors, 1746 warnings), 100% of them in `dist/`, the `vinext build` output. Root cause: the
migration (T-006-01-02) redirected `build` to emit `dist/`, but ESLint's `globalIgnores` list
still only covered the old runtime's `.next/`, `out/`, `build/`. Fix: add `dist/**` to
`globalIgnores` — one config entry, the direct analog of ignoring `.next/`. Source was already
lint-clean; the fix touches no product code.

This gap was invisible to T-006-02-01 (the prior compat ticket) because that ticket verified
build + test but **never ran lint**, and it deleted `dist/` afterward. This ticket is where the
combined build+lint+test gate is exercised together for the first time under vinext — exactly
what it was scoped to do.

## What changed

### Source / config (1 file, +4 lines)
- **`eslint.config.mjs`** — added `"dist/**"` to the `globalIgnores([...])` array, with a
  three-line comment explaining it is vinext's build output (the migration's analog of
  `.next/`). No rules added, relaxed, or removed.

### Explicitly unchanged (no-diff invariant)
- `lib/`, `components/`, `app/` — byte-for-byte unchanged (`git status` on those paths: empty).
- All 18 `*.test.*` files, `vite.config.ts`, `vitest.config.ts`, `next.config.ts`,
  `package.json` — untouched.

### Docs (this ticket's artifacts)
- `docs/active/work/T-006-02-02/{research,design,structure,plan,progress,review}.md`.

### Transient
- `vinext build` regenerates `dist/` during verification; removed after each run so the tree
  stays clean and nothing stray is committed.

## Evidence (reproducible)

| Gate | Command | Before fix | After fix |
|---|---|---|---|
| Build | `npm run build` | ✅ exit 0, 5 envs | ✅ exit 0, 5 envs |
| Lint  | `npm run lint`  | ❌ 1756 problems (all in `dist/`) | ✅ exit 0, **0 problems** (with `dist/` present) |
| Test  | `npm test`      | ✅ 163/163, 18 files | ✅ 163/163, 18 files |

Key corroborating measurement: `eslint --max-warnings 0 --ignore-pattern 'dist/**'` exited 0
**before** the fix — proving the failure was 100% generated output, and that ignoring `dist/`
is the *only* delta between failing and passing. Lint was verified green **with `dist/` present
on disk**, not by cleaning it — so the gate is robust to the realistic pipeline order
(build → lint against the same tree).

## Acceptance criteria — verdict

> `npm run build` (vinext) produces a clean production build, `npm run lint` passes with
> `--max-warnings 0`, and `npm test` (vitest) passes the full suite — all green, no game/logic
> diff.

- ✅ **Build clean** — exit 0, all 5 vinext environments built, no compat/type errors.
- ✅ **Lint passes `--max-warnings 0`** — exit 0, zero problems, with build output present.
- ✅ **Full vitest suite green** — 163/163 tests, 18/18 files.
- ✅ **No game/logic diff** — only `eslint.config.mjs` changed; `lib/`/`components/`/`app/` and
  all tests byte-for-byte unchanged; 163-test suite green as the active regression guard.

**All criteria met.**

## Test coverage

No new tests — this ticket adds no product code, so there is nothing new to cover, and adding
tests would breach the no-diff scope. The existing 163 tests (pure `lib/` logic + component
layer) served as the regression guard and stayed fully green, confirming the config change did
not perturb behavior. Coverage gap assessment: the fix is a lint-config ignore entry, which has
no runtime surface; the appropriate "test" is the lint gate itself, now passing.

## Open concerns / follow-ups

1. **`dist/` not gitignored (housekeeping, deferred — carried over from T-006-02-01).**
   `.gitignore` lists `/.next/`, `/out/`, `/build`, but not `/dist/`. Intentionally **not**
   fixed here: ESLint ignores are independent of git ignores (proven — the ESLint entry is the
   load-bearing fix for this AC regardless of git), and T-006-02-01 already assigned the
   `.gitignore` change to the E-006 Cloudflare Workers deploy ticket. Recommend the deploy
   ticket add `/dist/` (and confirm `/.vinext/`) to `.gitignore`. Until then, contributors must
   avoid staging `dist/` manually — low risk since it is regenerated and this ticket removed it.

2. **`.vinext/` deliberately not added to ESLint ignores.** It is an empty dot-dir and ESLint
   flat config default-ignores dot-directories; adding it would be dead config. If a future
   vinext version writes lintable `.js`/`.ts` into a non-dot cache dir, revisit.

3. **`vinext build` still emits `? Unknown` route classification** (informational, carried from
   T-006-02-01). Static analysis can't detect dynamic APIs; harmless today (app uses none). The
   build+test corroboration pattern should be retained if a future route handler/server action
   is added.

## Handoff

No human action required to accept. The change is a single, well-commented ESLint ignore entry;
the three-gate table above is fully reproducible from a clean checkout (`npm run build && npm
run lint && npm test`). Committed as `5f3babe`. Ticket phase/status left untouched for Lisa to
advance.
