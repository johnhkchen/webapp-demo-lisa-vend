# Design — T-005-01-01: add-vercel-project-config

Options for declaring the Vercel project config, evaluated against the repo reality from
`research.md`. One approach chosen, with rationale; rejected options recorded.

## Decision (summary)

Add a single **`vercel.json`** at repo root with three keys: `$schema` (for validation),
`framework: "nextjs"`, and `buildCommand: "npm run build"`. Nothing else. No dependency added, no
edits to `app/`, `components/`, `lib/`, or `next.config.ts`.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build"
}
```

## Question 1 — Which config file?

- **A. `vercel.json` at repo root.** *(chosen)* The canonical, documented Vercel project-config
  file. The AC literally names it ("vercel.json (or equivalent)"). Editor/CLI schema validation is
  available via `$schema`. Versioned, review-visible, zero ambiguity.
- **B. Dashboard-only settings (no file).** Rejected — directly contradicts the epic thesis
  ("deploy settings live in-repo") and the AC (a file must exist). Not versioned, not reviewable.
- **C. `project.json` / `.vercel/project.json`.** Rejected — `.vercel/` is git-ignored and holds
  *linked-project identifiers/credentials*, not declarative build settings; it is machine-managed
  by `vercel link`, not a hand-authored in-repo config.

## Question 2 — Which fields to declare?

The AC asks for exactly two things: the **framework preset** and the **build command**. Design
adds one non-behavioral convenience field (`$schema`) and stops there.

- `framework: "nextjs"` — **required by AC.** The Next.js preset slug. Even though Vercel
  auto-detects Next from `package.json`, declaring it makes the preset explicit and version-pinned
  against accidental dashboard drift.
- `buildCommand: "npm run build"` — **required by AC.** Names the CLAUDE.md build gate. `npm run
  build` resolves to `next build`, so it is fully consistent with the `nextjs` preset (see
  Q4 on redundancy).
- `$schema: "https://openapi.vercel.sh/vercel.json"` — **added.** Enables IDE + CLI JSON-Schema
  validation, directly serving the AC clause "config schema validates." Costs one line, no
  behavioral effect. Conventional for hand-authored Vercel configs.
- **Everything else omitted** (`installCommand`, `devCommand`, `outputDirectory`, `regions`,
  `rewrites`, `headers`, `cleanUrls`, …). Rationale: the epic's HARD BOUNDARY is config-only and
  *minimal*; the ticket names two settings; adding incidental keys invites behavior changes and
  review surface the ticket did not ask for. Vercel's defaults for these are correct for a stock
  Next App-Router app.

## Question 3 — `framework: "nextjs"` + `buildCommand` together: any conflict?

No. When `buildCommand` is present Vercel runs it in place of the preset's default build step; the
preset still governs everything else (output detection, routing, function runtime, image
optimization). Because `npm run build` *is* `next build`, the declared command matches exactly what
the `nextjs` preset would have run by default — so the two keys are mutually consistent, not
competing. This is the intended, documented way to pin the build command while keeping the preset.

## Question 4 — Isn't `buildCommand: "npm run build"` redundant with the preset default?

Behaviorally, largely yes — and that is fine, it is the *point* of this ticket. The value is not
changing deploy behavior; it is making the framework + build command **explicit, versioned, and
review-visible in-repo** instead of relying on dashboard auto-detection (the epic's whole thesis).
Declaring the redundant-but-correct command is strictly safer than omitting it: it survives
dashboard resets and documents intent. The AC mandates it, so it stays.

## Question 5 — Do we need `output`/static-export or `installCommand`?

- `output: "export"` — **no.** The app is a normal Next App-Router app (SSR + static prerender of
  `/` and `/_not-found`, confirmed by `npm run build`). It uses a client-side RAF loop but is not a
  pure static export, and nothing in-repo requests one. Leaving output to the preset is correct.
- `installCommand` — **no.** Default (`npm install` from the committed `package-lock.json`) is
  correct; declaring it adds surface for no benefit.

## Question 6 — How is this verified, given no Vercel CLI in the sandbox?

The AC wants `npx vercel build` to resolve locally. Research established the Vercel CLI is **not**
installed and **cannot be fetched** in this sandbox (no registry access). Design accepts a
**partial, honest verification** and records the gap in Review:

1. **JSON well-formedness** — parse `vercel.json` (e.g. `node -e 'require("./vercel.json")'` /
   `JSON.parse`). Must succeed.
2. **Field correctness against the documented schema** — `framework` is the valid slug `"nextjs"`;
   `buildCommand` is a string; `$schema` points at the official schema URL. Checked by inspection
   against Vercel's published `vercel.json` schema.
3. **Build gate actually passes** — `npm run build` exits 0 (already confirmed this session:
   `/` and `/_not-found` prerendered static). This is the substance the `buildCommand` names.
4. **No forbidden files touched** — `git status` / `git show --stat` shows only `vercel.json` plus
   this ticket's work artifacts; nothing under `app/`, `components/`, `lib/`.

The one thing NOT executable here is the live `npx vercel build` invocation itself. That is a
tooling-availability limit of the sandbox, not a defect in the config; flagged for human/CI
follow-up in Review. The config is authored to pass it by construction.

## Rejected alternatives (recap)

- Dashboard-only / no file — violates AC + epic intent.
- `.vercel/project.json` — git-ignored, machine-managed, wrong file.
- Maximal config (regions/headers/rewrites/output) — violates the minimal, config-only boundary;
  risks unrequested behavior change.
- Omitting `$schema` — loses cheap validation that the AC's "schema validates" clause invites.

## Consequence

One new tracked root file. Deploy behavior unchanged vs. Vercel's Next auto-detection, but now
explicit and versioned — the reusable substrate the rest of E-005 (build-gate, Git auto-deploy)
builds on. Zero risk to game/render tracks (no shared files).
