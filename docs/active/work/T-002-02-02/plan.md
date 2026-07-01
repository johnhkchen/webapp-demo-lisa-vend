# Plan — T-002-02-02: spawn-and-horizontal-soft-move

Ordered, verifiable steps. Testing strategy and verification criteria. Small enough to commit
atomically (this ticket is two new files → one commit after both pass).

## Testing strategy

- **Unit only** — everything here is pure `lib/` logic (no React, no I/O), so Vitest unit tests
  fully cover it. No integration/e2e needed at this layer.
- **Table-driven** for the enumerable cases (per-type spawn columns; the move/no-op matrix),
  matching `collision.test.ts` (`Case` interface + `it.each`).
- **Property-style guards** for the invariants: no mutation of input `piece`/`board`
  (JSON snapshot), and reference identity on no-op (`result === piece`) vs fresh object on a
  legal move (`result !== piece`).
- **AC coverage**: one focused test drives `spawn → left/right/down` and asserts updates on
  legal moves + no-op on collision — the literal acceptance criterion.

## Verification criteria (definition of done)

- `npm test` green, including the pre-existing suites (no regression) and the new
  `movement.test.ts`.
- `npm run lint` clean (`--max-warnings 0`).
- Acceptance criterion demonstrably exercised by a named test.
- No mutation of shared shape tables / board / input piece.

---

## Steps

### Step 1 — `lib/movement.ts`
Write the module per `structure.md`:
- house-style header doc-comment (role, purity, coordinate convention, scope boundary, no-op
  contract);
- `import type` for `Board, Piece, TetrominoType`; value imports `BOUNDING_BOX`, `collides`;
- `spawnPiece(type, width)` — centered `x = floor((width - BOUNDING_BOX[type]) / 2)`, `y = 0`,
  `rotation: 0`;
- `tryMove(board, piece, dx, dy)` — compute `next` point, return input ref if `collides`, else
  a fresh `{ ...piece, position: next }`;
- `moveLeft` / `moveRight` / `softDrop` wrappers.
- *Verify*: `npx tsc --noEmit` (or rely on `next build` types) shows no type errors; import
  paths resolve.

### Step 2 — `lib/movement.test.ts`, spawn suite
- `describe("spawnPiece")`: table over all seven types on width 10 asserting `position.x`
  (I→3, O→4, else 3), `position.y===0`, `rotation===0`; a "all cells in bounds" assertion via
  `collides(emptyBoard(10,20), ...) === false`; a narrow-board centering case (width 6, O→2).
- *Verify*: `npm test` — spawn suite passes.

### Step 3 — `lib/movement.test.ts`, movement + AC suite
- `describe` for moves:
  - legal `moveLeft/Right`/`softDrop` update position and return a **new** object;
  - blocked at left wall / right wall / floor / settled overlap → **no-op**, returns the
    **same reference**, position unchanged;
  - the explicit **AC test**: spawn `T`, drive right/left/down (legal → updates) then push into
    a wall/settled cell (illegal → unchanged);
  - no-mutation guard on `piece` and `board` (JSON snapshot) for both a legal move and a no-op;
  - a compose test (spawn → right → right → down = summed offset).
- *Verify*: `npm test` — full suite green; `npm run lint` clean.

### Step 4 — Commit
- One commit, new files only: `feat(T-002-02-02): add piece spawn + collision-gated
  left/right/soft-drop movement with vitest`.
- Body notes: pure `lib/movement.ts` (spawn centered via `BOUNDING_BOX`, `tryMove` gates on
  `collides`, no-op returns input ref), table-driven tests incl. the AC drive.

---

## Risks / mitigations

- **Spawn column mismatch vs SRS** → mitigated by the per-type table test pinning I→3, O→4,
  rest→3 (the canonical columns); arithmetic re-derived in `design.md`.
- **Accidental mutation / aliasing** → explicit JSON-snapshot guards and a `result !== piece`
  (legal) / `result === piece` (no-op) pair.
- **Scope creep into rotation/lock** → structure fixes the surface to translation + spawn;
  `softDrop` doc explicitly disclaims locking (that is 02-04).
- **Degenerate narrow boards** (width < box) → out of AC scope; not special-cased (spawn is
  placement, not validity), noted in design.

## Out of scope (explicit)

Rotation & wall kicks (T-002-02-03); automatic gravity & lock-on-landing (T-002-02-04);
game-over/top-out policy; bag/queue wiring and any stateful reducer (later epic).
