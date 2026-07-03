# T-009-03-04 — Structure: next-preview-raised-clay-tile

## Files touched

| File | Change |
|---|---|
| `components/NextPreview.tsx` | Modified — three className edits (panel, label, `PreviewTile`'s blank square). No new imports, no signature/prop changes. |

No files created, no files deleted. No changes to `components/NextPreview.test.tsx`,
`components/HoldBox.tsx`, `app/globals.css`, `styles/vendor/b28-clay.css`, or any other
component/lib file.

## Module boundaries / interfaces

Unchanged. `NextPreview`'s public interface (`NextPreviewProps { queue }`) and `PreviewTile`'s
local props (`{ type: PieceType }`) are untouched — this is a pure rendering/chrome change inside
the existing component, no new props, no new exports, no change to how `GameContainer.tsx` invokes
`<NextPreview/>`.

## Change shape, in order

All three edits live in the file's two JSX-returning functions (`PreviewTile`, currently lines
50–73, and the default-exported `NextPreview`, currently lines 83–99). They touch different
template-literal/string className expressions and are independent of each other — any order, or
one combined edit, works:

1. **`NextPreview`'s panel `<div>` `className`** (currently line 87):
   - Before: `"flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl"`
   - After: `"clay-chip flex flex-col gap-2 p-2"`
   - Removes: `rounded-lg`, `border`, `border-white/10`, `bg-white/5`, `shadow-2xl`.
   - Adds: `clay-chip`.
   - Keeps: `flex flex-col gap-2 p-2`.

2. **`NextPreview`'s label `<span>` `className`** (currently line 89):
   - Before: `"text-xs uppercase tracking-wide text-white/50"`
   - After: `"text-xs uppercase tracking-wide text-foreground/70"`
   - Only the color utility changes; sizing/casing/tracking utilities untouched.

3. **`PreviewTile`'s blank mini-grid square `className`** (currently line 68, the `else` branch of
   the `filled.has(i)` ternary):
   - Before: `"rounded-[2px] bg-white/5"`
   - After: `"rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10"`
   - The filled-square branch (line 66, `` `rounded-[2px] ${PIECE_FILL[type]}` ``) is a sibling
     expression in the same ternary and is **not** touched.

## Doc-comment implications

`NextPreview.tsx`'s file-level doc comment (lines 4–26) describes the component's behavioral
contract (props-driven, reuses `cellsFor`/`BOUNDING_BOX`, `data-next` discipline, "no advance
animation/juice") — none of that changes, so it does not need an update. No comment currently names
the panel's specific chrome classes literally, so there is no comment-rot risk to check (same
conclusion T-009-03-03/structure.md reached for `HoldBox.tsx`).

## Ordering / sequencing

No cross-file ordering concerns — single file, three independent template-literal/string edits, no
build-order or dependency chain. Depends only on `styles/vendor/b28-clay.css` already defining
`.clay-chip` (T-009-01-01, landed) and `app/globals.css` already binding `--color-foreground` to
`--clay-ink` (T-009-01-02/T-009-01-03, landed) — both confirmed present in Research. No ordering
dependency on `T-009-03-03`/`HoldBox.tsx`: that file is not imported by, nor does it import,
`NextPreview.tsx`; the two components share only a design decision (Design phase), not code or
runtime coupling. This ticket's implementation is self-contained and can proceed independently of
whether `HoldBox.tsx`'s own retone has landed yet.

## Test impact

`components/NextPreview.test.tsx` requires no edits (Research: all seven assertions check
`aria-label`, `data-next` values/count/order via `cellsFor`, `.grid` element count, and absence of
`data-cell` — zero assertions touch className substrings). Expected to pass unmodified after the
implementation step; the Plan phase's verification step re-confirms this by running it.
