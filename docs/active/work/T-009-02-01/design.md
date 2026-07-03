# T-009-02-01 — Design: retone-piece-oklch-palette-for-clay

## Decision up front

Edit only the seven `oklch(...)` literals inside `app/globals.css`'s `@theme static` block.
Keep the existing hue assignment (one hue per I/O/T/S/Z/J/L, same hue angles) and lightness
band unchanged in kind, but drop chroma across all seven from the 0.11–0.17 range (current
uncommitted intermediate state) down to a 0.065–0.085 range — below `--clay-primary`'s
C=0.093, so no piece color out-saturates the kit's own brand accent — with small compensating
lightness trims (-0.02 to -0.04) on the highest-lightness pieces so lower chroma doesn't read
as washed-out pastel at high L. No other line in the file changes.

```css
@theme static {
  --color-piece-i: oklch(0.78 0.075 75);   /* amber  */
  --color-piece-o: oklch(0.76 0.065 190);  /* teal   */
  --color-piece-t: oklch(0.70 0.085 10);   /* rose   */
  --color-piece-s: oklch(0.64 0.085 300);  /* violet */
  --color-piece-z: oklch(0.78 0.075 120);  /* chartreuse */
  --color-piece-j: oklch(0.68 0.085 40);   /* coral  */
  --color-piece-l: oklch(0.72 0.07 240);   /* sky    */
}
```

## Options considered

### A — Chroma-only retone, keep hue/lightness band (chosen)

As above: touch only the numeric chroma (and minor lightness) values, leave hue angles and the
comment names (`amber`/`teal`/`rose`/`violet`/`chartreuse`/`coral`/`sky`) untouched since they
still describe the resulting colors accurately at lower chroma.

**Why this wins:**
- The AC is explicit and narrow: "chroma values... measurably lower... still one hue per
  piece, still visually distinguishable." It does not ask for hue reassignment or a lightness
  overhaul — the smallest change that satisfies the letter of the AC is a chroma edit.
- Anchoring the new ceiling at `--clay-primary`'s C=0.093 (Research) gives a principled,
  non-arbitrary target instead of guessing a "looks muted" number. All seven land at or below
  that ceiling (0.065–0.085), so the piece palette reads as secondary to the brand accent, not
  competing with it — consistent with the kit's own chroma vocabulary where only the one
  accent token is chromatic and everything else is near-neutral.
- Distinguishability survives the drop: the seven hues (75, 190, 10, 300, 120, 40, 240) are
  already spread around the wheel from the intermediate edit (closest pair is J@40/T@10, 30°
  apart, or I@75/J@40, 35° apart — both still resolvable at these lightness deltas). Lowering
  chroma uniformly preserves relative hue separation; nothing collapses into another.
