# T-009-01-03 — Progress: load-lora-karla-fonts

## Completed

1. **`app/layout.tsx`** — added `next/font/google` loaders for `Lora` (weights 600/700,
   `--font-lora`) and `Karla` (weights 400/500/700, `--font-karla`), both `display: "swap"`,
   `subsets: ["latin"]`. Applied both `.variable` classes on `<html>` alongside the existing
   `h-full antialiased`. Matches plan.md Step 1 exactly.
2. **`app/globals.css`** — replaced the tail `body { font-family: system-ui, ... }` rule with
   `body { font-family: var(--font-karla), var(--clay-font-body); }` and added
   `h1, h2, h3 { font-family: var(--font-lora), var(--clay-font-display); }` immediately after.
   Matches plan.md Step 2 exactly.
3. **Build verification (Step 1/2 gate)** — `npm run build` exits 0. Confirmed
   `.vinext/fonts/{karla-6a4f727ee58a,lora-091021d9a293}/` cached the downloaded `.woff2` files,
   and `dist/client/_next/static/_vinext_fonts/...` contains the same files copied into the
   production bundle — the vinext Google-Fonts self-hosting path (research.md) executed for
   real, not just a type-check pass.
4. **Dev-server verification (Step 3 / the acceptance criterion itself)** — `npm run dev`, curled
   `http://localhost:3000/`:
   - HTTP 200.
   - `<html class="h-full antialiased __variable_lora_0rubk4z __variable_karla_0y0cyg5">` —
     both font variable classes present.
   - Those classes define `--font-karla: 'Karla', 'Karla Fallback'` and
     `--font-lora: 'Lora', 'Lora Fallback'` in an inlined `<style>` block.
   - `<link rel="preload" href="/_next/static/_vinext_fonts/lora-.../....woff2" as="font" ...>`
     and the equivalent for Karla — both self-hosted, not pointing at `fonts.gstatic.com`.
   - Served `/app/globals.css` shows `font-family: var(--font-karla), var(--clay-font-body);` on
     `body` and `font-family: var(--font-lora), var(--clay-font-display);` on `h1, h2, h3` —
     `system-ui` is gone from the `body` rule.
   - `<h1 class="bg-gradient-to-r ... ">ROWCLEAR</h1>` is present in the initial render (no
     `font-family` override at the element/utility level), so it inherits the new `h1` rule.
   - Dev server stopped after verification (`pkill -f "vinext dev"`).
5. **Regression pass (Step 4)** —
   - `npm run test`: 32 test files, 302 tests, all passing (unchanged from before this ticket —
     no test touches fonts or `app/`).
   - `npm run lint`: clean, zero warnings.
   - `npm run build`: re-confirmed 0 exit code after the full change set.

## Deviations from plan

None. All four steps executed as written in `plan.md`.

## Remaining

Nothing — all plan steps complete, acceptance criterion verified. Proceeding to Review.
