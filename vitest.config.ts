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
    // next-intl's ESM build imports "next/server" (extensionless); inline it so
    // Vitest resolves it through its own resolver (middleware.test.ts).
    server: { deps: { inline: ["next-intl"] } },
    // Acceptance specs are the §9 oracle; intentionally RED until the fixes land,
    // so they run via their own config (npm run test:acceptance), not the default gate.
    // Playwright E2E specs live in e2e/ and run via `npm run e2e` (their own
    // runner) — keep Vitest from picking them up by its default *.spec.ts glob.
    exclude: [
      ...configDefaults.exclude,
      "**/__tests__/acceptance/**",
      "**/__tests__/architecture.gen.test.ts",
      "e2e/**",
      // Nested agent worktrees must not pollute the root suite.
      "**/.claude/**",
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
