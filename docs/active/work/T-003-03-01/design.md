# Design — T-003-03-01 move-rotate-keys

## Decision summary

Expose a `dispatch(input: Input)` from `useGame` (backed by `setState(s => step(s, input))`),
and attach a `window` `keydown` listener in `GameContainer` via `useEffect` that maps a small
key table to move/rotate `Input`s. No `lib/` changes. No gravity/drop (that is T-003-03-02).

## Question 1 — Where does the setter / dispatch live?

### Option A (chosen): `useGame` owns state + exposes `dispatch`

`useGame` keeps the `setState` it already creates and returns a stable
`dispatch = useCallback((i) => setState(s => step(s, i)), [])`. GameContainer stays a thin
island that only knows keys, not the reducer.

- **Pro:** Keeps all game-state ownership in the hook, matching its stated role ("thin
  client-side holder for the core"). The functional updater `s => step(s, i)` means
  `dispatch` never needs `state` in its deps → it is referentially stable → the keydown
  `useEffect` can depend on it without re-subscribing every render.
- **Pro:** GameContainer has zero knowledge of `GameState`/`step`; it maps keys → `Input`
  strings only. Clean seam for T-003-03-02 to add more keys/handlers off the same `dispatch`.
- **Con:** Slightly widens the `GameView` return type. Trivial and expected — the module doc
  already anticipates "the returned `state` are the seams that ticket will consume."

### Option B (rejected): GameContainer owns state via `useState`

Move `createInitialState` into GameContainer and call `step` there.

- **Rejected:** Duplicates the hook's purpose and orphans `useGame`. The hook already
  memoizes `view` on `state`; re-deriving that in the component reimplements the seam.
  Contradicts the codebase's deliberate hook-as-holder structure.

### Option C (rejected): a `useReducer` with `step` as the reducer

`step` has the exact `(state, action) => state` shape, so `useReducer(step, initial)` is
tempting.

- **Rejected (mild):** `step` isn't value-pure — it advances the live 7-bag on lock
  (`descend`), and `createInitialState` also pulls from the bag. Under React 19 Strict Mode,
  reducers/initializers can be invoked twice for detection, which would double-advance the
  bag and change the piece sequence. `useState` with a lazy initializer plus a functional
  updater keeps a single call path. This ticket dispatches only lateral inputs (no `descend`,
  no bag advance), but choosing `useState` avoids a Strict-Mode footgun the drop ticket would
  otherwise inherit. Keep the seam boring.

## Question 2 — Listener target & lifecycle

**Chosen:** one `window`-level `keydown` listener registered in a `useEffect` with a cleanup
that removes it; empty-ish deps (`[dispatch]`, stable) so it subscribes once.

- Window-level (vs. a focusable board element with `tabIndex`) means the player never has to
  click to focus — "a stranger can just play." The board is presentational and holds no
  focus today; adding roving focus is out of scope.
- `useEffect` (not `useLayoutEffect`, not inline) keeps it client-only and SSR-safe: no
  `window` access during server render.
- Cleanup removes the exact handler reference to avoid duplicate listeners across
  remounts / Strict-Mode double-invoke.

## Question 3 — Key mapping

Chosen table (case-handled via `event.key`):

| Key(s)                 | Input        |
|------------------------|--------------|
| `ArrowLeft`            | `"left"`     |
| `ArrowRight`           | `"right"`    |
| `ArrowUp`, `x`, `X`    | `"rotateCW"` |
| `z`, `Z`               | `"rotateCCW"`|

- `ArrowUp` as rotate is the near-universal single-key default (Tetris Guideline / most web
  clones); `z`/`x` add the conventional CCW/CW pair without cost. The AC only requires "the
  rotate key rotates"; providing CW+CCW exercises both existing core transitions and is
  natural for players.
- Keys **not** in the table are ignored (handler returns early, no `preventDefault`), so
  browser shortcuts and the drop keys (added by T-003-03-02) are untouched.
- `preventDefault()` is called **only** for consumed keys — `ArrowLeft/Right/Up` otherwise
  scroll the page. Guarding it behind "did we handle this key" avoids swallowing unrelated
  input.
- `ArrowDown` is deliberately **omitted** — soft-drop is T-003-03-02.

## Question 4 — Key repeat / DAS

Do nothing special. Holding a key fires OS-native auto-repeat `keydown` events; each maps to
one `step`, giving usable repeated movement for free. Proper DAS/ARR tuning (initial delay +
repeat rate) is not in the AC and would add timing state; explicitly deferred. We do **not**
filter `event.repeat`, because repeat is the desired behavior for held move keys.

## Consequences

- `GameView` gains `dispatch: (input: Input) => void`.
- `GameContainer` gains a `useEffect` + a pure key→Input map; still renders `<Board>`.
- Because `step` returns a new `state` object on a successful move and the **same** object
  on a no-op (movement/rotation return the input piece reference when blocked, so
  `{ ...state, active }` is a fresh object but view is identical), illegal moves still
  produce a harmless re-render with an unchanged board — acceptable and consistent with the
  no-op contract. (No extra guard needed for correctness.)
