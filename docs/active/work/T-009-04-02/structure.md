# T-009-04-02 — Structure: start-overlay-clay-button

## Scope

Single-file change. No new files, no deleted files, no changes to `styles/vendor/b28-clay.css`,
`app/globals.css`, `app/layout.tsx`, or any other component. No public interface changes —
`StartOverlayProps` (`{ visible: boolean }`) is untouched, so no consumer (`GameContainer.tsx`
or wherever `StartOverlay` is rendered) needs any change.

## Files touched

### `components/StartOverlay.tsx` (modified)

Two edits, both confined to the JSX return block and the doc comment; no changes to imports
(there are none beyond the type-only prop interface), no changes to the function signature or
the `if (!visible) return null;` guard.

**Edit 1 — doc comment (lines 11-12 of the current file).**
Replace the sentence describing the gradient with one describing the `.clay-button` pill, per
Design. Rest of the doc comment (lines 1-10, 13-17) is untouched — it documents behavior
(attract-mode context, non-blocking design, scope boundary to `T-008-02-02`), not palette, and
none of that changed.

**Edit 2 — JSX return block (lines 27-38 of the current file).**
Replace the two nested `<span>` elements with one `<span>`. Before:

```tsx
<span className="animate-pulse rounded-full border border-white/20 bg-black/50 px-5 py-2 text-sm font-bold uppercase tracking-widest backdrop-blur-sm">
  <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
    Press Start
  </span>
</span>
```

After:

```tsx
<span className="clay-button animate-pulse text-sm uppercase tracking-widest">
  Press Start
</span>
```

The outer `<div role="status" className="pointer-events-none absolute inset-x-0 bottom-4 flex
justify-center">` wrapper is unchanged — same element, same className string, same position in
the tree (still the immediate parent of the pill span).

## Module boundaries

None affected. This is a leaf presentational component (per its own doc comment, "presentational
and props-driven... no state, no game logic"); the change is entirely internal to its render
output and doesn't touch its prop contract, so nothing upstream (`GameContainer.tsx`) or
downstream (nothing consumes `StartOverlay`'s internals) is affected.

## Ordering

Single file, single logical change — no ordering concerns between multiple files. Within the
file, both edits (doc comment, JSX) can be made in one pass since they're independent text
regions of the same file and neither depends on the other being done first.

## Test files

`components/StartOverlay.test.tsx` — **not modified**. Confirmed in Research/Design that all
three existing assertions (role presence, text content match, `pointer-events-none` substring
on the outer div's className) hold against the new markup unchanged. No new test is added: the
AC's bar ("uses the kit's clay-button class") is a static-markup/className fact, not new
runtime behavior, and the existing test suite already exercises the two states (hidden/visible)
this component has. This mirrors `T-009-04-01`'s precedent (`GameOverlay.test.tsx` also needed
no changes for an equivalent palette-only retone).

## Verification surface

- `npm run lint` — catches any stray unused-class or JSX issues.
- `npx vitest run components/StartOverlay.test.tsx` — the three existing assertions must pass
  unchanged.
- `npm run build` — production build must succeed (Tailwind class scanning, TypeScript).
- Manual grep for the AC's forbidden strings (`from-cyan-400`, `via-fuchsia-400`,
  `to-violet-400`, `bg-black/50`) against `components/StartOverlay.tsx` — must return nothing.
