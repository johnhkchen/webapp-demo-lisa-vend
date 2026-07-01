# Structure — T-001-02-02: establish-app-components-lib-layout

The blueprint: which files change, the exact shape of each change, invariants preserved, and
ordering. No code beyond the config fragment already fixed in Design (Option B). Surgical: one
source-config file touched.

## Change set overview

| File | Action | Nature of change |
|---|---|---|
| `eslint.config.mjs` | modify | Append one `files: ["lib/**/*.{ts,tsx}"]`-scoped config object enforcing `no-restricted-imports` (forbid `react`/`react-dom`/`next` + subpaths). Makes `lib/` purity a build-time invariant. |
| `docs/active/work/T-001-02-02/*` | add | RDSPI artifacts (this set). |

No source files created, none deleted. **No new dependencies** (`no-restricted-imports` is a
core ESLint rule). No change to `package.json` / lockfile, `tsconfig.json`, `next.config.ts`,
`postcss.config.mjs`, or any file under `app/`, `components/`, `lib/`.

## File-level detail

### `eslint.config.mjs` (modify)

Current shape (preserve entirely):

```
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([ ".next/**", "out/**", "build/**", "next-env.d.ts" ]),
]);

export default eslintConfig;
```

Change: insert one new config object into the `defineConfig([...])` array, **after** the
`...nextTs` spread and after `globalIgnores(...)` (order among non-ignore objects only affects
layering; placing it last keeps it clearly an additive override). The object:

```
{
  files: ["lib/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["react", "react-dom", "next",
                "react/*", "react-dom/*", "next/*", "@next/*"],
        message:
          "lib/ must stay pure and framework-free (see CLAUDE.md). " +
          "Keep React/Next imports in components/ and app/.",
      }],
    }],
  },
}
```

- **Scope:** `files: ["lib/**/*.{ts,tsx}"]` binds the rule to the `lib/` track only. Flat
  config applies a config object's `rules` only to files matching its `files` glob, so
  `app/**` and `components/**` are untouched and may keep importing React/Next freely.
- **Rule choice:** `no-restricted-imports`, core ESLint (no plugin). `patterns.group` matches
  bare specifiers *and* subpaths in one entry; default `allowTypeImports: false` also forbids
  `import type` from those modules — a pure module references no framework types.
- **Severity `error`:** with the `--max-warnings 0` script a warning would fail too, but
  `error` states intent unambiguously and is robust to any future script change.
- **Comment/doc:** the rule's `message` *is* the inline documentation of the contract; it
  fires at the exact violation site with a CLAUDE.md pointer. No separate README added (avoids
  an unchecked doc that can drift; the message lives where it is enforced).

## Interfaces / contracts preserved

- **Public route output:** `/` renders unchanged (no `app/`/`components/` source touched).
- **`@/*` alias & import graph:** unchanged. app → components → lib stays the dependency
  direction; the rule only forbids the *reverse-of-purity* edge (framework → lib).
- **Build & lint scripts:** unchanged. `npm run build` and `eslint --max-warnings 0` must
  stay green on the current tree (verified: `lib/constants.ts` imports nothing).
- **No collision surface with T-001-02-01:** that ticket edits only `app/globals.css` +
  `app/layout.tsx`; this edits only `eslint.config.mjs`. Disjoint file sets → no missing DAG
  edge, no lock contention.
- **No collision with committed T-001-01-02:** it deliberately left `eslint.config.mjs`
  untouched and put enforcement in the *script*; this ticket adds a *scoped rule* in the
  config — complementary, not conflicting. The global rule severities from the next presets
  are unchanged.

## Ordering of changes

1. Edit `eslint.config.mjs` — append the scoped config object.
2. Verify the clean tree stays green: `npm run lint`, then `npm run build`.
3. Exercise the rule both ways (Plan step): temp `import { useState } from "react"` in a
   throwaway `lib/**` file → expect lint **fail**; remove it → expect green; confirm
   `git status` clean of the temp file.
4. Commit `eslint.config.mjs` + this ticket's artifacts only. Do not stage sibling files or
   ticket-frontmatter changes.

## Out of structure (explicitly not touched)

- `lib/constants.ts` — already the satisfying pure module; no new placeholder needed.
- `components/Board.tsx`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css` — untouched
  (last two are T-001-02-01's surface).
- `package.json` / lockfile — no dependency, no script change.
- No barrel `index.ts` (rejected Option C), no back-edge/layer rules (deferred Option D), no
  CI wiring, no test runner.

## Risk surface

- **Very low.** One additive, scoped config object; zero deps; fully reversible by deleting
  the object. Failure modes and their catches:
  - *Rule false-positives on current tree* → caught by step 2 (`lib/constants.ts` imports
    nothing, so it cannot). 
  - *Glob mis-scoped and rule leaks to `app/`/`components/`* → caught by step 2 (those files
    import React/Next; a leak would fail lint immediately).
  - *Rule silently does nothing* (wrong pattern shape) → caught by step 3's positive test
    (the temp React import must actually fail lint).
