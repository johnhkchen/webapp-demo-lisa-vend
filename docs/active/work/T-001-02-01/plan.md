# Plan — T-001-02-01: wire-tailwind-styling

Ordered, independently verifiable steps to execute the Structure blueprint. The whole change is
small enough to land in one commit, but the steps are sequenced so each intermediate state is
correct (page always renders the dark canvas) and each verification is objective.

## Testing strategy (up front)

There is no application *logic* here — nothing to unit test. This mirrors the scaffold ticket's
stance (a test runner is deferred to the first `lib/` logic epic; adding one now is scope creep).
Verification is therefore **build/emit/serve-level**, and the AC's "visibly takes effect,
surviving build" is discharged by an *objective grep* of the emitted production CSS, not a
subjective eyeball. Concretely, the pass/fail gate is:

- **Before** (baseline, already observed): `.bg-background` / `.text-foreground` /
  `--color-background` are **absent** from the emitted prod CSS (bridge is dead).
- **After**: those same tokens/utilities are **present** in the emitted prod CSS (bridge is
  live) — and `build` + `lint` stay green, page stays HTTP 200 with the dark canvas.

That before→after delta is the proof the token bridge is now wired end-to-end.

## Steps

### Step 1 — Consume the bridge utilities in `layout.tsx`
- Add `bg-background text-foreground` to the `<body>` `className`
  (→ `"min-h-full flex flex-col bg-background text-foreground"`).
- Rationale: this marks the utilities "used" so Tailwind v4's content detection emits them (and
  their backing `--color-*` token) into the build.
- Verify (independent): `npm run lint` → exit 0.
- Intermediate state is safe: body now has utilities *and* the raw color rules (identical color).

### Step 2 — Remove the redundant raw color rules in `globals.css`
- Delete `background: var(--background);` and `color: var(--foreground);` from the `body` rule.
- Keep `html, body { height: 100% }`, keep `body { font-family: … }`, keep `:root` vars, keep
  `@theme inline`.
- Refresh the doc comment to state colors flow token → utility (no longer set directly on body).
- Rationale: removes the duplicate color source so the bridge is the *single* path; the
  `:root` vars remain the single value source.
- Verify (independent): `npm run lint` → exit 0.

### Step 3 — Production build + emit proof
- `npm run build` → must exit 0, `/` prerendered static, TypeScript clean.
- Locate emitted prod CSS: `find .next/static -name '*.css'`.
- Grep it for `\.bg-background`, `\.text-foreground`, and `--color-background`:
  - **All three must now be present** (they were absent at baseline). This is the AC's
    "surviving `npm run build`" proof, made objective.

### Step 4 — Dev-server proof
- `npm run dev` (background), poll `curl -s -o /dev/null -w "%{http_code}" localhost:3000` →
  `200`.
- Fetch the HTML; confirm `<body>` carries `bg-background text-foreground` and the TETRIS
  heading renders (page not broken). Stop the dev server.
- Rationale: discharges the AC's "in `npm run dev`" clause.

### Step 5 — Commit
- Stage `app/layout.tsx`, `app/globals.css`, and the `docs/active/work/T-001-02-01/` artifacts.
- Single atomic commit: `feat(styling): wire Tailwind @theme token bridge end-to-end`.
- Do **not** edit the ticket frontmatter (Lisa handles phase/status transitions).

## Verification matrix

| Check | Command | Expected |
|---|---|---|
| Lint clean | `npm run lint` | exit 0, no warnings |
| Build passes | `npm run build` | exit 0, `/` static |
| Bridge utility emitted | grep prod CSS `.bg-background` | present (was absent) |
| Bridge utility emitted | grep prod CSS `.text-foreground` | present (was absent) |
| Bridge token emitted | grep prod CSS `--color-background` | present (was absent) |
| Dev serves | `curl :3000` | HTTP 200 |
| Body wired | grep served HTML | `bg-background text-foreground` on body |
| No visual regression | inspect page | dark `#0a0a0f` canvas, TETRIS heading intact |

## Rollback / deviation policy

- If Step 3's grep does **not** show the utilities after the edit, the bridge is misconfigured —
  stop, re-examine `@theme inline` and the class names, document the deviation in `progress.md`
  before any further change. (Not expected: research confirmed layout utilities already emit.)
- Any change beyond the two files above (e.g., needing a `tailwind.config`) is out of plan and
  must be documented as a deviation with rationale before proceeding — it would signal the v4
  wiring assumption was wrong.

## Scope guardrails (restate)

- No new theme tokens, no brand palette, no glow/motion, no font tokens — theme epic owns those.
- No touching `components/`, `lib/`, or `page.tsx`.
- No test runner added.
