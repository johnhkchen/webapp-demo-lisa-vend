# Structure — T-004-02-01: glassmorphic-panel-utilities

The blueprint: exact file-level changes, where the block goes, its public interface, and the
ordering that matters. Not code — the shape of the code. Grounded in Design's decisions.

## Files

### Modified — `app/globals.css` (the only committed source change)

Append **one** `@layer components { .glass { … } }` block, with a leading doc comment, **after**
the existing `@theme static` per-tetromino color block and **before** the `html, body` base rules.

Placement rationale:
- After `@theme static` (colors) keeps the two E-004 vocabulary additions adjacent and in
  epic order (tokens, then the utility that a panel would pair them with).
- Before the base `html, body` rules keeps "theme/vocabulary" above "base element styling",
  which is the file's existing top-to-bottom reading order (`@import` → tokens → base).
- The block is **self-fenced** (comment + one `@layer` block) so the sibling glow ticket
  (T-004-02-02) appends its own fenced block after it without touching these lines — minimizing
  the shared-file merge surface Research flagged.

Resulting file skeleton (● = added by this ticket):

```
@import "tailwindcss";
:root { --background; --foreground }
@theme inline { --color-background; --color-foreground }
@theme static { --color-piece-i … --color-piece-l }   ← T-004-01-01
● /* doc comment: glass panel utility + why @layer components */
● @layer components { .glass { … } }
html, body { height: 100% }
body { font-family: … }
```

### Added (RDSPI artifacts, not source)

- `docs/active/work/T-004-02-01/{research,design,structure,plan,progress,review}.md`

### Not touched (deliberately — epic hard boundary)

- `components/Board.tsx`, `components/Cell.tsx`, and any future panel component — the consuming
  work (applying `.glass` to a real scoreboard/preview) is a later rendering epic's scope.
- `lib/**`, `app/layout.tsx`, `app/page.tsx`, `postcss.config.mjs`, `tsconfig.json`, all config.
- No new files, no new dependencies, no `tailwind.config.*`.

## The public interface

One class, consumed by className:

| Name | Kind | Layer | Contract |
|---|---|---|---|
| `.glass` | component class | `components` | Applies frosted-glass **material** — backdrop blur+saturate, translucent fill, hairline border, depth shadow + top rim highlight. Owns **no** shape: no radius, padding, size, or color-of-content. Composable — utilities in the `utilities` layer override individual properties. |

Intended usage by a future consumer (illustrative, **not** built here):

```tsx
<aside className="glass rounded-2xl p-4 text-foreground">…scoreboard…</aside>
```

`.glass` supplies the material; `rounded-2xl p-4 text-foreground` (utilities layer) supply shape,
spacing, and text color, each winning over `.glass` where they overlap.

## Internal organization of the block

```
@layer components {
  .glass {
    background-color:            /* translucency  — color-mix white ~6%  */
    -webkit-backdrop-filter:     /* blur — webkit prefix first (Safari)  */
    backdrop-filter:             /* blur(12px) saturate(1.4)             */
    border:                      /* hairline — 1px color-mix white ~14%  */
    box-shadow:                  /* depth drop + inset top rim highlight */
  }
}
```

Property order: fill → blur (prefixed pair) → border → shadow. Reads outermost-material to
finishing-detail; groups the two `backdrop-filter` declarations together.

## Ordering of changes (Plan sequences the work)

1. Edit `app/globals.css` — add the doc comment + `@layer components` block.
2. Build + grep-verify emission in committed state (no consumer).
3. Add throwaway probe (busy background + `.glass` panel), verify visually in dev, **revert**.
4. Lint + build gates green; confirm only `app/globals.css` in the source diff.
5. Commit `feat(T-004-02-01): …`.

## Boundaries & invariants

- **Emission-without-consumer** is the invariant the mechanism guarantees: `@layer components`
  content is not tree-shaken (proven in Research). Do **not** refactor `.glass` into `@utility`
  later without also adding a `@source inline` safelist, or it will silently drop from the build.
- **Composability invariant:** `.glass` must remain in the `components` layer so utilities win.
  Never move it to unlayered top-level CSS.
- **Boundary invariant:** committed source diff = `app/globals.css` only. The probe never lands.
