# Research — T-005-01-01: add-vercel-project-config

Descriptive map of the repo as it bears on declaring an in-repo Vercel project config. What
exists, where, how it connects, and the constraints. No solutions proposed here.

## The ticket in one line

Declare, in a repo-root config file, how this app deploys to Vercel: the **Next.js framework
preset** and `npm run build` as the **build command**, so deploy settings are versioned in-repo
rather than living only in the Vercel dashboard. AC: `vercel.json` (or equivalent) exists at repo
root declaring the Next.js preset and `npm run build` as build command; the config schema
validates and `npx vercel build` resolves the build locally — with **no game/component files
touched**.

## Where this sits in the epic

E-005 (`wire-vercel-early-deploy`) front-loads the P3 "Shippability" invariant: stand up the deploy
pipeline early so the demo has a real, self-updating public URL from the moment the skeleton runs.
The epic is split into three tracks — **project-config** (this story, S-005-01), **build-gate**,
and **Git-auto-deploy**. This ticket is the *project-config* slice: the static, in-repo declaration
of framework + build command. The live `vercel --prod` / Git-integration wiring (which needs
human-held Vercel account credentials) is a **separate, downstream** concern — flagged by the epic
as an external prerequisite, explicitly not in this ticket.

### HARD BOUNDARY (from E-005)

This work is config-only. It touches deploy/project settings and edits **NO** game logic (`lib/`),
**NO** components (`components/`), and **NO** app-tick/game-loop code. The AC restates this: "no
game/component files touched." The deliverable is one new root config file.

## Repo state (the ground truth)

The Next.js/TypeScript skeleton is already scaffolded and green — this ticket's sole prerequisite
(T-001-03-01, `phase: done`) is satisfied. Observed at repo root:

- `package.json` — `name: webapp-demo-lisa-vend`, `private: true`. Scripts:
  - `dev` → `next dev`
  - `build` → `next build`   ← the command this ticket names
  - `start` → `next start`
  - `lint` → `eslint --max-warnings 0`
  - `test` → `vitest run`
  - Dependencies: `next 16.2.9`, `react 19.2.4`, `react-dom 19.2.4`. Dev: Tailwind v4
    (`@tailwindcss/postcss`), `eslint 9` + `eslint-config-next 16.2.9`, `typescript 5`,
    `vitest 4.1.9`.
- `next.config.ts` — present, minimal (a bare `NextConfig` object, no custom options). Confirms the
  App-Router Next.js framework Vercel must detect.
- `app/` — App Router entry: `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`.
- `components/` — `Board.tsx`, `Cell.tsx` (the placeholder board from T-001-03-01).
- `lib/` — pure game-logic modules (tetrominoes, board ops, scoring, RNG, `step()` reducer).
- `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`, `next-env.d.ts` — standard config.
- `public/` — empty.
- **No `vercel.json` exists yet.** This ticket creates the first one.

## Deploy-relevant facts

- **Framework auto-detection.** Vercel already auto-detects Next.js from `next` in
  `package.json`; the default build command for the Next.js preset is effectively `next build`.
  So the config this ticket adds is, in behavior, largely a *codification of the defaults* — its
  value is making them explicit, versioned, and review-visible in-repo (the epic's whole thesis:
  "deploy settings live in-repo"), not changing what Vercel would otherwise infer.
- **`npm run build` vs `next build`.** The AC names `npm run build`. That script is exactly
  `next build`, so declaring `buildCommand: "npm run build"` is consistent with the framework
  preset and the CLAUDE.md "must pass before deploy" gate. Vercel runs the declared `buildCommand`
  when present, overriding the preset default with the (identical-in-effect) script indirection.
- **`.gitignore`** already ignores `.vercel` (the local link/credentials dir) and `.next/`
  (build output). A committed `vercel.json` is *not* ignored — it is meant to be tracked. No
  gitignore change is needed.
- **Output.** Next.js App Router on Vercel deploys as the standard Next runtime (SSR + static);
  no `output` override (e.g. `export`) is wanted — the app uses client-side RAF game loop but is
  served as a normal Next app. Nothing in-repo suggests a static-export requirement.

## The config surface: `vercel.json`

Vercel's project config file is `vercel.json` at repo root. Fields relevant to this ticket:

- `framework` — the framework preset slug; `"nextjs"` for this app.
- `buildCommand` — overrides the preset's default build; here `"npm run build"`.
- `$schema` — optional JSON-Schema URL (`https://openapi.vercel.sh/vercel.json`) enabling
  editor validation; conventional, low-cost, and directly serves the AC's "config schema
  validates" clause.

Other fields (`installCommand`, `devCommand`, `outputDirectory`, `regions`, `rewrites`,
`headers`, …) are out of scope: the ticket asks only for framework + build command, and the
epic's config-only boundary discourages incidental settings.

## Precedent in this repo

No prior deploy/CI config exists — this is the first infra-config ticket. The closest process
precedent is the RDSPI artifact discipline itself (e.g. `docs/active/work/T-004-03-01/`), which
this ticket follows. Unlike sibling feature tickets, there is **no test file** to add: the
deliverable is declarative config, verified by schema validation + a `vercel build` resolve, not
by unit tests.

## Constraints & assumptions

- **Config-only.** Exactly one new root file (`vercel.json`); no edits under `app/`, `components/`,
  or `lib/`; no dependency changes; no ticket-frontmatter edits (Lisa owns phase/status).
- **Verification limit (important).** `npx vercel build` requires the Vercel CLI (`vercel`
  package). It is **not** in `node_modules`, and the sandbox has no registry access to fetch it
  (`npx vercel` fails: "missing packages and no YES option"). So the AC's live `npx vercel build`
  resolve **cannot be executed in this environment** — this must be surfaced in Review as a
  verification gap, with the structurally-validatable parts (well-formed JSON, correct field
  values against the documented schema, `npm run build` itself passing) checked in its place.
- **No credentials.** Live deploy (`vercel --prod`, Git integration) needs a human-held Vercel
  account and is explicitly downstream (separate story/epic scope) — not attempted here.
- **Idempotent with Vercel defaults.** Because the values mirror Vercel's Next.js auto-detection,
  the config should not change deploy *behavior*; it makes the behavior explicit and versioned.
