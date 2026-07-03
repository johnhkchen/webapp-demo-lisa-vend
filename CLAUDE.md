# CLAUDE.md

## Project

webapp-demo-lisa-vend — a visually stunning, single-player **RowClear** falling-block puzzle game built with Next.js
(App Router) and deployed to **Cloudflare Workers** via vinext (see `docs/deploy.md`). A
fast-payoff demo of the vend→lisa drive. See `docs/knowledge/vision.md` for scope and
`docs/knowledge/charter.md` for the value function.

## Stack

- Next.js (App Router) + React + TypeScript
- Client-side game loop (no backend); state in React + `requestAnimationFrame`
- Styling: Tailwind v4 (CSS-first `@import "tailwindcss"`) with a neon/glass theme
- Build/runtime + deploy: **vinext** (Cloudflare's Vite-based Next.js-compatible runtime),
  deployed to **Cloudflare Workers** via `vinext deploy` (generates `wrangler.jsonc`)

## Commands

Once the app is scaffolded (see the scaffold ticket), expect:

```bash
npm run dev      # local dev server at http://localhost:3000
npm run build    # production build (must pass before deploy)
npm run lint     # lint
npm run start    # serve the production build
```

After the vinext migration, `dev`/`build`/`start` run through vinext (Vite), and deploy is
`npx @vinext/cloudflare deploy` to Cloudflare Workers (requires `wrangler` auth / a Cloudflare
login). The committed `wrangler.jsonc` is the deploy artifact; see `docs/deploy.md` for the full
authenticated deploy runbook.

## Source layout (target)

```
app/                # Next.js App Router entry (page.tsx, layout.tsx, globals.css)
components/         # Board, Cell, NextPreview, Scoreboard, GameOverlay, ...
lib/                # Pure game logic: pieces, board ops, collision, scoring, RNG
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
