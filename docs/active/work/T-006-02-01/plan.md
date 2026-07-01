# Plan — T-006-02-01

## Strategy

Execute the verification, apply the finding-triage policy (design Decision 2), and land the
outcome. Because the observed state is all-green, most steps are confirmations rather than
edits. Each step is independently verifiable.

## Steps

### Step 1 — Baseline the working tree
- **Do:** `git status --short` to confirm no pre-existing source changes.
- **Verify:** only ticket-doc and unrelated pre-existing changes present; no `app/`,
  `components/`, `lib/`, or config edits attributable to this ticket.
- **Commit:** n/a (baseline).

### Step 2 — Run the AC gate: `vinext check`
- **Do:** `npx vinext check`.
- **Verify:** report shows `0 partial, 0 issues` → "100% compatible". Capture the full
  report into `progress.md`.
- **Decision point:** if issues/partials appear, branch to Step 5 (triage). Otherwise
  continue.

### Step 3 — Corroborate actual usage: `vinext build`
- **Do:** `npx vinext build`.
- **Verify:** all build environments (client-ref, server-ref, RSC, client, SSR) complete;
  no compat errors. The generic `? Unknown` route-classification note is acceptable (it is a
  static-analysis caveat, not a failure) because the app uses no dynamic APIs.
- **Cleanup:** remove the emitted `dist/` directory (verification-only artifact).

### Step 4 — Confirm gameplay/logic untouched: `vitest run`
- **Do:** `npx vitest run`.
- **Verify:** full suite green (expected 163 tests / 18 files). This proves `lib/` +
  components are behaviorally intact — no accidental edits.

### Step 5 — Triage findings (contingency; skipped on all-green)
- For each `check` finding, apply the design Decision 2 table:
  - config/framework-glue-fixable → apply minimal fix in `vite.config.ts` /
    `next.config.ts` / `package.json`; re-run Step 2 to confirm resolution; commit.
  - needs `lib/`/render change → write a split-out signal under `.lisa/signals/`; leave
    code untouched; note in review.
- **On the observed all-green path this step is a no-op.**

### Step 6 — Final tree check
- **Do:** `git status --short`.
- **Verify:** no source diff introduced by this ticket; only the six `docs/active/work/
  T-006-02-01/*.md` artifacts are added. `dist/` is gone.

### Step 7 — Write Review
- Summarize evidence, confirm each AC clause, list open concerns (e.g. deferred `/dist/`
  gitignore), and hand off.

## Testing strategy

- **No new unit/integration tests.** This ticket adds no product code, so there is nothing
  new to unit-test. Adding tests would violate the "no code change" scope.
- **Verification = the three commands** (`check`, `build`, `vitest run`). Together they
  cover: static compat (check), real App Router resolution through the runtime (build), and
  logic/gameplay integrity (tests).
- **Acceptance mapping:**
  - "`vinext check` reports zero unresolved App Router incompatibilities" → Step 2.
  - "any fixes are config/framework-glue only" → Step 5 policy (vacuous: no fixes).
  - "`lib/` and components render logic byte-for-byte unchanged" → Step 4 + Step 6.
  - "findings requiring real code changes logged as split-out signal" → Step 5 policy
    (none surfaced).

## Commit plan

- On the all-green path there are **no code commits** — only the RDSPI doc artifacts (which
  Lisa's workflow handles). If Step 5 had produced glue fixes, each fix would be one atomic
  commit referencing `T-006-02-01`.

## Rollback

Nothing to roll back — no source changes. If a contingency glue fix had been made and later
proved wrong, `git revert` of that single commit restores the prior state.
