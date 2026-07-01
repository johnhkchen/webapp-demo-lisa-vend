# Vend — Charter

The **value function** for this project: what is worth allocating on, so cleared work is
valuable, not merely valid. Anchored to `vision.md` — a Tetris demo that ships in one sitting.

## What "valuable" means here — the invariants
Rank a candidate signal by how much it moves us toward *a playable, beautiful, deployed game,
fast*. Value = **demo payoff per unit of effort**, ordered by these named invariants. Every
admitted epic must advance at least one; references resolve to these IDs:

- **P1 — Playability.** A working game loop — spawn, move, rotate, drop, lock, clear lines,
  game-over — outranks everything. Without it there is no demo.
- **P2 — The wow (visual impact).** Neon/glass theme, smooth 60fps animation, line-clear
  juice. The *point* of this demo, not optional trim. Ranks just under core playability.
- **P3 — Shippability.** A clean Vercel deploy with a shareable public URL and a passing
  production build. A game nobody can reach isn't a demo.
- **P4 — Feel.** Scoring, levels, next-piece preview, hold, ghost piece, localStorage
  high-score — the touches that make it satisfying to keep playing. Pulled in descending
  payoff order.

## The gates (what gets admitted)
A signal clears only if it is:
- **Valuable** — advances playable · beautiful · deployed. If it doesn't, shelve it.
- **Allocatable** — completable within a single lisa-loop span; no multi-day yaks.
- **In-bounds** — inside the vision's scope (single-player web Tetris). Reject backend,
  accounts, multiplayer, native apps.
- **Well-formed** — decomposes into graph-valid stories/tickets with clean file boundaries so
  lisa can build tracks in parallel.

## De-prioritize / reject
- Backend, persistence beyond `localStorage` high-scores, auth, analytics.
- Config/tooling yaks that don't move the demo.
- Anything that trades the "ships in one sitting" property for completeness.

## Tie-breaker
When two signals tie on value, pull the one that is **more demoable sooner** — the one that
makes the screen look or feel more finished first.
