# T-009-01-03 — Plan: load-lora-karla-fonts

## Steps

### Step 1 — Add font loaders to `app/layout.tsx`
- Import `Lora`, `Karla` from `next/font/google`.
- Instantiate both with `subsets: ["latin"]`, `display: "swap"`, distinct `variable` names
  (`--font-lora`, `--font-karla`), and the weights from design.md.
- Apply both `.variable` classes on `<html>` alongside the existing `h-full antialiased`.
- **Verify:** `npm run build` completes without a TypeScript error and without a Google Fonts
  fetch error (vinext's `vinext:google-fonts` plugin throws a build error with the HTTP status if
  the fetch fails — research.md). A clean, silent build here is the pass signal for this step.

### Step 2 — Repoint typography in `app/globals.css`
- Replace the tail `body { font-family: system-ui, ... }` rule with
  `body { font-family: var(--font-karla), var(--clay-font-body); }`.
- Add `h1, h2, h3 { font-family: var(--font-lora), var(--clay-font-display); }` immediately after.
- **Verify:** `npm run build` still exits 0 (no CSS syntax error; both custom properties resolve
  since Step 1 already defined them on `<html>`).

### Step 3 — Dev-server render verification (the acceptance criterion itself)
- `npm run dev` in the background; curl `http://localhost:3000/` and confirm HTTP 200.
- Inspect the served page/CSS for evidence the fonts loaded: the injected
  `<style data-vinext-fonts>`/`<link rel="preload">` tags should reference `_vinext_fonts` asset
  paths for Lora and Karla (per the vinext plugin's self-hosting mechanics — research.md), and
  the compiled `globals.css` served over HTTP should show `font-family: var(--font-karla), ...`
  and `var(--font-lora), ...` for the respective selectors (not `system-ui` anywhere on `body`).
- This satisfies the literal acceptance wording: "verified in a dev-server render (computed
  font-family no longer system-ui)." A curl-based inspection of the served HTML + CSS is the
  same class of verification T-009-01-02 used (build output + live dev-server curl), since a
  headless browser/computed-style tool isn't part of this repo's toolchain.
- Stop the dev server after verification.

### Step 4 — Full regression pass
- `npm run test` — expect the existing 32 files / 302 tests to stay green (no test touches
  `app/layout.tsx`, `app/globals.css`, or font behavior today — research.md).
- `npm run lint` — expect clean, zero warnings (repo lints at `--max-warnings 0`).
- `npm run build` — final confirmation, full production build, 0 exit code, and note whether
  `.vinext/fonts/` now contains cached Lora/Karla `.woff2` files (evidence the self-hosting path
  actually executed, not just that TypeScript compiled).

## Testing strategy

- **No new unit/component test.** Per design.md and research.md: the acceptance criterion is
  itself a dev-server/computed-style claim, `vitest.config.ts` doesn't run the vinext Google-Fonts
  transform (so a jsdom-rendered `layout.tsx` would not actually reflect the real font pipeline —
  a test asserting computed style here would be testing a mock of the real mechanism, not the
  mechanism itself, i.e. false confidence), and the sibling CSS-token ticket (T-009-01-02) set
  precedent for verifying this class of change via build output + live dev-server curl instead.
- **Regression suite** (`npm run test`, `npm run lint`, `npm run build`) is the safety net that
  nothing existing broke; Step 3's dev-server curl is the actual verification of the new behavior.

## Commit plan

Small enough for a single atomic commit (both files change together; splitting `layout.tsx`'s
font-variable definitions from `globals.css`'s consumption of them would leave an intermediate
commit where the CSS variables are unused or the CSS references undefined variables — not a
meaningful independent unit). One commit:
- `app/layout.tsx` + `app/globals.css` together, message scoped to `T-009-01-03`.

## Risks / mitigations

- **Google Fonts fetch fails in this environment** (offline/blocked egress) → `npm run build`
  throws a clear `GoogleFontsHttpError` per the vinext plugin (research.md); mitigation is simply
  to confirm network reachability before Step 1's verify, same precondition `just sync-kit`
  already relies on elsewhere in this epic.
- **Weight mismatch** (a component wants a Lora/Karla weight not loaded) → not exercised by any
  current component (page.tsx/GameOverlay.tsx use `font-black`, a synthetic weight neither face
  ships — pre-existing, unrelated to this ticket, noted in design.md). Out of scope to fix here.
