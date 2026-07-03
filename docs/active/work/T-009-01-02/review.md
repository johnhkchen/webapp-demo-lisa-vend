# T-009-01-02 — Review: wire-clay-tokens-into-tailwind-theme

## Summary

Wired the vendored `styles/vendor/b28-clay.css` kit (landed unreferenced by T-009-01-01) into
`app/globals.css`'s existing `--background`/`--foreground` → `@theme inline` →
`--color-background`/`--color-foreground` pipeline, so `bg-background`/`text-foreground`
(already applied to `<body>` in `app/layout.tsx`, no edit needed there) now resolve to the
kit's warm off-white (`#faf8f5`) and warm ink (`#1c1917`) instead of the old hand-rolled dark
neon pair (`#0a0a0f`/`#ededf2`).

Scope was deliberately narrow, matching the ticket and E-009's own story split: only the
background/foreground token pair changed. The oklch piece-color palette, `.glass`/`.glow*`/
`.flash`/`.motion*` utilities, font loading, and any component retoning are explicitly out of
scope here (owned by T-009-01-03 and S-009-02+).

## Files changed

| File | Change |
|---|---|
| `app/globals.css` | 2 edits: added `@import "../styles/vendor/b28-clay.css";` (line 2); repointed `:root`'s `--background`/`--foreground` from hardcoded hex to `var(--clay-bg)`/`var(--clay-ink)`. |
| `docs/active/work/T-009-01-02/{research,design,structure,plan,progress}.md` | **new** — RDSPI artifacts for this ticket. |

No other file touched. `app/layout.tsx` required no change — the Tailwind utility class names
(`bg-background`, `text-foreground`) are unchanged; only what color they resolve to changed.

**Note on working-tree state:** `app/globals.css` had pre-existing uncommitted hunks unrelated
to this ticket already in the working tree when this session started (a piece-palette oklch
retone, a `.flash` tint retone, a comment wording tweak — visible in `git diff app/globals.css`
but not authored in this session). Per the RDSPI Concurrency model this looks like another
in-flight ticket on the same branch/file. My two edits don't overlap those hunks; see
`progress.md` for detail. Whoever merges/reviews the full branch diff should be aware
`app/globals.css`'s diff includes both this ticket's change and that other in-flight work.

## Acceptance criterion — verified

> `app/globals.css` imports the vendored kit file and `--color-background`/
> `--color-foreground` resolve to the kit's warm off-white/ink values (not
> `#0a0a0f`/`#ededf2`); `npm run build` succeeds and the rendered body background is the new
> light clay tone.

Fully verified, two ways:
1. **Build output** (`dist/client/_next/static/css/index.BGpKmtxp.css`): compiled CSS confirms
   `--clay-bg:#faf8f5` → `--background:var(--clay-bg)` → `--color-background:var(--background)`
   and the equivalent chain for `--clay-ink:#1c1917` → `--foreground` → `--color-foreground`.
2. **Live dev server**: `npm run dev`, curled the running app (200 OK, `bg-background
   text-foreground` present on `<body>`) and the served `/app/globals.css` directly — same
   resolved chain, confirmed with real HTTP responses, not just static analysis.

`npm run build` exits 0 cleanly (5/5 build stages).

## Test coverage

No new unit tests — consistent with T-009-01-01's precedent and this ticket's nature: a
two-value CSS custom-property re-source has no `lib/`/component logic to unit-test. Verified
end-to-end instead (build output + live dev-server render, both cited above).

Regression suite run unmodified:
- `npm run test` — 32 test files, 302 tests, all passing.
- `npm run lint` — clean, zero warnings (repo lints at `--max-warnings 0`).

**Gap, by design:** no automated test asserts `--color-background` stays wired to
`--clay-bg` over time (e.g. if a future edit accidentally reverts to a literal hex). This
mirrors T-009-01-01's own accepted gap around kit-sync drift — CSS custom-property wiring
isn't naturally unit-testable without a browser-level style assertion harness, which doesn't
exist in this repo and is out of proportion to add for a 2-line change.

## Open concerns / known limitations

1. **Shared-file concurrency.** `app/globals.css` is being edited by more than one in-flight
   ticket on this branch right now (see note above). Not a defect in this ticket's work, but
   worth flagging to whoever merges/reconciles the branch — the full file diff will look
   larger than this ticket's actual scope until the other in-flight work also lands.
2. **No drift detection.** Same class of gap as T-009-01-01: if `styles/vendor/b28-clay.css`
   is re-synced and `--clay-bg`/`--clay-ink` are renamed or removed upstream, nothing catches
   it automatically short of `npm run build` failing on an undefined custom property (browsers
   don't error on unresolved `var()` — they fall back to the property's initial/inherited
   value, which for `background-color`/`color` on `<body>` would be effectively invisible/
   transparent, not a loud failure). Out of scope for this ticket; flagging for awareness.
3. **Visual-only confirmation, no screenshot artifact.** Verification was via computed
   CSS-chain inspection (build output + curl'd dev CSS), not a captured screenshot. This is
   sufficient to prove the token pipeline resolves correctly (the acceptance criterion's
   actual technical claim), but a human wanting to *see* the new warm-off-white body hasn't
   been handed a visual artifact — trivial to produce on request if wanted.

## Nothing critical needs human attention

This ticket's change is small, additive, and fully verified against its literal acceptance
criterion in both a production build and a live dev render. The only non-obvious thing for a
human reviewer to know is the shared-file concurrency note above — not a blocker, just
context for reading the branch's full diff. Ready to unblock `T-009-01-03` (font loading,
`depends_on: [T-009-01-02]`).
