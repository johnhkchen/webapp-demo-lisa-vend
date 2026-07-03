# T-009-03-03 — Structure: hold-box-raised-clay-tile

## Files touched

| File | Change |
|---|---|
| `components/HoldBox.tsx` | Modified — three className edits (panel, label, blank square). No new imports, no signature/prop changes. |

No files created, no files deleted. No changes to `components/HoldBox.test.tsx`,
`app/globals.css`, `styles/vendor/b28-clay.css`, or any other component/lib file.

## Module boundaries / interfaces

Unchanged. `HoldBox`'s public interface (`HoldBoxProps { type, canHold }`) is untouched — this is
a pure rendering/chrome change inside the existing component, no new props, no new exports, no
change to how `GameContainer.tsx` invokes it.

## Change shape, in order

All three edits live in the single `return (...)` JSX block of `HoldBox` (currently lines 61–88).
They are independent of each other (touch different template-literal className strings) and can
be applied in any order or as one combined edit; there is no sequencing dependency between them.

1. **Panel div's `className`** (currently line 65):
   - Before: `` `flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl ${canHold ? "" : "opacity-40"}` ``
   - After: `` `clay-chip flex flex-col gap-2 p-2 ${canHold ? "" : "opacity-40"}` ``
   - Removes: `rounded-lg`, `border`, `border-white/10`, `bg-white/5`, `shadow-2xl`.
   - Adds: `clay-chip`.
   - Keeps: `flex flex-col gap-2 p-2`, the conditional `opacity-40` ternary.

2. **Label `<span>`'s `className`** (currently line 69):
   - Before: `"text-xs uppercase tracking-wide text-white/50"`
   - After: `"text-xs uppercase tracking-wide text-foreground/70"`
   - Only the color utility changes; sizing/casing/tracking utilities untouched.

3. **Blank mini-grid square's `className`** (currently line 83, the `else` branch of the
   `type && filled.has(i)` ternary):
   - Before: `"rounded-[2px] bg-white/5"`
   - After: `"rounded-[2px] bg-foreground/5 ring-1 ring-inset ring-foreground/10"`
   - The filled-square branch (line 81, `` `rounded-[2px] ${PIECE_FILL[type]}` ``) is a sibling
     expression in the same ternary and is **not** touched.

## Doc-comment implications

`HoldBox.tsx`'s file-level doc comment (lines 4–27) references the component's behavioral
contract (props-driven, hold rules live in `lib/game.ts`, `data-hold`/`data-can-hold` discipline)
— none of that changes, so the doc comment does not need an update. No comment currently describes
the panel's specific chrome classes (unlike, say, a comment that would go stale by naming
`bg-white/5` literally), so there is no comment-rot risk from this change to check.

## Ordering / sequencing

No cross-file ordering concerns — single file, three independent template-literal edits, no
build-order or dependency chain. Depends only on `styles/vendor/b28-clay.css` already defining
`.clay-chip` (T-009-01-01, already landed and vendored) and `app/globals.css` already binding
`--color-foreground` to `--clay-ink` (T-009-01-02/T-009-01-03, already landed) — both prerequisite
tokens/classes exist in the repo today (confirmed in Research), so no upstream file needs to
change first.

## Test impact

`components/HoldBox.test.tsx` requires no edits (Research: none of its seven assertions touch
className substrings other than the literal `opacity-40` token, which this change preserves
verbatim in the same position within the template string). It is expected to pass unmodified
after the implementation step; the Plan phase's verification step re-confirms this by running it.
