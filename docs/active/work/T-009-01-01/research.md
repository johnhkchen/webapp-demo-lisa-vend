# T-009-01-01 — Research: vendor-b28-clay-kit-via-justfile

## Ticket in one line

Stand up a repo-root `justfile` with a `sync-kit` recipe that fetches
`https://b28.dev/kit/b28-clay.css` and writes it to a vendored path on disk (e.g.
`styles/vendor/b28-clay.css`). This ticket is purely plumbing — no styling, no component
changes, no `app/globals.css` edits. It's the first ticket in story `S-009-01`
(`clay-kit-foundation`), and the two siblings depend on its output:

- `T-009-01-02` (`wire-clay-tokens-into-tailwind-theme`, `depends_on: [T-009-01-01]`) — its
  acceptance criterion literally says "`app/globals.css` imports the vendored kit file", so the
  vendored file's **path** is this ticket's public contract with the rest of the epic.
- `T-009-01-03` (`load-lora-karla-fonts`) — depends on `-02`, not directly on this ticket, but the
  fonts it loads (`Lora`, `Karla`) are the same ones referenced by `--clay-font-display` /
  `--clay-font-body` inside the vendored file.

## What exists today

- **No `justfile`** anywhere in the repo (`find` / `ls` at root confirms). `just` (1.55.0) *is*
  installed on this machine (`/opt/homebrew/bin/just`), so a `justfile` here is immediately
  runnable, not aspirational.
- **No `styles/` directory** and no vendored/third-party CSS anywhere in the repo. The only CSS is
  `app/globals.css` (Tailwind v4 `@import "tailwindcss"`, hand-rolled dark-neon/glass tokens —
  `--background`/`--foreground`, `--color-piece-*`, `.glass`, `.glow-*`, `.flash`, `.motion-*`,
  all documented in code comments explaining Tailwind v4 tree-shaking traps for `@utility` /
  `@theme`-generated classes).
- **`.gitignore`** excludes `/node_modules`, `/.next/`, `/out/`, `/build`, `/dist/`, `.vinext/`,
  `.wrangler/`, `*.tsbuildinfo`, `next-env.d.ts`, `.env*`. Nothing there would exclude a
  `styles/vendor/` path — a vendored file placed there will be tracked by git by default, which
  matches the epic's intent ("vendors a copy... so 'propagate a change' = update this file, then
  `just sync-kit` + rebuild in each repo" — i.e., the vendored copy is meant to be committed and
  diffed, not gitignored like a build artifact).
- **`package.json`** scripts are `dev`/`build`/`start`/`lint`/`test`, all `vinext`/`vitest`
  wrappers. No existing `curl`/`fetch`-based sync or codegen step of any kind — this is a new
  category of tooling for the repo.
- **The kit URL is live.** `curl -sS https://b28.dev/kit/b28-clay.css` returns HTTP 200, 5744
  bytes, real CSS content (verified during this research pass — see below). It is *not* behind
  auth, not rate-limited in an obvious way, and not a placeholder.

## The kit content itself (as fetched)

`https://b28.dev/kit/b28-clay.css` is a single, self-contained, framework-agnostic file:

- A `:root` block of `--clay-*` custom properties: palette (`--clay-primary`, `--clay-bg`,
  `--clay-surface`, `--clay-well`, `--clay-ink`, etc.), type stacks (`--clay-font-display` = Lora
  stack, `--clay-font-body` = Karla stack), radii, and three warm/tinted box-shadow recipes
  (`--clay-shadow-raised`, `--clay-shadow-pressed`, `--clay-shadow-well`) plus a motion var.
- An opt-in `.b28-clay` scope class (sets background/color/font on whatever root element wears it).
- Primitive classes: `.clay-surface`, `.clay-well`, `.clay-button` (+ `.clay-button--soft`),
  `.clay-chip`.
- A `prefers-reduced-motion` block.
- No `@import`, no relative asset references, no font `@font-face` — it *references* Lora/Karla by
  family name but does not load them (that's explicitly `T-009-01-03`'s job via
  `next/font/google`, not this file's).
- Self-contained: nothing in the file depends on being served from `b28.dev` — it is safe to
  byte-copy verbatim into this repo. The file's own header comment states the vendoring contract
  explicitly: "Each project VENDORS a copy at build time... so 'propagate a change' = update this
  file, then `just sync-kit` + rebuild in each repo."

## Constraints and conventions surfaced by adjacent docs

- **User-global CLAUDE.md** (brand voice/visual identity) names the exact same contract: source of
  truth at `https://b28.dev/kit/b28-clay.css`, vendored via `just sync-kit`, primitives
  `.clay-surface`/`.clay-well`/`.clay-button`/`.clay-chip` — this ticket's acceptance criterion is
  a verbatim instance of that standing instruction, not a one-off.
- **E-009 epic doc** (`docs/active/epic/E-009.md`) explicitly calls out that no `justfile` exists
  yet and frames it as a prerequisite the epic must stand up, not assume — confirms this ticket is
  correctly scoped as the foundation-laying step, and that "vendor the kit" and "wire it into
  Tailwind" are deliberately two separate tickets (`-01` vs `-02`).
- **Non-goals from the epic**: purely CSS/token/build-tooling layer, no gameplay/`lib/` changes.
  Nothing in this ticket touches `lib/` or component rendering.
- **`docs/deploy.md`** describes the vinext/Cloudflare Workers build but has no existing
  prebuild/codegen hook — `just sync-kit` is a manual/dev-time step (run before `npm run build`),
  not wired into the build pipeline itself. Nothing in this ticket's acceptance criteria asks for
  automatic invocation during `npm run build`, so wiring it into the build is out of scope.

## Assumptions to carry into Design

- The vendored path suggested in the ticket text (`styles/vendor/b28-clay.css`) is a suggestion
  ("e.g."), not a hard requirement, but `T-009-01-02` will need to import *some* concrete path from
  `app/globals.css`, so whatever path is chosen here becomes a de facto interface — worth picking
  something obviously named and stable rather than optimizing further.
- `curl` is the natural fetch tool for a `justfile` recipe (already implicitly available via
  standard macOS/dev tooling; no existing project dependency on `wget` or a Node fetch script).
- The repo currently commits generated artifacts like `wrangler.jsonc` verbatim (per
  `docs/deploy.md`), which is precedent for committing `styles/vendor/b28-clay.css` as tracked,
  human-diffable output rather than gitignoring it.
