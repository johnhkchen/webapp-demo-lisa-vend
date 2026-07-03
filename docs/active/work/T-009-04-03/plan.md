# T-009-04-03 — Plan: page-header-clay-retone

## Steps

### Step 1 — Add `--color-primary` token to `app/globals.css`

Edit `:root` (add `--primary: var(--clay-primary);`) and `@theme inline` (add `--color-primary:
var(--primary);`), per Structure. No other lines in the file change.

**Verify:** `npm run build` (or `npm run dev` + inspect computed styles) — confirms Tailwind
generates `.text-primary`/`.bg-primary`/etc. without error and that `--color-background`/
`--color-foreground` still resolve unchanged (visually spot-check any component already using
`bg-background`/`text-foreground`, e.g. `layout.tsx`'s body, is unaffected).

**Commit 1:** `feat(T-009-04-03): register --color-primary clay token`

### Step 2 — Retone `app/page.tsx`

Apply the three class-group swaps from Structure: `<h1>` → `text-5xl font-bold tracking-tight
text-primary sm:text-6xl`; subtitle `<p>` → adds `text-foreground/50`; footer `<p>` → adds
`text-foreground/30`. No JSX structure, import, or content changes.

**Verify:**
- `grep -n "from-cyan-400\|via-fuchsia-400\|to-violet-400\|bg-clip-text\|text-transparent\|text-white/50\|text-white/30\|font-black" app/page.tsx` returns nothing — directly checks the AC's negative assertions.
- `npm run build` succeeds (Next.js/vinext type-checks JSX + Tailwind class generation).
- `npm run lint` passes (no unused-import or JSX lint regressions).
- Manual render: `npm run dev`, load `/`, confirm the `ROWCLEAR` title is steel blue, Lora,
  solid (not gradient/transparent), and subtitle/footer read as muted ink-on-cream (not
  invisible, not pure white-on-white — the light page background makes it easy to visually
  confirm contrast is sane at both opacity steps).

**Commit 2:** `feat(T-009-04-03): retone page header off neon gradient onto clay steel-blue/ink`

## Testing strategy

- **No unit/component test exists or is added.** `page.tsx` has never had a dedicated test file
  (confirmed in Research), and the AC does not name one (contrast with T-009-04-01, whose AC
  explicitly named `GameOverlay.test.tsx`). This is a pure presentational className change with
  no logic, state, or conditional rendering to unit-test.
- **Full existing suite still runs** as a regression check even though no test targets this
  file directly — `npm test` (or the project's actual test command) should show the same
  pass count before and after, confirming no accidental breakage elsewhere (e.g. if a shared
  token name collided, which it does not per Structure's "no existing binding is touched").
- **Build is the primary verification gate** for this ticket: a `className` typo or a malformed
  `@theme inline` line would surface as a Tailwind build warning/error or a visibly broken
  render, not a test failure — so `npm run build` + manual render carry the real verification
  weight here, matching this ticket's low-risk, presentation-only nature.
- **Grep-based AC check** (Step 2, first bullet) is the most direct verification of the ticket's
  literal acceptance criteria and should run before considering Step 2 done.

## Sequencing rationale

Two steps, two commits, strictly ordered (token binding must land before its consumer) per
Structure's ordering note. Each step is independently buildable and verifiable — Step 1 alone
changes zero visible behavior (additive token, unused until Step 2), so it's safe to commit and
verify in isolation before touching the component. No step depends on anything outside this
ticket's two files.

## Risks / edge cases

- **Tailwind v4 arbitrary-property resolution:** `@theme inline` bindings that reference a
  `:root` var which itself references a var defined outside `:root` (i.e. `--clay-primary`,
  defined in the vendored kit's own `:root` block, loaded via `@import` at the top of
  `globals.css`) must resolve correctly at build time. This is already proven to work for
  `--background`/`--clay-bg` and `--foreground`/`--clay-ink` (identical shape, already shipping)
  — `--primary`/`--clay-primary` follows the exact same resolution path, so this is a known-safe
  pattern, not a new risk class.
- **Contrast:** steel blue (`#44679b`) on warm off-white (`#faf8f5`) is the brand's own stated
  header pairing (user's global CLAUDE.md visual-identity section) — no independent contrast
  check needed beyond the manual render spot-check in Step 2.
