/**
 * `GameOverlay` — the observable status layer over the board (E-003 game-over; E-007 pause).
 *
 * Presentational and props-driven, in the same discipline as `Board`/`Cell`: it holds no state and
 * no game logic. It only answers "should a banner cover the board, and which one." Both the terminal
 * game-over and the resumable pause states are decided by the pure core (`lib/game.ts` sets
 * `state.gameOver` on top-out and `state.paused` on the pause toggle) and read straight off the
 * hook; this component never recomputes either.
 *
 * `mode` selects the variant: `"gameOver"` (default) announces the end state via `role="alert"` with
 * the final score/lines summary; `"paused"` is a `role="status"` banner with a resume hint. The
 * dimmed-layer chrome is shared — only the `role`, heading, and sub-text differ — so the two variants
 * read as one system. `status` (polite) rather than `alert` (assertive) for pause: a user-initiated,
 * non-urgent state, and the distinct role keeps game-over `getByRole("alert")` queries unambiguous.
 *
 * Renders **nothing** when hidden (`return null`) so normal play leaves the DOM exactly as the bare
 * board — no stray overlay node. When visible it lays an absolutely positioned, dimmed layer over its
 * positioned parent (GameContainer's `relative` wrapper) so the frozen board stays visible beneath.
 *
 * Scope boundary: this is the *observable* layer, not the animated neon juice — the `.flash`/`.glow`
 * line-clear-and-wow treatment is E-004's to wire. Styling here is deliberately plain: a legible
 * banner, not a show — and, per E-009, drawn from the clay palette (`--color-background`/
 * `--color-foreground`) rather than the app's former neon/glass one.
 */

interface GameOverlayProps {
  /** Show the overlay layer. When false the component renders nothing. */
  visible: boolean;
  /** Which banner to show. `"gameOver"` (default) is the terminal end state; `"paused"` is resumable. */
  mode?: "gameOver" | "paused";
  /** Final score to display in the game-over summary (unused by the pause variant). */
  score: number;
  /** Total lines cleared over the game, for the game-over summary (unused by the pause variant). */
  lines: number;
}

export default function GameOverlay({
  visible,
  mode = "gameOver",
  score,
  lines,
}: GameOverlayProps) {
  if (!visible) return null;

  const paused = mode === "paused";

  return (
    <div
      role={paused ? "status" : "alert"}
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-foreground/70 text-center"
    >
      <h2 className="text-3xl font-bold tracking-tight text-background sm:text-4xl">
        {paused ? "PAUSED" : "GAME OVER"}
      </h2>
      <p className="text-sm text-background/70">
        {paused ? "Press P to resume" : `Score ${score} · Lines ${lines}`}
      </p>
    </div>
  );
}
