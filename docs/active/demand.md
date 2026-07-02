# Vend — Demand (the pull board)

Thin demand **signals**, not epics — one line of "what + why it might matter." Epics are
**pulled** from here just-in-time when there's capacity; clearing (signal → epic →
stories/tickets) happens on pull, never ahead of demand. Cleared signals crystallize to
one line in `docs/archive/demand-cleared.md` and are deleted from here.

Seeded from the **single-shot vs many-shot retrospective** (`tetris.html` one-shot vs this
pipeline build). The thesis under test: _does a many-shot pipeline with revision — and the
ability to study the one-shot — produce a better system, and is the extra time worth it?_

---

## Tier 1 — Close the visible gap (features the one-shot has and we deferred)

- **Feel pack: ghost piece + hold + next-piece preview + pause** — the one-shot ships all four;
  our pipeline deferred the entire P4 "feel" epic, so a player sees a thinner game than a
  minutes-long one-shot. Highest player-facing payoff. _(advances P4)_
- **Mobile / touch controls + responsive layout** — the one-shot is playable on a phone by
  double-click (on-screen buttons, media-query layout); ours has zero touch support and assumes
  a keyboard. Closes the "who can actually play it" gap. _(advances P1)_

## Tier 2 — Steal what the one-shot did *better*

- **Adopt a distinctive art direction over default neon/glass** — the one-shot's opinionated
  editorial/letterpress look (paper grain, red wedge, offset-gold title, "PLATE NO. 1984")
  out-"stuns" our safe neon default; distinctiveness is the demo's real wow. _(advances P2)_
- **Line-clear juice + ghost rendering + block bevels** — the one-shot's canvas got flash,
  beveled highlights, and a translucent ghost nearly for free; our DOM board is static. Add the
  motion/feedback that makes it satisfying to keep playing. _(advances P2)_

## Tier 3 — Make the benchmark itself a deliverable (the real thesis)

- **Define a "better system" rubric and score both builds** — turn the central question into
  something measurable: feature parity, SRS/rotation correctness, RNG determinism, test
  coverage, a11y, LOC, deployability, and time-to-first-playable. _(advances P5)_
- **Differential-conformance test: replay identical inputs through both cores** — feed the same
  seed + input log to our seeded core and a harnessed `tetris.html`, diff the outcomes to prove
  where guideline-SRS/determinism actually diverges from the naive one-shot. _(advances P5)_
- **Publish a side-by-side comparison page (deploy both, embed the scorecard)** — the demo's
  thesis is the comparison; make it a shippable artifact, not just a doc. _(advances P3, P5)_

## Tier 4 — Show off the power of TypeScript (P5 — where a one-shot can't follow)

- **Make illegal states unrepresentable** — refactor `GameState` into a discriminated union over
  its status (`Ready|Playing|Paused|Clearing|GameOver`), so `clearingRows` exists *only* in the
  clearing variant, etc.; drive every reducer branch through an exhaustive `switch` with an
  `assertNever` default. A new state that isn't handled becomes a *compile error*. _(advances P5)_
- **Branded domain types + strictest tsconfig** — brand `Row`/`Col`/`Seed`/`Score` so a column
  can't be passed where a row is expected, and turn on `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`; make the whole core pass. Types catch the
  exact `board[br][bc]` bug class the untyped one-shot can't. _(advances P5)_
- **Property-based invariant tests (fast-check)** — generate thousands of random games and assert
  invariants: gravity never leaves a floating gap, line-clear conserves cell count, the 7-bag
  emits each piece exactly once per 7, SRS rotation is reversible, score is monotonic. The
  headline correctness flex vs. the zero-test one-shot. _(advances P5, feeds Tier-3 rubric)_
- **Deterministic replay + shareable seed URLs** — expose a pure `replay(seed, inputs): GameState`
  and encode a finished game as a `?seed=…&inputs=…` URL so anyone can replay your exact run.
  A genuinely cool, type-safe feature a one-shot can't offer — and it *is* the harness Tier-3's
  differential test needs. _(advances P5 + P4)_
- **Runtime-validated persistence (Zod)** — Zod schemas that mirror the types 1:1 and validate
  `localStorage` high-scores/settings, so a corrupted save degrades gracefully instead of
  crashing. Type-safe boundary + real polish. _(advances P4, P5)_

---

_Note: Tier 3 & 4 advance **P5 — Engineering rigor as proof** (now in `charter.md`), so they clear
the `bounds` gate. Tier 1 & 2 clear against P1/P2/P4. All are pullable today via `vend chain`._
