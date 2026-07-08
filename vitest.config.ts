import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Use the automatic JSX runtime (like Next.js) so component tests don't need
  // to import React explicitly.
  esbuild: { jsx: "automatic" },
  test: {
    // Node is the default so the existing pure-logic suites stay fast. Component
    // tests opt into jsdom per-file with a `// @vitest-environment jsdom`
    // docblock at the top of the file.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
