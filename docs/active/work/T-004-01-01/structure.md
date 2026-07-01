# Structure — T-004-01-01: per-tetromino-neon-color-tokens

The shape of the change: which files change, the exact block added, the public interface it
exposes, and the ordering. Not code beyond the one CSS block that *is* the deliverable.

## Files

| File | Action | Nature |
|---|---|---|
| `app/globals.css` | **modified** | Add one `@theme static` block with seven tokens + doc comment |
| `docs/active/work/T-004-01-01/*.md` | added | RDSPI artifacts (this workflow) |

Nothing else changes in the committed diff. Explicitly **not** touched: `components/Cell.tsx`,
`components/Board.tsx`, `lib/constants.ts`, `app/layout.tsx`, `app/page.tsx`, `postcss.config.mjs`,
`package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`. (A throwaway swatch may
touch `app/` transiently during verification but is reverted before commit — see Plan.)

## The added block (blueprint)

Placed in `app/globals.css` *after* the existing `@theme inline` block (keeps the two theme
concerns adjacent but separate: `inline` bridges structural bg/fg vars; `static` declares the
literal neon palette). Shape:

```css
/* Per-tetromino neon palette (E-004). One signature hue per piece: I/O/T/S/Z/J/L.
 * `static` forces emission even before any component consumes them — Tailwind v4 tree-shakes
 * unused theme vars, and this vocabulary is defined ahead of its Cell/Board consumers.
 * Generates --color-piece-* vars + bg-/text-/border-piece-* utilities. */
@theme static {
  --color-piece-i: oklch(0.85 0.15 195); /* cyan   */
  --color-piece-o: oklch(0.87 0.17 100); /* yellow */
  --color-piece-t: oklch(0.70 0.20 310); /* purple */
  --color-piece-s: oklch(0.85 0.21 145); /* green  */
  --color-piece-z: oklch(0.68 0.23 25);  /* red    */
  --color-piece-j: oklch(0.62 0.20 260); /* blue   */
  --color-piece-l: oklch(0.75 0.19 55);  /* orange */
}
```

## Public interface exposed

Two parallel surfaces, both first-class:

1. **CSS custom properties** on `:root` — `--color-piece-i` … `--color-piece-l`. Any CSS or
   inline style can read `var(--color-piece-t)`. These are what emit and what the acceptance grep
   targets.
2. **Tailwind utilities** auto-generated from the `--color-*` namespace — `bg-piece-i`,
   `text-piece-i`, `border-piece-i`, `ring-piece-i`, `shadow-piece-i/…`, `fill-piece-i`, etc.,
   for all seven pieces. These are the class-level vocabulary the later rendering epic applies to
   `Cell`.

Naming contract downstream code may rely on: the token/utility suffix is the **lowercase piece
letter** (`i o t s z j l`). A future tetromino type/enum in `lib/` maps piece → suffix; that
mapping is out of scope here but the suffix set is fixed by this ticket.

## Module boundaries

- `app/globals.css` remains the **single source of truth** for color. Logic (`lib/`) and
  components stay color-agnostic until a later epic reads these tokens by name. No color value is
  duplicated anywhere else.
- The `@theme static` block is additive and independent of the `@theme inline` bridge; the two
  merge in Tailwind's theme layer without interaction. Existing `bg-background`/`text-foreground`
  behavior is unchanged.

## Ordering of changes

1. Edit `app/globals.css` — add the block. (Atomic; the whole deliverable.)
2. Build + grep-verify emission and distinct values (committed state).
3. Add throwaway swatch → visually confirm seven distinct hues → revert swatch.
4. Final lint + build gate on the committed (swatch-free) tree.
5. Commit `globals.css` + artifacts.

No sequencing hazard: one file, one additive block, no dependency on any other in-flight ticket
(S-004-01 is a single-ticket story). No concurrency collision surface — the epic isolates theme
config from the `components/`/`lib/` files other tickets touch.
