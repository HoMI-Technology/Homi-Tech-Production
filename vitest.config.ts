import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, configDefaults } from "vitest/config";

// Vitest only defaults NODE_ENV to "test" when it is unset, so an ambient
// NODE_ENV=production in the operator's shell leaks into the run: React
// resolves its production build (no React.act, so component tests throw) and
// the Plaid webhook skip-verify hatch in app/api/plaid/webhook/route.ts stays
// closed (dispatch tests 401). Setting it here — rather than via a Unix-only
// `NODE_ENV=test` script prefix — keeps the fix cross-platform on Windows.
// This runs when the config module is evaluated, long before any test worker
// is spawned or any test file imports React; forked workers inherit it.
process.env.NODE_ENV = "test";

/**
 * Vitest 4 recovery (PR #98). JSX transforms via @vitejs/plugin-react
 * (esbuild.jsx typing broke under Vitest 4 / Vite 6).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    env: {
      NODE_ENV: "test",
    },
    exclude: [
      ...configDefaults.exclude,
      "**/__tests__/acceptance/**",
      "**/__tests__/architecture.gen.test.ts",
      "e2e/**",
      "**/.claude/**",
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // Plans.md 6.5 — server-only is a Next build poison; tests need a no-op.
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
});
