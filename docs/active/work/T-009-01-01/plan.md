# T-009-01-01 — Plan: vendor-b28-clay-kit-via-justfile

## Steps

### Step 1 — Write `justfile`

Create `justfile` at repo root with `default` and `sync-kit` recipes as specified in
`structure.md`. Verify with `just --list` (should show both recipes without a syntax error —
`just` parses the file eagerly, so a malformed recipe fails immediately and loudly).

Verification: `just --list` exits 0 and prints `sync-kit`.

### Step 2 — Run `sync-kit` for real

Run `just sync-kit`. This is the actual acceptance-criterion-satisfying step: it must create
`styles/vendor/b28-clay.css` on disk with the live kit content.

Verification:
- Command exits 0.
- `styles/vendor/b28-clay.css` exists.
- File content starts with the kit's header comment (`b28-clay.css — the b28.dev shared style
  kit.`) and contains `--clay-primary`, `--clay-bg`, `.clay-surface`, `.clay-button` — i.e. real
  token content, not an empty file or an HTML error page.
- File size is non-trivial (research observed 5744 bytes; exact byte count may drift if the
  upstream kit is revised, so check for "reasonably sized real CSS," not an exact byte match).

### Step 3 — Confirm git tracking

Run `git status`. Both `justfile` and `styles/vendor/b28-clay.css` should appear as untracked/new
(not ignored). This confirms the design decision that the vendored file is meant to be committed,
not gitignored.

Verification: `git status --porcelain` lists both paths without `!!` (ignored) markers.

### Step 4 — Re-run idempotency check

Run `just sync-kit` a second time. Should succeed again and overwrite the file (proves the recipe
is safe to re-run, matching the epic's "Done looks like": re-syncing must pick up future kit
changes without any special-casing).

Verification: second run exits 0; file still present and correct.

## Testing strategy

- **No unit tests.** This ticket has zero `lib/` or component code — nothing for `vitest` to
  exercise. `npm run test` is unaffected and should still pass untouched (a passive check that
  this ticket didn't accidentally break anything elsewhere).
- **No lint impact.** `justfile` and vendored CSS are outside ESLint's scanned surface
  (`eslint.config.mjs` targets JS/TS); `npm run lint` should be unaffected.
- **Manual/procedural verification only** (steps 1–4 above), since the acceptance criterion itself
  is procedural: "running `just sync-kit` fetches ... and writes it to a vendored path ... present
  on disk with real kit token content." There is no code path to unit-test — the recipe's
  correctness *is* the verification.
- Optionally confirm `npm run build` still succeeds unmodified (sanity check that adding an inert
  vendored CSS file, not yet imported by anything, doesn't affect the Vite/Tailwind build). Not
  strictly required by the acceptance criterion since nothing imports the file yet, but cheap and
  rules out any implicit Tailwind content-scanning surprise (Tailwind v4 could in principle scan
  `styles/` for class names, though nothing in this ticket enables that).

## Commit strategy

One atomic commit for this ticket: `justfile` + the generated `styles/vendor/b28-clay.css`
together, since the second is meaningless without the first and both are required together to
satisfy the acceptance criterion. Message will describe standing up the sync-kit recipe and
vendoring the initial kit snapshot.

## Risks / things that could deviate

- If `b28.dev` becomes unreachable at Implement time, Step 2 fails — research already confirmed
  the URL is live (HTTP 200, 5744 bytes) moments before this plan was written, so this is a
  low-probability, already-mitigated risk, but if it recurs the deviation (and retry) will be
  logged in `progress.md`.
- None of the other steps have meaningful failure modes — this is a low-risk, mechanical ticket.
