# Design — T-006-02-01

## Problem restated

The acceptance criterion is binary and tool-defined: **`vinext check` reports zero
unresolved App Router incompatibilities**, with any fixes confined to config/framework-glue
and `lib/` + render logic unchanged. If findings need real code changes, they are logged as
a split-out signal rather than absorbed.

So the design question is not "how do we make the app compatible" (product code is fixed and
out of scope) but "**how do we establish the compatibility claim credibly, and how do we
handle each class of finding `check` could return**."

## Decision 1 — `vinext check` is the primary gate, but not the only evidence

The AC names `vinext check` explicitly, so it is the gate of record. However, the AC also
says compatibility must cover the app's **actual usage**. `vinext check` is documented
(and self-reports) as static analysis that cannot see dynamic API usage. A green static
scan on an app that *did* use dynamic APIs would be a false negative.

**Decision:** treat `vinext check` as the AC gate, and corroborate it with two
higher-signal checks that exercise actual usage:
1. `vinext build` — a real production build through the vinext/Vite/RSC pipeline
   (client-ref analysis, server-ref analysis, RSC/client/SSR environments). This forces
   the App Router boundary to resolve for real.
2. `vitest run` — the existing 163-test suite, proving `lib/` + gameplay are unaffected.

Rejected: relying on `vinext check` alone. It satisfies the letter of the AC but not the
"actual usage" clause, and gives no protection against a static-analysis blind spot.

## Decision 2 — finding-triage policy (the decision tree that governs Implement)

`vinext check` can return three classes of item (supported / partial / issue). The Implement
phase follows this fixed policy per finding:

| Finding class | Action |
|---|---|
| Supported (✓) | None. Record in report. |
| Partial (△) — resolvable by **config/framework-glue** | Apply the minimal glue fix (e.g. a `vite.config.ts` / `next.config.ts` / package.json option). Re-run `check`. |
| Partial/Issue requiring **`lib/` or render-logic change** | **Do not fix.** Log a split-out signal under `.lisa/signals/`, leave code untouched, note in review. |
| Issue in a **library** (e.g. Tailwind) | If glue-fixable, fix; else log split-out signal. |

This keeps the "config-only, no gameplay change" invariant mechanical rather than
judgment-call-by-judgment-call.

Rejected alternative: "fix whatever check flags." Violates the AC's explicit scope fence
against touching `lib/`/render logic and risks scope creep into a verification ticket.

## Decision 3 — what "resolve" means when there are zero findings

Empirically (run during Research), `vinext check` reports **100% compatible — 4 supported,
0 partial, 0 issues**:

```
Libraries: 1/1 compatible        ✓ tailwindcss
Project structure:               ✓ App Router (app/)  ✓ 1 page  ✓ 1 layout
Overall: 100% compatible (4 supported, 0 partial, 0 issues)
```

`vinext build` succeeds end-to-end (5/5 environments built; the only note is the generic
`? Unknown` route-classification caveat, which is a static-analysis limitation, not an
incompatibility — the app has no dynamic APIs to classify). `vitest run` is 163/163 green.

**Decision:** the correct resolution is the *null resolution* — there is nothing to fix, so
the Implement phase makes **zero code changes**. The AC's "any fixes are config-only" clause
is satisfied vacuously (there are no fixes), and "`lib/` and render logic byte-for-byte
unchanged" is satisfied trivially (git shows no source diff). This is a legitimate and
common outcome for a verification-gated ticket: the value delivered is the *confirmed claim*
plus the reproducible evidence, not a diff.

Rejected: manufacturing a change to "have something to show." That would violate the scope
fence and add risk for zero benefit.

## Decision 4 — recommended-next-steps noise in `check` output

`vinext check` prints "Recommended next steps: run `vinext init` … add `type: module` …
create vite.config.ts". All of those are **already done** (this repo has `type: module`,
`vite.config.ts`, and the deps). The recommendations are `check`'s generic onboarding
footer, not findings against this repo. **Decision:** treat them as informational; they are
not incompatibilities and require no action. Document this explicitly so a reviewer doesn't
misread the footer as unresolved work.

## Decision 5 — keep the tree clean after verification

`vinext build` emits a `dist/` directory that is not in `.gitignore`. Since this ticket's
build run is verification-only, `dist/` is removed after the run so the ticket produces no
stray artifacts. Adding `/dist/` to `.gitignore` is deferred to the build/deploy ticket
(it is glue that belongs with the deploy pipeline, not this compat check) and flagged as a
signal/open concern rather than absorbed here.

## Outcome

Design collapses to: run `check` (gate) + `build` + tests (corroboration), apply the
triage policy, and — given the observed all-green result — land the ticket as a **no-code-
change verification** with documented evidence and one deferred housekeeping note.
