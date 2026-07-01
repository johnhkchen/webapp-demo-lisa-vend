# Vend — Vision

**A visually stunning Tetris that ships in one sitting.**

This project exists to showcase the vend→lisa drive on a task with fast, tangible payoff: a
complete, polished, single-player Tetris game built with Next.js and deployed live to Vercel.
It is a demo — its worth is measured by how quickly it becomes something you can *play* and
*show*, not by feature breadth.

## What it is
- A single-page Next.js (App Router) web app rendering a classic Tetris board.
- Real Tetris mechanics: 7-piece tetromino set, rotation, soft/hard drop, line clears,
  scoring, levels, and a next-piece preview.
- A deliberately beautiful presentation layer: neon/glass aesthetic, smooth 60fps animation,
  satisfying line-clear feedback ("juice"). The look is a first-class deliverable, not polish
  deferred to "later."
- Deployed and reachable at a public URL on **Cloudflare Workers**, via **vinext** (Cloudflare's
  Vite-based Next.js-compatible runtime) — `vinext deploy`.

## What it is not
- Not multiplayer, not an account system, not a backend/database.
- Not a mobile-native app (responsive web is enough).
- Not a platform for arbitrary future features — scope stays demo-tight.

## The bar
Done means: a stranger can open the public Cloudflare Workers URL, understand it in three
seconds, play a full game with keyboard controls, and want to send it to a friend.
