import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // vinext (Vite) build output — the App Router migration's analog of `.next/`.
    // `vinext build` emits bundled/minified code to `dist/`; it is generated, never
    // authored, so it must not be linted (T-006-02-02).
    "dist/**",
  ]),
  // Enforce the app/components/lib track boundary: lib/ holds pure, framework-free
  // game logic (see CLAUDE.md). Forbid React/Next imports there so rendering and
  // logic stay on separable tracks that lisa can build in parallel without collisions.
  {
    files: ["lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-dom",
                "next",
                "react/*",
                "react-dom/*",
                "next/*",
                "@next/*",
              ],
              message:
                "lib/ must stay pure and framework-free (see CLAUDE.md). " +
                "Keep React/Next imports in components/ and app/.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
