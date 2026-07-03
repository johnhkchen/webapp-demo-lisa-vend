# T-009-01-03 — Review: load-lora-karla-fonts

## Summary

Loaded Lora (display) + Karla (body) via `next/font/google` in `app/layout.tsx`, exposed each as
a CSS custom property (`--font-lora`, `--font-karla`) on `<html>`, and repointed
`app/globals.css`'s typography to consume them: `body` now resolves to Karla (with the vendored
kit's `--clay-font-body` token as fallback), and a new `h1, h2, h3` rule resolves to Lora (with
`--clay-font-display` fallback), replacing the old hardcoded `system-ui, -apple-system, "Segoe
UI", Roboto, sans-serif` stack.

Scope was deliberately narrow, matching the ticket and the epic's own scope note (T-009-01-02's
review.md explicitly named "font loading" as out of its scope, owned by this ticket): only the
two font-loader definitions in `layout.tsx` and the tail-of-file typography rule in `globals.css`
changed. No component, no retoning of the existing neon-gradient headings, no touching the
vendored `styles/vendor/b28-clay.css` kit file.

## Files changed

| File | Change |
|---|---|
| `app/layout.tsx` | Added `next/font/google` imports (`Lora`, `Karla`); two loader `const`s with `variable: "--font-lora"`/`"--font-karla"`; applied both `.variable` classes to `<html>`'s existing `className`. |
| `app/globals.css` | Replaced the tail `body { font-family: system-ui, ... }` rule with `var(--font-karla), var(--clay-font-body)`; added `h1, h2, h3 { font-family: var(--font-lora), var(--clay-font-display); }`. |
| `docs/active/work/T-009-01-03/{research,design,structure,plan,progress}.md` | **new** — RDSPI artifacts for this ticket. |

No other file touched.

## Acceptance criterion — verified

> `app/layout.tsx` loads Lora and Karla via `next/font/google`; the rendered body carries the
> Karla font-family by default and an h1/h2 heading renders in Lora, verified in a dev-server
> render (computed font-family no longer system-ui).

Fully verified end-to-end via live `npm run dev` + `curl http://localhost:3000/`:
- `<html class="h-full antialiased __variable_lora_0rubk4z __variable_karla_0y0cyg5">` — both
  `next/font` variable classes present.
- Those classes define `--font-karla: 'Karla', 'Karla Fallback'` and
  `--font-lora: 'Lora', 'Lora Fallback'` (inlined `<style>` in the served HTML).
- Served `/app/globals.css`: `body { font-family: var(--font-karla), var(--clay-font-body); }`
  and `h1, h2, h3 { font-family: var(--font-lora), var(--clay-font-display); }` — `system-ui` no
  longer appears anywhere in the `body` rule.
- `<link rel="preload" href="/_next/static/_vinext_fonts/{lora,karla}-.../*.woff2" as="font" ...>`
  present for both families — self-hosted (vinext's Google-Fonts plugin downloads + serves from
  the app's own origin), not a runtime call to `fonts.gstatic.com`.
- `<h1>ROWCLEAR</h1>` (`app/page.tsx`) is present in the unconditional initial render with no
  element-level `font-family` override, so it inherits the new `h1` rule — the concrete
  "h1/h2 heading renders in Lora" instance.
- `npm run build`: exits 0; `.vinext/fonts/{karla-*,lora-*}/` cached the downloaded `.woff2`
  files, and `dist/client/_next/static/_vinext_fonts/...` contains the same files copied into
  the production bundle — the self-hosting path executed for real.

## Test coverage

No new automated test — consistent with T-009-01-02's precedent and this ticket's own acceptance
wording ("verified in a dev-server render"). `vitest.config.ts` does not register the `vinext()`
Vite plugin (it only resolves the `@/*` path alias — research.md), so the `vinext:google-fonts`
transform never runs under `vitest run`; a jsdom-rendered `layout.tsx` under vitest would not
exercise the real font-loading mechanism at all, so a unit test here would assert against a mock
of the transform rather than the transform itself — false confidence, not real coverage. Verified
instead via build output (cached + bundled `.woff2` files) and a live dev-server render (computed
CSS + preload links + HTML), both cited above.

Regression suite run unmodified, after this session's edits (twice — once before, once after an
unrelated concurrent edit to `app/globals.css`'s piece-color oklch values landed mid-session from
another in-flight ticket on this branch, per the RDSPI Concurrency model):
- `npm run test` — 32 test files, 302 tests, all passing both times.
- `npm run lint` — clean, zero warnings, both times.
- `npm run build` — exit 0, both times.

**Gap, by design:** no automated test asserts `body`/`h1` stay wired to the `next/font`
variables over time (e.g. if a future edit reverts the `font-family` rule to a literal stack).
Same class of accepted gap T-009-01-02 flagged for its own CSS-token wiring — not naturally
unit-testable without a real browser/computed-style harness, which doesn't exist in this repo.

## Open concerns / known limitations

1. **Shared-file concurrency, again.** `app/globals.css` was edited by another in-flight ticket
   on this branch *during this session* (an unrelated piece-color oklch retune, landed between
   this ticket's Implement and Review phases). Confirmed my two rules (`body`, `h1, h2, h3`)
   survived untouched and the full regression suite was re-run clean afterward. Not a defect in
   this ticket's work, but the same file-contention pattern T-009-01-02's review already flagged
   — worth a second mention for whoever reconciles the full branch diff.
2. **`font-black` on existing headings is unaffected and pre-existing.** `page.tsx`'s and
   `GameOverlay.tsx`'s `h1`/`h2` use Tailwind's `font-black` (weight 900). Neither Lora nor Karla
   ships a 900 static weight in Google Fonts, so the browser synthetic-bolds from the loaded
   600/700 Lora weight — same visual behavior as before this ticket (which also had no 900-weight
   face loaded). Not a regression; out of scope to address (design.md), since retoning those
   headings to the clay palette/weights is later theme-epic work, per T-009-01-02's own scope
   note.
3. **Build-time network dependency reintroduced, deliberately.** T-001-01-01 (the original
   scaffold) removed a generator-provided `next/font/google` (Geist) specifically to avoid a
   build-time fetch dependency, with a note that a future "theme epic" should self-host a
   branded font instead of reintroducing that fetch. This ticket does exactly that reintroduction
   — but it *is* self-hosting (vinext's plugin downloads once, caches in `.vinext/fonts/`, and
   serves the `.woff2` files from the app's own origin at runtime — confirmed in Verified section
   above), which is what T-001-01-01's own note asked for. Flagging for a human reviewer: this is
   an intentional, ticket-directed reversal of a prior architectural decision, not an oversight —
   see design.md's "Prior art / tension" section for the full reasoning.
4. **No offline-build fallback.** If a future `npm run build` runs somewhere without egress to
   Google Fonts and `.vinext/fonts/` isn't already cached (e.g. a fresh clone before first build),
   the build will fail loudly with a `GoogleFontsHttpError` rather than degrading to the fallback
   fonts. This is inherent to `next/font/google`'s build-time-fetch design, not something this
   ticket's scope covers mitigating (e.g. vendoring the woff2 files directly would be a
   `next/font/local` redesign, a different and larger change).

## Nothing critical needs human attention

The change is small, additive, and fully verified against its literal acceptance criterion via
both build artifacts and a live dev-server render. The two things worth a human's attention are
context, not blockers: the shared-`globals.css` concurrency note (#1, consistent with the prior
sibling ticket) and the deliberate reversal of T-001-01-01's font-loading decision (#3), which is
what this ticket was scoped to do.
