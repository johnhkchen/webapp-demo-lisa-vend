import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest config — added when component tests arrived (T-003-01-01).
 *
 * Sole purpose: resolve the `@/*` path alias from `tsconfig.json` so component code (and its
 * tests) can `import "@/components/..."` / `"@/lib/..."` under vitest, matching how Next resolves
 * it. The pure `lib/*.test.ts` suite uses relative imports and never needed this.
 *
 * The test environment stays vitest's default (**node**) so the lib suite runs fast; component
 * tests opt into jsdom per-file via a `// @vitest-environment jsdom` docblock. No global jsdom.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