- Satisfies the AC against *either* baseline reading (Research's "two baselines" finding):
  0.065–0.085 is measurably lower than both the committed 0.15–0.23 set and the uncommitted
  intermediate 0.11–0.17 set.
- Zero consumer-side risk: confirmed in Research that no component or test references specific
  oklch/hex values, only class-name strings that don't change.

### B — Keep the intermediate uncommitted values as-is (do nothing further)

**Rejected.** The intermediate 0.11–0.17 chroma range is lower than the *committed* baseline
(0.15–0.23) and would technically pass a literal "lower than pre-change" check against that
baseline alone. But it still exceeds `--clay-primary`'s C=0.093 by 20–80%, so it does not read
as "muted" against the kit's own vocabulary — the ticket's Context explicitly asks for hues
"that read correctly on cream clay," not just "somewhat toned down from neon." Also risky:
that intermediate state was never reviewed or intentionally authored as this ticket's output
(Research found it orphaned, with no RDSPI artifacts backing it) — treating unreviewed,
undocumented WIP as "done" skips the judgment this phase exists to apply.

### C — Reassign hues to avoid any close pairs, in addition to lowering chroma

E.g. spread J and T further apart, or replace chartreuse (Z, H120, a hue that reads as
yellow-green and can look sickly at low chroma near a warm-cream background) with a hue further
from I's amber.

**Rejected for this ticket.** The AC only requires "one hue per piece... still visually
distinguishable" — it does not ask for hue redesign, and the current hue set is already
adequately spread (Option A's distinguishability argument holds). Reassigning hues is a larger,
more subjective design decision (which hue reads best for which piece is a matter of taste/
convention — I is traditionally cyan in most Tetris-likes, for instance) that the ticket's
narrow Context/AC doesn't authorize. If Z's chartreuse reads poorly in practice, that's a
follow-up ticket's call, not a reason to silently expand this one's scope.

### D — Reduce chroma to near-zero (e.g. 0.02–0.04) for maximum "sincere claymorphism" restraint

**Rejected.** At L values in the 0.64–0.78 band, chroma below ~0.05 starts to look like tinted
gray rather than a distinct color — pieces would stop being "visually distinguishable" from
each other by hue alone at that point, since perceptual hue discrimination degrades as chroma
approaches the achromatic axis. This would satisfy "measurably lower" and "muted" but fail the
AC's distinguishability clause. 0.065–0.085 is chosen specifically because it's the range where
hue is still clearly perceptible while chroma is still below the brand accent's ceiling.

### E — Compute lightness/chroma to equalize perceptual distinguishability precisely (e.g. via ΔEOK pairwise distance optimization)

**Rejected as overkill.** No tooling in this repo computes ΔEOK or runs a contrast-optimization
pass, and the AC's bar is qualitative ("visually distinguishable"), not a numeric contrast
threshold. Hand-tuning against a principled anchor (the brand accent's chroma) and verifying by
eye (dev-server render, Implement phase) is proportionate to a ~200-line CSS-value ticket;
building or reaching for a perceptual-distance tool would be scope creep for this task.

## Per-piece rationale for the specific chosen values

- **I (amber, H75) 0.13→0.075, L 0.80→0.78**: Amber at high L and low-mid C is the color most
  at risk of washing toward the cream background's own hue (`--clay-bg` H≈78, almost identical
  angle) — nudging L down 0.02 keeps it a shade darker than the page background so it doesn't
  blend into the well/surface field alongside chroma reduction.
- **O (teal, H190) 0.11→0.065, L 0.78→0.76**: Already the lowest-chroma piece pre-edit; scaled
  proportionally with the rest rather than left as an outlier, so the full set reads as one
  coherent, deliberately-muted family rather than six retoned colors plus one untouched.
- **T (rose, H10) 0.16→0.085, L 0.72→0.70**: Rose/red carries chroma well at moderate L without
  looking pastel, so it's given the upper end of the new range (0.085, at `--clay-primary`'s
  ceiling minus a hair) to stay clearly "warm red," not pink.
- **S (violet, H300) 0.17→0.085, L 0.66→0.64**: Same reasoning as T — violet at low chroma can
  drift toward gray-lavender, so it keeps the upper end of the range and a slightly lower L
  (violet already reads darker than the others at equal L, matching the original set's own
  choice of L=0.66, the lowest of the seven).
- **Z (chartreuse, H120) 0.16→0.075, L 0.82→0.78**: Chartreuse is the piece most likely to look
  "neon-sickly" if left too saturated on a warm cream field (yellow-green fights the warm
  palette hardest of the seven) — given both a chroma cut to the lower-middle of the range and
  the largest lightness trim (-0.04) to settle it rather than let it stay the brightest, most
  attention-grabbing piece in the set.
- **J (coral, H40) 0.17→0.085, L 0.70→0.68**: Coral neighbors amber (I, H75) and rose (T, H10)
  in hue space — kept at the upper end of the range so it stays clearly distinct from both
  close neighbors rather than blending toward either as chroma drops.
- **L (sky, H240) 0.12→0.07, L 0.75→0.72**: Sky blue is the piece hue closest to
  `--clay-primary` itself (H258 vs H240, 18° apart) — deliberately kept at lower-middle chroma
  (0.07) so it reads as a distinct, softer piece color and doesn't compete with or get confused
  for the brand accent used elsewhere in the UI (buttons, links).

## What stays untouched (explicit non-goals)

- Hue angles (75/190/10/300/120/40/240) — unchanged, per Option C's rejection.
- The `bg-`/`text-`/`border-`/`ring-piece-*` utility family, `.glow-*` utilities, and every
  component consumer (`Cell.tsx`, `HoldBox.tsx`, `NextPreview.tsx`) — confirmed in Research
  that these need zero edits since they reference tokens by name, not value.
- The `.flash` keyframe tint and the "Per-tetromino"→"Per-piece" comment rename already
  uncommitted in the working tree — pre-existing, out of this ticket's scope, left as-is.
- `@theme static` (vs. `@theme`) — unchanged; still required so the utility family isn't
  tree-shaken (Research).
