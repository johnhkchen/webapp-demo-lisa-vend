# Steer — staged board + forks

A ranked demand board read off the whole project, highest-leverage first. Un-promoted: review and pull a row.

| Signal | Value | Budget (envelope) | Status |
|---|---|---|---|
| **Scaffold the Next.js (App Router) + TypeScript app with the lint/build/dev commands and the app/ · components/ · lib/ layout** — Nothing exists yet — every other signal is blocked until there is a runnable app skeleton. Highest leverage: it unblocks the entire board. | **Keystone** | ~1 block (≈2h) | ready (advances [P3 shippability foundation, enables all downstream tracks] · grounded in CLAUDE.md: 'Once the app is scaffolded (see the scaffold ticket)…'; project snapshot Source modules (src/**): (none)) |
| **Build the pure game core in lib/: 7-tetromino set, rotation (SRS), collision, gravity/lock, line-clear detection, scoring, and a seeded RNG** — This IS the core feature — playability ranks above everything (charter #1). Framework-free logic in lib/ so rendering and logic tracks don't collide. | **Keystone** | ~2 blocks (≈4h) | blocked: scaffold (advances [P1 playability, core-feature: a working game loop] · grounded in vision.md 'Real Tetris mechanics: 7-piece tetromino set, rotation, soft/hard drop, line clears…'; CLAUDE.md 'Keep game logic in lib/ pure and framework-free') |
| **Wire the playable loop: Board/Cell components, requestAnimationFrame tick, and keyboard controls (move/rotate/soft+hard drop)** — Turns the pure core into something a stranger can actually play — the vision's 'done' bar. Bridges lib/ logic to the screen. | **High** | ~1 block (≈2h) | blocked: scaffold, game core (advances [P1 playability] · grounded in vision.md 'play a full game with keyboard controls'; CLAUDE.md components/ (Board, Cell) + rAF game loop) |
| **Apply the neon/glass theme + line-clear 'juice': 60fps animation, glow, clear-row feedback** — The look is a first-class deliverable, not deferred polish — it is the point of the demo (charter #2, ranks just under playability). | **High** | ~1–2 blocks (≈3h) | blocked: playable loop (advances [P2 the wow / visual impact] · grounded in vision.md 'deliberately beautiful presentation layer: neon/glass aesthetic, smooth 60fps animation, satisfying line-clear feedback ("juice")') |
| **Deploy to Vercel with a shareable public URL and a passing production build** — A game nobody can reach isn't a demo (charter #3). Delivers the vision's 'stranger opens the URL' outcome. | **Standard** | small (~1h) | blocked: playable build (advances [P3 shippability] · grounded in vision.md 'Deployed and reachable at a public Vercel URL'; CLAUDE.md 'Deploy is via the Vercel CLI / Git integration (vercel --prod)') |
| **Add the 'feel' touches in payoff order: next-piece preview, levels/speed-up, ghost piece, hold, and localStorage high-score** — The touches that make it satisfying to keep playing (charter #4). Pulled last, in descending payoff order; each is independently shippable. | **Leaf** | ~1 block (≈2h), splittable per touch | blocked: playable loop (advances [P4 feel] · grounded in vision.md 'scoring, levels, and a next-piece preview'; charter #4 'next-piece preview, hold, ghost piece'; charter allows 'localStorage high-scores') |

## Pull these

A human pulls any one staged signal onto the board with one gesture:

```
vend chain "Scaffold the Next.js (App Router) + TypeScript app with the lint/build/dev commands and the app/ · components/ · lib/ layout — Nothing exists yet — every other signal is blocked until there is a runnable app skeleton. Highest leverage: it unblocks the entire board."   # recommended next pull (highest leverage)
vend chain "Build the pure game core in lib/: 7-tetromino set, rotation (SRS), collision, gravity/lock, line-clear detection, scoring, and a seeded RNG — This IS the core feature — playability ranks above everything (charter #1). Framework-free logic in lib/ so rendering and logic tracks don't collide."
vend chain "Wire the playable loop: Board/Cell components, requestAnimationFrame tick, and keyboard controls (move/rotate/soft+hard drop) — Turns the pure core into something a stranger can actually play — the vision's 'done' bar. Bridges lib/ logic to the screen."
vend chain "Apply the neon/glass theme + line-clear 'juice': 60fps animation, glow, clear-row feedback — The look is a first-class deliverable, not deferred polish — it is the point of the demo (charter #2, ranks just under playability)."
vend chain "Deploy to Vercel with a shareable public URL and a passing production build — A game nobody can reach isn't a demo (charter #3). Delivers the vision's 'stranger opens the URL' outcome."
vend chain "Add the 'feel' touches in payoff order: next-piece preview, levels/speed-up, ghost piece, hold, and localStorage high-score — The touches that make it satisfying to keep playing (charter #4). Pulled last, in descending payoff order; each is independently shippable."
```

## Forks

The genuine decisions only the human can make — each recommendation-first. Assent or override:

### Fork — Which styling substrate does the scaffold commit to — Tailwind or CSS Modules?
- **Why it matters:** CLAUDE.md explicitly leaves this to the scaffold ticket, and it is load-bearing: every component and the entire visual-wow track inherits the choice. Switching later means rewriting styling across the app.
- **Options:**
  1. Tailwind — utility-first, fastest to iterate a neon/glass theme
  2. CSS Modules — scoped hand-written CSS, maximal control over glow/glass effects
- **Vend recommends:** Tailwind — the 'ships in one sitting' property favors speed, and arbitrary values still allow the custom neon/glass look.

### Fork — What renders the board — a React/DOM cell grid or an HTML Canvas?
- **Why it matters:** This decides the shape of the rendering track and the ceiling on line-clear juice. It is hard to reverse once components and animations are built against one model.
- **Options:**
  1. DOM/CSS grid of cells — simplest, easiest to style with the neon/glass theme and CSS transitions
  2. HTML Canvas — one draw surface, better headroom for heavy particle 'juice' and guaranteed 60fps at scale
- **Vend recommends:** DOM/CSS grid — a 10×20 board is tiny, so DOM hits 60fps easily and unlocks the neon theme fastest; escalate to Canvas only if particle juice demands it.

_Staged by Vend's `steer` play — not promoted; pull a signal / assent to a fork to clear._
