/**
 * `StartOverlay` — the arcade "PRESS START" banner shown while the attract demo auto-plays
 * (T-008-02-01).
 *
 * Presentational and props-driven, in the same discipline as `GameOverlay`/`Board`: no state, no
 * game logic, and `return null` when hidden so a non-attract board has zero overlay footprint.
 *
 * Deliberately **non-blocking**, unlike `GameOverlay`: the ticket requires the board to auto-play
 * *behind* this overlay, so it must not obscure the demo. It is a bottom-anchored translucent pill
 * (no full-board dim/blur) with `pointer-events-none`, so the auto-play stays fully visible and the
 * overlay never intercepts input. It pulses to read as an arcade attract prompt and uses the kit's
 * `.clay-button` pill so it belongs to the same system as the other overlays, per E-009.
 *
 * Scope: this is the *presentation* only. Making a key/click actually start a human game — halting
 * the bot and handing off to a fresh game with no input bleed-through — is `T-008-02-02`; hence no
 * handlers here (the arcade idiom shows a live "PRESS START" prompt over a playing demo).
 */

interface StartOverlayProps {
  /** Show the banner. When false the component renders nothing (zero DOM footprint). */
  visible: boolean;
}

export default function StartOverlay({ visible }: StartOverlayProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
    >
      <span className="clay-button animate-pulse text-sm uppercase tracking-widest">
        Press Start
      </span>
    </div>
  );
}
