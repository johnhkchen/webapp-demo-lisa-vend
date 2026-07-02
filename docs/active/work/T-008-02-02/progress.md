# T-008-02-02 — Progress: start-handoff-clean

## Status: complete

All plan steps executed; build, lint, and full test suite green. Committed in one atomic commit
(implementation + tests together, so the tree is green at the commit).

## Steps

- **Step 1 — implement handoff (`GameContainer.tsx`)** ✅
  - Added `useCallback` import; added `DEFAULT_SEED` to the `useGame` import.
  - Added module-level `isStartKey(event)` predicate (excludes Ctrl/Cmd/Alt chords + lone
    Shift/Control/Alt/Meta).
  - Destructured the setter: `const [attract, setAttract] = useState(initialAttract)`.
  - Added stable `startHumanGame = useCallback(() => { reset(DEFAULT_SEED); setAttract(false); },
    [reset])` after the `useAttractLoop` call.
  - Prepended the attract branch to `onKeyDown` (start on `isStartKey`, else swallow); added
    `startHumanGame` to the effect deps.
  - Updated the component docstring to describe the handoff (superseding the "T-008-02-02 will flip"
    note).

- **Step 2 — tests (`GameContainer.test.tsx`)** ✅
  - Removed the obsolete attract test `"swallows keyboard input while the bot plays"` (its premise is
    superseded), leaving an explanatory comment.
  - Added describe block `GameContainer — start handoff (T-008-02-02)` with the per-block rAF pump
    scaffold and four tests: clean fresh game / human-gravity-not-bot advances / keyboard controls
    after Start / chords+modifiers don't start.

- **Step 3 — caption (`app/page.tsx`)** ✅ `the CPU is playing` → `press any key to play`.

- **Step 4 — gate** ✅ `npm run test` (302 passed, 32 files), `npm run lint` (clean, `--max-warnings
  0`), `npm run build` (vinext client+ssr+worker built successfully).

## Deviations from plan

- None material. Folded the caption change into the single feature commit rather than a separate
  commit (change was trivial and shares the same intent). Commit sequence is therefore one commit,
  not two.

## Verification notes

- The "no bot input after Start" guarantee is verified structurally by test T2: after the flip the
  only scheduled rAF frame is the human gravity loop, so pumping one `GRAVITY_INTERVAL_MS` yields
  exactly `expectedAfter("tick")` — a bot move would be a rotate/shift, never a bare tick on the
  default spawn.
- "Clean state" verified by T1: the board is first dirtied by the bot (`filledCoords > 4`) then,
  after Start, equals `expectedAfter()` (the pristine default-seed spawn only).
