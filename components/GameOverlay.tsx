/**
 * `GameOverlay` — the observable game-over layer (E-003).
 *
 * Presentational and props-driven, in the same discipline as `Board`/`Cell`: it holds no state and
 * no game logic. It only answers "is the game over, and if so, show it." Game-over is decided by the
 * pure core (`lib/game.ts` sets `state.gameOver` on top-out) and read straight off the hook; this
 * component never recomputes it.
 *
 * Renders **nothing** when hidden (`return null`) so normal play leaves the DOM exactly as the bare
 * board — no stray overlay node. When visible it lays an absolutely positioned, dimmed layer over its
 * positioned parent (GameContainer's `relative` wrapper) so the frozen final board stays visible
 * beneath. `role="alert"` announces the end state to assistive tech the moment it appears.
 *
 * Scope boundary: this is the *observable* game-over for the render/loop/input epic (E-003), not the
 * animated neon juice — the `.flash`/`.glow` line-clear-and-wow treatment is E-004's to wire. Styling
 * here is deliberately plain: a legible banner, not a show.
 */

interface GameOverlayProps {
  /** Show the game-over layer. When false the component renders nothing. */
  visible: boolean;
  /** Final score to display in the end summary. */
  score: number;
  /** Total lines cleared over the game, for the end summary. */
  lines: number;
}

export default function GameOverlay({ visible, score, lines }: GameOverlayProps) {
  if (!visible) return null;

  return (
    <div
      role="alert"
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/70 text-center backdrop-blur-sm"
    >
      <h2 className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
        GAME OVER
      </h2>
      <p className="text-sm text-white/70">
        Score {score} · Lines {lines}
      </p>
    </div>
  );
}
