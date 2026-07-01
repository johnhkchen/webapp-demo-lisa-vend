# Design — T-001-01-01: scaffold-nextjs-approuter-typescript-project

Decisions grounded in `research.md`. Two forks (Tailwind, DOM/CSS-grid board) are already
human-assented and are **not** re-opened here — they are inputs, not decisions.

## Decision 1 — How to scaffold: `create-next-app` vs hand-authored

**Options**
- **A. `create-next-app`** — run the official generator, accept its file set, prune extras.
- **B. Hand-author** — write `package.json`, `tsconfig.json`, `next.config`, and the `app/`
  files by hand; install deps explicitly.

**Assessment against research**
- The repo is empty and the goal is the well-trodden happy path ("ships in one sitting").
  `create-next-app` produces a config combination Next.js actively tests, minimizing build
  risk on Node 26.
- But `create-next-app` is interactive/opinionated: it may create a `src/` dir, a
  `public/` folder full of demo SVGs, a demo `page.tsx`, and Vercel boilerplate we'd strip.
  It can also be non-deterministic across tool versions.
- Hand-authoring gives exact control over the CLAUDE.md-mandated root layout
  (`app/`+`components/`+`lib/`, no `src/`) and a minimal, review-friendly diff, but risks a
  subtly-wrong config (e.g. missing `next-env.d.ts`, wrong `moduleResolution`).

**Decision: Hybrid — A then aggressive prune, or B if the generator is unavailable.**
Prefer running `create-next-app` non-interactively with explicit flags
(`--typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
--use-npm --no-turbopack`), then delete demo content (`public/*` demo SVGs, boilerplate
`page.tsx`/`globals.css` body) and replace with our placeholder board. This inherits a
Next-tested config while ending at the CLAUDE.md layout. If the generator can't run
cleanly in this environment, fall back to hand-authoring the same file set (B) — the
Structure phase specifies every file either way so the outcome is identical.

*Rejected:* pure B as first choice — needless config risk when a tested generator exists.

## Decision 2 — Tailwind v3 vs v4

**Options**
- **A. Accept scaffold default.** Current `create-next-app` wires Tailwind **v4**
  (CSS-first: `@import "tailwindcss"` in `globals.css`, `@tailwindcss/postcss` plugin, no
  JS config required).
- **B. Pin Tailwind v3** (`tailwind.config.ts` + `@tailwind base/components/utilities`).

**Assessment**
- v4 is the current default and is lower-config (no `tailwind.config.js` needed for a
  scaffold; content detection is automatic). Fewer files, less to drift.
- v3 has more third-party examples and an explicit config file some later theme work might
  expect. But the neon/glass theme is a *later* epic and can add a config/tokens then under
  whichever version is installed.

**Decision: A — accept whatever the current generator wires (expected v4).** Lower config
surface now; the theme epic owns any token/config expansion. The scaffold only needs
Tailwind to *apply* (verified by a Tailwind utility class visibly taking effect). The
Structure/Plan phases describe files for both v3 and v4 so implementation matches reality.

*Rejected:* pinning v3 pre-emptively — re-litigates tooling for a theme that isn't built
yet, against the "don't re-open settled ground" epic guidance.

## Decision 3 — Where the placeholder board lives

**Options**
- **A. Inline in `app/page.tsx`.** Simplest; one file.
- **B. First `components/Board.tsx`.** Seeds the `components/` track named in CLAUDE.md;
  `page.tsx` just renders `<Board />`.

**Assessment**
- CLAUDE.md and the epic both name `components/` (Board, Cell, …) and demand
  rendering/logic stay on separable tracks. A `Board` component is the natural seed.
- Risk: the real game's `Board` is a downstream epic's file — seeding it now could collide.
  Mitigate by making this a **deliberately trivial, presentational placeholder** (a static
  grid of empty cells, no props, no state) clearly marked as scaffold, so the game epic
  replaces its body rather than fighting a competing implementation.

**Decision: B — `components/Board.tsx` as a static placeholder grid**, rendered by
`page.tsx`. This satisfies the epic's "renders a placeholder board as a CSS grid of cell
divs," exercises Tailwind (grid classes prove it applies), and seeds the `components/`
track. Keep it dumb: fixed 10×20 grid of `div`s, no game state, no `lib/` dependency.

*Rejected:* A (inline) — leaves `components/` empty, misses the chance to prove the
render track compiles and to demonstrate Tailwind on a real element.

## Decision 4 — `lib/` in the scaffold

`lib/` must exist as a track but the game logic is out of scope. **Decision:** create
`lib/` with a single tiny, pure, framework-free placeholder (e.g. board dimension
constants `COLS = 10`, `ROWS = 20`) that `components/Board.tsx` imports. This proves the
`lib/` → `components/` import path resolves under the `@/*` alias without pulling any game
logic forward. Keep it minimal so the logic epic owns everything real.

## Decision 5 — ESLint

Sibling ticket T-001-01-02 *verifies* lint is clean; **this** ticket must leave a wired,
green config. **Decision:** accept the generator's flat ESLint config
(`eslint.config.mjs` with `next/core-web-vitals` + `next/typescript`) and the `lint`
script. Do not add custom rules. The scaffold code must itself lint clean so the sibling
ticket's check passes without rework.

## Net design

`create-next-app` (TypeScript, Tailwind, ESLint, App Router, no `src`, `@/*` alias, npm) →
prune demo content → add `lib/` constants + `components/Board.tsx` placeholder grid →
`page.tsx` renders it → commit including `package-lock.json`. Verify `dev`, `build`, and
`lint` all succeed from a clean state.
