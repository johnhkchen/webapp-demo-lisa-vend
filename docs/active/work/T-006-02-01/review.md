# Review — T-006-02-01: run-vinext-check-resolve-app-router-findings

## Outcome

**vinext's App Router support fully covers this app. `vinext check` reports 100% compatible
(4 supported, 0 partial, 0 issues) — zero unresolved App Router incompatibilities.** No
findings surfaced, so the ticket lands with **no source code changes**: a clean verification
pass. This is the expected and correct result for this app's near-minimal App Router surface
(one static layout + one static page, a single type-only `next` import, no dynamic APIs).

## What changed

### Source / config
- **Nothing.** `lib/`, `components/`, `app/`, `vite.config.ts`, `next.config.ts`,
  `package.json` are all byte-for-byte unchanged. `git status` shows no source diff
  attributable to this ticket.

### Docs (this ticket's artifacts)
- Added `docs/active/work/T-006-02-01/{research,design,structure,plan,progress,review}.md`.

### Transient
- `vinext build` emitted a `dist/` directory during verification; removed afterward so the
  tree stays clean.

## Evidence (reproducible)

| Check | Command | Result |
|---|---|---|
| AC gate — compat scan | `npx vinext check` | 100% compatible, **0 partial, 0 issues** |
| Actual-usage build | `npx vinext build` | ✓ all 5 environments built, no compat errors |
| Logic/gameplay intact | `npx vitest run` | ✓ 163/163 tests, 18/18 files |

The build is the strongest evidence: it drives the real vinext/Vite/RSC pipeline
(client-ref + server-ref analysis, RSC/client/SSR builds) against the app's *actual* code,
which is what the AC's "actual usage" clause demands beyond the static scan.

## Acceptance criteria — verdict

> `vinext check` reports zero unresolved App Router incompatibilities; any fixes are
> config/framework-glue only (lib/ and components render logic byte-for-byte unchanged). If
> findings require real code changes, they are logged as a split-out signal.

- ✅ **Zero unresolved incompatibilities** — `check`: 0 partial / 0 issues.
- ✅ **Fixes config-only** — satisfied vacuously; there were no fixes to make.
- ✅ **`lib/` + render logic byte-for-byte unchanged** — no source diff; 163 tests green.
- ✅ **Split-out signal for real code changes** — none required; policy defined in
  `design.md` Decision 2 if a future re-check surfaces one.

**All criteria met.**

## Test coverage

No new tests added — this ticket introduces no product code, so there is nothing new to
cover, and adding tests would breach the no-code-change scope. Existing coverage (163 tests
across the pure `lib/` logic and the component layer) was used as a regression guard and is
fully green, confirming the runtime swap did not perturb behavior.

## Open concerns / follow-ups

1. **`dist/` not gitignored (housekeeping, deferred).** `vinext build` writes to `dist/`,
   which is absent from `.gitignore` (only `/.next/` is listed). Not fixed here because it
   is build/deploy-pipeline glue, not App Router compat — it belongs with the Cloudflare
   Workers deploy ticket in E-006. Recommend adding `/dist/` (and confirming `/.vinext/`)
   to `.gitignore` there. Removed the artifact this run so nothing stray is committed.

2. **`check` static-analysis blind spot (informational).** `vinext check` and `vinext build`
   both note that dynamic APIs (`headers()`, `cookies()`, …) can't be classified at build
   time (route shows `? Unknown`). Harmless today — the app uses none — but if a future
   ticket adds a route handler, server action, or dynamic API, `check` alone will not catch
   incompatibility. The `build` + test corroboration in this ticket's method should be
   retained as the pattern for future compat gates.

3. **`check` output footer is generic onboarding text.** The "Recommended next steps"
   section (`vinext init`, add `type: module`, create `vite.config.ts`) is not a set of
   findings against this repo — all are already done. Flagged so a reviewer doesn't misread
   it as outstanding work.

## Handoff

No human action required to accept this ticket. The compat claim is backed by three
reproducible commands. The only carried-forward item is the `/dist/` gitignore, which is
intentionally routed to the E-006 deploy ticket rather than absorbed here.
