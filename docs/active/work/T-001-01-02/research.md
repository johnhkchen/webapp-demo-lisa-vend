# Research — T-001-01-02: verify-lint-runs-clean

Descriptive map of the linting setup as it exists today. What is present, how it is wired,
and where the acceptance criteria are and are not currently met. No solutions proposed here.

## Ticket in one line

Lock in a clean, **enforced** lint baseline so downstream tracks inherit a green quality gate
rather than accumulating drift. Acceptance: `npm run lint` exits 0 with **zero
warnings/errors** on a clean checkout, with an ESLint config present and wired to `lint`.

Depends on `T-001-01-01` (scaffold), which is complete — the app, config, and tooling exist.

## Toolchain (from `package.json`)

- ESLint **9.39.4** (flat config), `eslint-config-next` **16.2.9**.
- Next.js **16.2.9**, React **19.2.4**, TypeScript **5**, Tailwind **v4**, Node **26.4.0**.
- Scripts: `dev` / `build` / `start` and **`"lint": "eslint"`** — bare `eslint`, no flags,
  no explicit target paths.

## ESLint configuration (`eslint.config.mjs`)

Flat config (ESLint 9 `defineConfig`), composed from:
- `eslint-config-next/core-web-vitals` — React/Next best-practice + a11y rules.
- `eslint-config-next/typescript` — `@typescript-eslint` rule set.
- A `globalIgnores([...])` re-declaring Next's defaults (`.next/**`, `out/**`, `build/**`,
  `next-env.d.ts`) because a user-supplied `ignores` replaces the preset's built-in ignores.

`npx eslint --print-config components/Board.tsx` resolves successfully (~1610 lines of merged
config), confirming the config is valid and applies to `.tsx` source.

## What the lint currently covers

Source tree under lint scope: `app/` (`layout.tsx`, `page.tsx`, `globals.css`),
`components/Board.tsx`, `lib/constants.ts`, plus root config `.ts`/`.mjs` files. All are
scaffold placeholders — no game logic yet.

Bare `eslint` under flat config lints the current working directory tree (respecting the
config's `ignores`); it does inspect real files — verified below.

## Observed behavior (verification probes)

1. **Clean checkout is green.** `npm run lint` → **exit 0**, no output. `npx eslint
   --max-warnings=0` → **exit 0** as well. So today there are literally zero warnings and
   zero errors to fix. The baseline is already clean.

2. **The gate is real, not a false-green.** Dropped a temp `components/__linttest__.tsx` with
   an unused var and a `let` that should be `const`. `npm run lint` reported:
   - `prefer-const` → **error**
   - `@typescript-eslint/no-unused-vars` (×2) → **warning**
   and exited non-zero. So the config genuinely inspects source and both preset layers are
   active. Temp file removed; tree restored.

## The gap the ticket actually targets

The acceptance criterion says exit 0 with **zero warnings *and* errors**. Two facts collide:

- Bare `eslint` exits non-zero only on **errors**. **Warnings do not fail it** (the probe's
  warning-only lines would have exited 0 had the `prefer-const` error not been present).
- The ticket's intent (Context) is an **enforced** gate that prevents **drift** — and drift
  in ESLint most often arrives as *warnings* (e.g. `no-unused-vars`, exhaustive-deps),
  precisely the class the current script lets through silently.

So on a *clean* checkout the criterion is trivially satisfied today, but the gate is not
"enforced" against the warning drift it is meant to stop. `eslint-config-next` ships several
rules at `warn` severity, so this is a live concern, not hypothetical.

## Constraints & assumptions

- **Config already exists and is idiomatic** (generator flat config). Rewriting rule
  severities or swapping presets would be scope creep and would fight `eslint-config-next`.
- **Clean baseline must stay clean** — any change (e.g. stricter script) must still exit 0 on
  the current tree. Verified `--max-warnings=0` passes today, so tightening is safe now.
- This ticket adds **no application logic** → no unit tests are implied; verification is
  command-level (run lint, observe exit code / output).
- Multiple lisa threads share the branch; this ticket touches `package.json` `scripts.lint`
  (and possibly nothing else). Sibling tickets `T-001-01-01`, `T-001-02-01` are in flight —
  keep the change surface minimal to avoid lock contention.

## Open questions carried into Design

- Should enforcement live in the **script** (`--max-warnings 0`) or in **config** (bump warn
  → error)? Both make warnings fail; they differ in blast radius and idiom.
- Is any change needed at all, or is "verify + document the clean baseline" sufficient given
  the criterion is literally met today?
