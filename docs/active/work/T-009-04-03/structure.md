# T-009-04-03 — Structure: page-header-clay-retone

## Files touched

Two files modified, zero created, zero deleted.

1. `app/globals.css` — add one token (root var + `@theme inline` binding).
2. `app/page.tsx` — swap the three flagged class groups.

No changes to `app/layout.tsx`, `styles/vendor/b28-clay.css` (vendored kit stays untouched —
this only *consumes* its existing `--clay-primary`), or any component/test file.

## `app/globals.css` — exact diff

Current (lines 15-23):
```css
:root {
  --background: var(--clay-bg);
  --foreground: var(--clay-ink);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

New:
```css
:root {
  --background: var(--clay-bg);
  --foreground: var(--clay-ink);
  --primary: var(--clay-primary);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
}
```

One line added to each block (`--primary: var(--clay-primary);` in `:root`;
`--color-primary: var(--primary);` in `@theme inline`) — mirrors the existing
`--background`/`--color-background` shape exactly, no structural change to either block.

This registers `text-primary`, `bg-primary`, `border-primary`, `ring-primary`, etc. as Tailwind
utilities resolving to `--clay-primary` (`#44679b`, steel blue).

## `app/page.tsx` — exact diff

Current (18 lines):
```tsx
import GameContainer from "@/components/GameContainer";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <header className="text-center">
        <h1 className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
          ROWCLEAR
        </h1>
        <p className="mt-2 text-sm text-white/50">Auto-play demo — press any key to play</p>
      </header>
      <GameContainer attract />
      <p className="text-xs text-white/30 text-center max-w-md">
        RowClear is an independent, non-commercial project and is not affiliated with, licensed by, or endorsed by any commercial falling-block puzzle game or its rights holders.
      </p>
    </main>
  );
}
```

New:
```tsx
import GameContainer from "@/components/GameContainer";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <header className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl">
          ROWCLEAR
        </h1>
        <p className="mt-2 text-sm text-foreground/50">Auto-play demo — press any key to play</p>
      </header>
      <GameContainer attract />
      <p className="text-xs text-foreground/30 text-center max-w-md">
        RowClear is an independent, non-commercial project and is not affiliated with, licensed by, or endorsed by any commercial falling-block puzzle game or its rights holders.
      </p>
    </main>
  );
}
```

Class-by-class:
| Element | Before | After |
|---|---|---|
| `<h1>` | `bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl` | `text-5xl font-bold tracking-tight text-primary sm:text-6xl` |
| subtitle `<p>` | `mt-2 text-sm text-white/50` | `mt-2 text-sm text-foreground/50` |
| footer `<p>` | `text-xs text-white/30 text-center max-w-md` | `text-xs text-foreground/30 text-center max-w-md` |

No import changes (still just `GameContainer`), no JSX structure changes (same three elements,
same nesting, same text content), no prop/behavior changes — this is a pure className edit.

## Ordering

1. `app/globals.css` first — the `--color-primary` binding must exist before `page.tsx`
   references `text-primary`, otherwise Tailwind has no utility to generate (the build would
   still succeed since Tailwind v4 silently drops unknown utility classes rather than erroring,
   but the heading would render unstyled/default-color, which is undesirable even transiently
   between commits).
2. `app/page.tsx` second — consumes the new token.

Both changes are small enough to land as a single commit (no intermediate state is meaningfully
testable/committable on its own — an isolated token addition has no visible effect until
consumed), consistent with how T-009-04-01 committed its one-file change atomically.

## Public interface / boundary impact

None. `Home` (the default export of `page.tsx`) takes no props and exposes no interface change.
The new `--color-primary` Tailwind token is additive and does not alter `--color-background`/
`--color-foreground` resolution for any existing consumer (`layout.tsx`'s `body`, `GameOverlay`,
any other component using `bg-background`/`text-foreground`).
