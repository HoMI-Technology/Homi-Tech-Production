import { fileURLToPath } from "node:url";
import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  // Use the automatic JSX runtime (like Next.js) so component tests don't need
  // to import React explicitly.
  esbuild: { jsx: "automatic" },
  test: {
    // Node is the default so the existing pure-logic suites stay fast. Component
    // tests opt into jsdom per-file with a `// @vitest-environment jsdom`
    // docblock at the top of the file.
    environment: "node",
    // jest-dom matchers for component tests (opt into jsdom per-file via a
    // `// @vitest-environment jsdom` docblock).
    setupFiles: ["./vitest.setup.ts"],
    // Acceptance specs are the §9 oracle; intentionally RED until the fixes land,
    // so they run via their own config (npm run test:acceptance), not the default gate.
    exclude: [...configDefaults.exclude, "**/__tests__/acceptance/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
