# T-009-02-01 — Structure: retone-piece-oklch-palette-for-clay

## Files touched

### Modified: `app/globals.css`

Exactly one block edited: the `@theme static { ... }` rule (currently lines 33-41), seven
`oklch(...)` value literals plus their trailing comment labels. No other line in this file
changes as part of this ticket.

Before (current uncommitted working-tree state):

```css
@theme static {
  --color-piece-i: oklch(0.80 0.13 75);   /* amber  */
  --color-piece-o: oklch(0.78 0.11 190);  /* teal   */
  --color-piece-t: oklch(0.72 0.16 10);   /* rose   */
  --color-piece-s: oklch(0.66 0.17 300);  /* violet */
  --color-piece-z: oklch(0.82 0.16 120);  /* chartreuse */
  --color-piece-j: oklch(0.70 0.17 40);   /* coral  */
  --color-piece-l: oklch(0.75 0.12 240);  /* sky    */
}
```

After:

```css
@theme static {
  --color-piece-i: oklch(0.78 0.075 75);   /* amber  */
  --color-piece-o: oklch(0.76 0.065 190);  /* teal   */
  --color-piece-t: oklch(0.70 0.085 10);   /* rose   */
  --color-piece-s: oklch(0.64 0.085 300);  /* violet */
  --color-piece-z: oklch(0.78 0.075 120);  /* chartreuse */
  --color-piece-j: oklch(0.68 0.085 40);   /* coral  */
  --color-piece-l: oklch(0.72 0.07 240);   /* sky    */
}
```

The block's header comment (lines 25-32, already reworded "Per-tetromino"→"Per-piece" by the
pre-existing uncommitted edit) does not need further changes — it describes the mechanism
(`@theme static` forcing utility emission, oklch keeping perceived brightness aligned) and
still holds true; it doesn't assert specific chroma/lightness numbers that this edit would
invalidate.

## Files NOT touched, and why

- `components/Cell.tsx`, `components/HoldBox.tsx`, `components/NextPreview.tsx` — read
  `bg-piece-*`/`ring-piece-*` class names as literals; those names don't change, only the
  color each resolves to (Research, Design).
- `components/Board.test.tsx`, `components/Cell.test.tsx` — assert on class-name substrings
  only, no oklch/hex value assertions (Research).
- `styles/vendor/b28-clay.css` — the vendored kit file itself is not a piece-color source;
  only used as the chroma-ceiling reference point (`--clay-primary` C=0.093) during Design.
  Not imported for its values here, just used as a design anchor.
- Any other file currently showing as modified in `git status` (the wider uncommitted
  "tetromino"→"piece" terminology sweep across `lib/`, other `components/*.ts(x)`, `CLAUDE.md`,
  etc., and the `.flash` keyframe retone inside `globals.css` itself) — pre-existing,
  unrelated, out of scope; left exactly as found.

## Module boundaries / interfaces

No interface changes. `--color-piece-i` through `--color-piece-l` remain the same seven custom
property names; Tailwind v4's `@theme static` still emits the same `bg-piece-*`, `text-piece-*`,
`border-piece-*`, `ring-piece-*` utility families from those names. The public surface (what a
component can reference) is identical before and after — only the resolved color value changes.
`.glow-i` through `.glow-l` (separate block, lines ~98-118) reference these tokens via
`var(--color-piece-*)` and therefore retone automatically with no edit of their own.

## Ordering

Single-step change — one file, one block, seven value edits made together (not
incrementally per-piece), since they're interdependent as a set (Design's per-piece rationale
reasons about the seven relative to each other, not in isolation). No sequencing concerns:
nothing else in the codebase needs to change first or after.

## Verification surface

- `npm run build` — must still succeed (CSS syntax validity, `@theme static` still resolves).
- `npm run test` — must still pass at whatever baseline count exists in the current working
  tree (no test asserts oklch values, so this is a regression check, not a targeted test for
  this change — Research confirmed no existing coverage of resolved color values).
- `npm run lint` — must stay clean.
- Manual/visual: dev-server render or computed-style check to confirm the seven tokens resolve
  to the new oklch strings, and an eyeball pass (Plan decides exact mechanism) to confirm the
  "reads correctly on cream clay" / "visually distinguishable" qualitative bar.
- No new automated test is warranted: there is no established pattern in this repo for
  asserting on resolved CSS custom-property/color values (confirmed absent in Research), and
  the AC itself is a designed-value check (comparing literals against a baseline), not a
  behavioral one — a snapshot-style test of seven color strings would just restate this diff's
  content back at itself with no defect it could catch.
