# CLAUDE.md

## Project

webapp-demo-lisa-vend — a visually stunning, single-player **Tetris** game built with Next.js
(App Router) and deployed to Vercel. A fast-payoff demo of the vend→lisa drive. See
`docs/knowledge/vision.md` for scope and `docs/knowledge/charter.md` for the value function.

## Stack

- Next.js (App Router) + React + TypeScript
- Client-side game loop (no backend); state in React + `requestAnimationFrame`
- Styling: CSS Modules / Tailwind (whichever the scaffold ticket chooses) with a neon/glass theme
- Deploy target: Vercel

## Commands

Once the app is scaffolded (see the scaffold ticket), expect:

```bash
npm run dev      # local dev server at http://localhost:3000
npm run build    # production build (must pass before deploy)
npm run lint     # lint
npm run start    # serve the production build
```

Deploy is via the Vercel CLI / Git integration (`vercel --prod`).

## Source layout (target)

```
app/                # Next.js App Router entry (page.tsx, layout.tsx, globals.css)
components/         # Board, Cell, NextPreview, Scoreboard, GameOverlay, ...
lib/                # Pure game logic: tetrominoes, board ops, collision, scoring, RNG
```

Keep game logic in `lib/` pure and framework-free so it's testable and so lisa tracks touching
rendering vs. logic don't collide.

### Directory Conventions

```
docs/active/tickets/    # Ticket files (markdown with YAML frontmatter)
docs/active/stories/    # Story files (same frontmatter pattern)
docs/active/work/       # Work artifacts, one subdirectory per ticket ID
```

---

The RDSPI workflow definition is in docs/knowledge/rdspi-workflow.md and is injected into agent context by lisa automatically.
