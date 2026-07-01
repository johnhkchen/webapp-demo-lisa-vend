# Research — T-001-03-01: render-placeholder-board-css-grid

## Ticket in one line

Honor the assented DOM/CSS-grid-of-cell-`div`s renderer fork by rendering a static
placeholder board on the page, proving the chosen renderer and completing the visible
skeleton — leaving no scaffolding work before the next signal is pulled.

Descriptive only. No solution is proposed here; that is Design's job.

## Current repository state (snapshot)

Observed via `ls`, `git ls-files`, and file reads on 2026-07-01. The scaffold
(commit `516981b`) and the two S-001-02 tickets (`f493b7b`, `2203afd`, `cd68bdc`) have
already landed. The tree is materially further along than a bare epic start.

- **`components/Board.tsx` already exists and already renders the placeholder board.**
  It imports `COLS`/`ROWS` from `@/lib/constants`, builds `Array.from({length: COLS*ROWS})`
  (= 200 entries), and maps each to an empty cell `div` inside a CSS-grid container. The
  grid is expressed via inline `style` (`gridTemplateColumns/Rows: repeat(N, minmax(0,1fr))`,
  `width: min(90vw,300px)`, `aspectRatio: COLS/ROWS`) with Tailwind utilities for the chrome
  (`grid gap-px rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl`).
- **`app/page.tsx` already mounts `<Board />`** under a gradient `TETRIS` header with the
  caption "Scaffold — placeholder board".
- **`lib/constants.ts`** exports `COLS = 10` and `ROWS = 20` — pure, framework-free, and
  already the single source of truth for board dimensions.
- **`app/layout.tsx`** applies `bg-background text-foreground` (the token bridge from
  T-001-02-01) and a flex-column full-height body.
- **`app/globals.css`** wires Tailwind v4 (`@import "tailwindcss"`) and the
  `:root` → `@theme inline` token bridge.
- **`eslint.config.mjs`** carries the T-001-02-02 `lib/**` purity rule (no React/Next
  imports in `lib/`). `components/` is unrestricted.

### Baseline verification (pre-change)

- `npm run lint` → exit 0, zero warnings.
- `npm run build` → exit 0; `/` and `/_not-found` prerendered as static content.

So the **literal acceptance criteria are already satisfied by the scaffold**: a
`components/Board` renders a 10×20 grid of cell `div`s via CSS grid on the page, and the
production build passes. This is the same situation T-001-02-02 documented for the
directory boundary — existence was pre-satisfied; the ticket's job is to close the gap
between "exists" and the Context's deeper intent.

## What the docs mandate

- **Ticket Context:** "Honor the assented DOM/CSS-grid-of-cell-divs fork … proving the
  chosen renderer and *completing the visible skeleton*." _Advances: P1, P2, P3, E-001._
- **Epic E-001** names two human-assented forks that must be honored, not re-litigated:
  Tailwind (done, T-001-02-01) and **DOM/CSS-grid of cell divs** as the board renderer
  (this ticket) over `<canvas>`. "Done looks like": the page renders a placeholder board
  as a CSS grid of cell divs, with **no scaffolding work remaining**.
- **CLAUDE.md source layout** names the presentational components explicitly:
  `components/` → **Board, Cell, NextPreview, Scoreboard, GameOverlay, …**. Of these, only
  `Board` exists; `Cell` — the atomic unit of the very grid this ticket proves — is folded
  inline as an anonymous `div`.
- **CLAUDE.md boundary:** keep `lib/` pure and framework-free; keep rendering vs. logic on
  separable tracks. Board dimensions already live in `lib/constants.ts` and must stay there.

## Dependency & concurrency context

- `depends_on: [T-001-02-01, T-001-02-02]` — both `phase: done`. T-001-02-01 wired Tailwind
  end-to-end (the token bridge the Board's utilities rely on); T-001-02-02 established and
  lint-enforced the app/components/lib boundary.
- **This ticket now legitimately owns `components/`.** T-001-02-02 deliberately avoided
  touching `components/**` and `app/**` only because sibling S-001-02 work was in flight on
  the shared branch. Those siblings are done; no other open ticket targets `components/`, so
  editing `Board.tsx` / adding `Cell.tsx` here carries no file-collision risk under lisa's
  parallel model.

## Boundaries with downstream epics (out of scope)

- **Playability (P1) / E-002 pure game core:** the *stateful* board — filled cells, active
  piece, colors, collision, scoring, RNG — is explicitly later scope. Anything rendered here
  must stay **presentational and stateless**. No game props, no piece model, no board-ops
  module (`lib/board.ts` would collide with E-002's "board ops").
- **Wow (P2) / neon-glass theme epic:** glow, animation, and the real palette are later. The
  current neutral `white/5`/`white/10` styling is intentional placeholder chrome; this ticket
  should not invent theme tokens.
- **Test runner:** T-001-01-01/02 and T-001-02-02 deferred standing up a test runner to the
  first pure-`lib/` logic epic (Vitest, no DOM). A DOM render test would pull in
  jsdom/RTL — a heavier, different dependency — which is disproportionate for a static
  placeholder. Verification here stays build + lint + visual, consistent with prior tickets.

## Patterns & conventions to respect

- Dimensions flow from `lib/constants` (`COLS`/`ROWS`) — never hardcode 10/20 in JSX.
- Presentational components in `components/` are default-exported React function components
  (see `Board`). No `"use client"` is needed — the placeholder is a Server Component.
- The repo culture (T-001-01-02, T-001-02-02) is: when the scaffold pre-satisfies the literal
  criteria, make a **small, justified, bounded** change that realizes the Context's deeper
  intent — and document honestly what was pre-satisfied vs. added.
- Anti-premature-surface norm (T-001-02-02 review pts 4): don't add speculative API surface
  (props, barrels) that isn't gated or used yet.

## Assumptions & constraints surfaced

- **Assumption:** "completing the visible skeleton" + CLAUDE.md's component list means the
  named atomic unit `Cell` should exist as its own component, not remain an inline `div`. The
  grid this ticket exists to prove *is* a grid of cells; naming the cell is the natural
  completion. Design will weigh this against pure YAGNI.
- **Constraint:** the DOM contract the AC checks must be preserved: exactly `COLS*ROWS` cell
  `div`s inside one CSS-grid container. Any refactor must keep 200 cells and the grid layout.
- **Constraint:** no new runtime dependency; no change to `package.json`/lockfile.
- **Constraint:** keep the change reversible and off `lib/` internals (E-002) and theme
  tokens (P2 epic).

## Open questions for Design

1. Leave `Board.tsx` exactly as-is (verify-only), or extract the CLAUDE.md-named `Cell`
   component to complete the presentational skeleton?
2. If extracting `Cell`: props-less empty cell now, or a minimal forward-looking prop? (The
   anti-premature-surface norm pushes toward props-less; the Playability epic owns the state
   contract.)
3. Keep the grid template as inline `style`, or move it to Tailwind/CSS? (Tailwind v4 can't
   express `repeat(var)` ergonomically; inline style keyed off `lib` constants may remain the
   cleanest proof.)
4. Anything to add to `app/page.tsx`, or is the current mount + header sufficient?
