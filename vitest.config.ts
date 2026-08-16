import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, configDefaults } from "vitest/config";

/**
 * Vitest 4 recovery (PR #98). JSX transforms via @vitejs/plugin-react
 * (esbuild.jsx typing broke under Vitest 4 / Vite 6).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      "**/__tests__/acceptance/**",
      "**/__tests__/architecture.gen.test.ts",
      "e2e/**",
      "**/.claude/**",
      // Nested SPA + node-script planner gates (not Vitest suites)
      "planner-spa/**",
      "incoming/**",
      "scripts/planner/**",
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
