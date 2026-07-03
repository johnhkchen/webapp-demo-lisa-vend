# T-009-01-02 — Structure: wire-clay-tokens-into-tailwind-theme

## Files touched

| File | Change | Why |
|---|---|---|
| `app/globals.css` | Modified | Add kit `@import`; repoint `--background`/`--foreground` to `var(--clay-bg)`/`var(--clay-ink)`. |

No other file is created, deleted, or modified. No test files change (no existing test
targets `globals.css` content or resolved CSS custom-property values — confirmed in Research).

## `app/globals.css` — exact shape of the change

Two edits, both confined to lines 1-22 (the `@import` line and the first `:root`/`@theme
inline` pair). Everything from line 24 onward (the piece-color `@theme static` block through
the closing `body { font-family: ... }` rule) is byte-identical before and after.

### Edit 1 — add the kit import

Insert immediately after the existing `@import "tailwindcss";` (currently line 1), before the
header comment block:

```css
@import "tailwindcss";
@import "../styles/vendor/b28-clay.css";
```

Placement rationale (from Design): CSS requires `@import` statements to precede all
non-import/charset rules, so it must land in the top two lines; ordering the kit import
second (after Tailwind's own) is the natural read order — framework first, then the
supporting design-token vendor file — and has no cascade effect either way since the kit only
defines custom properties.

### Edit 2 — repoint the `:root` values

Replace:

```css
:root {
  --background: #0a0a0f;
  --foreground: #ededf2;
}
```

with:

```css
:root {
  --background: var(--clay-bg);
  --foreground: var(--clay-ink);
}
```

The `@theme inline` block directly below (`--color-background: var(--background);
--color-foreground: var(--foreground);`) is **not modified** — it already does exactly what
the ticket wants once its inputs change.

## Interfaces / boundaries

- **Public interface unchanged.** `bg-background` and `text-foreground` remain the Tailwind
  utility names consumers use (`app/layout.tsx` needs no edit). The only thing that changes is
  what color those utilities resolve to.
- **New dependency edge:** `app/globals.css` → `styles/vendor/b28-clay.css` (via `@import`).
  This is the first consumer of the vendored kit file; it existed on disk but unreferenced
  since T-009-01-01.
- **No new custom properties are introduced at the consumer layer.** `--background`/
  `--foreground` keep their existing names; they now hold `var()` references into the kit's
  namespace (`--clay-bg`, `--clay-ink`) instead of literals. Any future edit to the kit's
  `--clay-bg`/`--clay-ink` values (via a `just sync-kit` re-run) flows through automatically
  with zero changes needed in `globals.css`.
- **Ordering constraint:** the kit `@import` must resolve before the `:root` block that
  references `var(--clay-bg)`/`var(--clay-ink)` is evaluated. CSS custom property resolution
  is not import-order-sensitive in the way JS module evaluation is (all `:root` declarations
  merge into one custom-property scope regardless of source-file order), but keeping the
  import physically above the block that consumes it is the correct, readable convention and
  is required in any case for `@import`'s own top-of-file placement rule.

## Sequencing

Single-step change — both edits land in the same file in the same commit; there's no
meaningful sub-ordering between "add the import" and "repoint the values" since neither
compiles/is meaningful alone as a committable unit (repointing without the import would
reference undefined custom properties; importing without repointing leaves the acceptance
criterion unmet). Implement as one atomic edit to `app/globals.css`.

## Verification surface (elaborated in Plan)

- `npm run build` (`vinext build`) must succeed — explicit acceptance criterion.
- Resolved `--color-background` must equal the kit's `--clay-bg` (`#faf8f5`), not the old
  `#0a0a0f` — checked via a dev-server render or a build-output inspection, not a new unit
  test (no existing test infra asserts on computed CSS values, and adding a browser-level CSS
  assertion harness is out of proportion to a two-line CSS change).
- Existing test suite (`npm run test`, 302 tests) must stay green — regression check only,
  since none of those tests touch `globals.css`.
