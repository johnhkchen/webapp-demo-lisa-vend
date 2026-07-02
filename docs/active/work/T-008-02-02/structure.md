# T-008-02-02 — Structure: start-handoff-clean

## Change set (files)

| File | Action | Why |
|------|--------|-----|
| `components/GameContainer.tsx` | **modify** | Destructure the `attract` setter, add `startHumanGame`, add `isStartKey`, branch the keyboard handler while attracting, update the leading docstring. The whole feature lives here. |
| `components/GameContainer.test.tsx` | **modify** | Add the "start handoff" describe block; remove the now-obsolete "swallows keyboard input" attract test. |
| `app/page.tsx` | **modify (minor)** | Caption honesty: the demo is now takeable-over. |
| `components/useGame.ts` | **no change** | `reset` + `DEFAULT_SEED` already exported and tested. |
| `components/StartOverlay.tsx` | **no change** | Presentational; visibility already bound to `attract`. |
| `lib/**` | **no change** | Purity boundary; no new rules. |

No files created or deleted.

## `GameContainer.tsx` — detailed shape

### Imports

- `useState, useEffect` → add `useCallback`.
- Add `DEFAULT_SEED` to the existing `@/components/useGame` import
  (`useGame, GRAVITY_INTERVAL_MS, FLASH_DURATION_MS`).

### New module-level helper (above the component, beside `KEY_TO_INPUT`)

```ts
/**
 * While the attract demo plays, any *ordinary* key press starts the human game ("PRESS START").
 * Excludes browser-shortcut chords (Ctrl/Cmd/Alt held) and lone modifier keys so we neither hijack
 * Cmd+R nor "start" on a resting Shift.
 */
function isStartKey(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return !["Shift", "Control", "Alt", "Meta"].includes(event.key);
}
```

### Component body

- `const [attract, setAttract] = useState(initialAttract);` — destructure the setter (was
  `const [attract]`).
- New stable callback, placed after the `useAttractLoop` call (reads `reset` from `useGame`):

  ```ts
  // Start handoff (T-008-02-02): discard the bot's in-progress game for a fresh clean core state,
  // then halt attract. Two batched setState calls → one render: attract off cancels the driver's
  // rAF frame and enables the human gravity loop + keyboard, so no bot input fires after Start.
  const startHumanGame = useCallback(() => {
    reset(DEFAULT_SEED);
    setAttract(false);
  }, [reset]);
  ```

- Keyboard effect: prepend the attract branch inside `onKeyDown`, then keep the existing human
  handling verbatim:

  ```ts
  function onKeyDown(event: KeyboardEvent) {
    if (attract) {
      if (isStartKey(event)) {
        event.preventDefault();
        startHumanGame();
      }
      return; // bare modifiers / chords stay swallowed while attracting
    }
    /* …existing KEY_TO_INPUT lookup, repeat guards, dispatch — unchanged… */
  }
  ```

  Effect dep array: `[dispatch, attract]` → `[dispatch, attract, startHumanGame]`.

- The gravity loop, `useAttractLoop`, and JSX are **unchanged** — they already read `attract`/
  `state` correctly; flipping `attract` off is enough to switch drivers and hide `StartOverlay`.

### Ordering constraint

`startHumanGame` must be defined **after** `useGame()` (it closes over `reset`) and **before** the
keyboard `useEffect` that lists it in deps. Natural top-to-bottom placement satisfies this.

## `GameContainer.test.tsx` — detailed shape

- **Remove** the attract-block test `"swallows keyboard input while the bot plays (no bleed-through)"`
  (its premise — keys swallowed during attract — is superseded by the handoff).
- **Add** a describe block `GameContainer — start handoff (T-008-02-02)` reusing the existing rAF
  pump pattern (stub `requestAnimationFrame`/`cancelAnimationFrame`, `frame(now)` helper) and the
  top-level `filledCoords` / `expectedAfter` helpers. Four tests, per design Decision 4:
  1. `pressing a key discards the bot's board and starts a fresh clean game`
  2. `after Start, human gravity — not the bot — advances the board`
  3. `after Start, the keyboard controls the human game`
  4. `browser chords and bare modifiers do not start the game`

Each new test copies the local `pending`/`handle`/`frame`/`beforeEach`/`afterEach` scaffold used by
the sibling describe blocks (they are per-block, not shared) to keep the pump deterministic.

## `app/page.tsx`

Change the caption text only:
`Auto-play demo — the CPU is playing` → `Auto-play demo — press any key to play`.
No structural/JSX change.

## Public interface impact

None outside the file. `GameContainer`'s props are unchanged (`attract?: boolean`). `useGame`'s
`GameView` is unchanged. No new exports.
