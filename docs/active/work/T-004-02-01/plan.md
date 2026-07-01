# Plan — T-004-02-01: glassmorphic-panel-utilities

Ordered, independently-verifiable steps to implement the glass panel utility. Each step names its
verification. The single source change is small; most of the plan is *proving* it meets the
grep-in-committed-build and visible-render halves of the acceptance criterion.

## Testing strategy

There is **no unit-test surface** here — the deliverable is a CSS class, and the repo's test runner
(vitest) covers `lib/` logic only. Verification is, matching the sibling ticket T-004-01-01 and the
AC's own wording:

- **Build + grep** for the emit-into-production-CSS half (automatable, objective).
- **Visual probe** in `npm run dev` for the renders-blurred-translucent-bordered half
  (throwaway, observed, reverted).
- **Gates**: `npm run lint` (`--max-warnings 0`) and `npm run build` exit 0; boundary check that
  only `app/globals.css` changed in source.

## Steps

### Step 1 — Baseline: confirm `.glass` is absent

- `npm run build`, then grep the emitted chunk (`.next/static/chunks/*.css`) for `\.glass` and
  `backdrop-filter`.
- **Expected:** 0 matches. Establishes the "absent at baseline" contrast the AC implies.
- (Already effectively confirmed during Research's probe, which was reverted; re-confirm cleanly.)

### Step 2 — Add the `.glass` block to `app/globals.css`

- Append the doc comment + `@layer components { .glass { … } }` block per Structure, after
  `@theme static` and before `html, body`.
- Values per Design Decision 3: `color-mix` white ~6% fill; `blur(12px) saturate(1.4)` with the
  `-webkit-` prefix written first; `1px` white ~14% hairline border; depth `box-shadow` + inset
  top rim.
- **Verify:** file reads top-to-bottom in the Structure skeleton order; no other lines changed.

### Step 3 — Prove emission in the committed state (no consumer)

- `npm run build`, then grep the emitted CSS chunk for the `.glass` rule.
- **Expected:** a `.glass{…}` rule present, containing `backdrop-filter:blur(12px)` (and a
  `-webkit-backdrop-filter`), a translucent `background-color`, and a `1px solid` border — with
  **no** `.glass` reference anywhere in `app/`, `components/`, or `lib/` source.
- This is the load-bearing check: it proves `@layer components` defeats tree-shaking without a
  consumer (the whole point of Decision 1). Commit-blocking if it fails.

### Step 4 — Visual probe over a busy background (throwaway)

- Add a temporary route/element under `app/` (e.g. `app/_glassprobe/page.tsx`) with:
  - a **busy** backdrop — overlapping neon radial-gradient blobs / a bright multi-hue gradient,
    so blur and translucency are unmistakable;
  - a centered panel with `className="glass rounded-2xl p-8"` containing a line of text.
- `npm run dev`, load the probe route, and confirm by eye: the panel is **blurred** (background
  smeared behind it), **translucent** (colors bleed through), and **bordered** (hairline edge).
  Capture the observation in `progress.md`.
- **Then revert the probe entirely** (delete the route). Re-run `git status` to confirm it's gone.
- **Note:** the probe uses the *literal* class `glass` (not a dynamic name), so Tailwind/CSS
  resolves it directly — no extractor caveat like the sibling's `bg-piece-${x}` trap.

### Step 5 — Gates + boundary check

- `npm run lint` → exit 0 (zero warnings; ensures no stray probe file lingers under lint scope).
- `npm run build` → exit 0.
- `git status` / `git diff --stat` → the **only** modified source file is `app/globals.css`
  (plus the `docs/active/work/T-004-02-01/*` artifacts). No `components/`, `lib/`, or app-tick
  edits — epic hard boundary held.

### Step 6 — Commit

- `git add app/globals.css docs/active/work/T-004-02-01` and commit:
  `feat(T-004-02-01): add glassmorphic .glass panel utility to theme`
- Incremental-commit rule: this is one cohesive additive change, so a single feat commit is
  correct (matches the sibling ticket's one-commit shape). Artifacts included per repo convention.

## Rollback / risk

- **If Step 3 shows `.glass` tree-shaken** (unexpected, given the probe): fall back to a plain
  top-level `.glass` rule (also proven to emit) — but re-check composability (Decision 1 warns
  unlayered CSS beats utilities). Prefer `@source inline("glass")` + `@utility` only if a layered
  rule somehow fails. Document any such deviation in `progress.md` before proceeding.
- **If lightningcss drops the `-webkit-` prefix** (browserslist edge): the manually-written
  `-webkit-backdrop-filter` in source guarantees Safari coverage regardless (Decision 4).
- **Shared-file risk with T-004-02-02:** the block is self-fenced and appended; a later glow block
  appends after it. No overlap expected. Lock serialization is the safety net, not the plan.

## Definition of done

- `.glass` present in the committed production CSS build (grep), absent at baseline.
- Throwaway probe visibly showed blur + translucency + hairline border; probe reverted.
- Lint + build green; source diff = `app/globals.css` only.
- `review.md` written.
