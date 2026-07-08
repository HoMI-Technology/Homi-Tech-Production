import { fileURLToPath } from "node:url";
import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Acceptance specs are the Phase-3 oracle; they are intentionally RED
    // until the corresponding fixes land, so they run via their own config
    // (npm run test:acceptance), not the default gate.
    exclude: [...configDefaults.exclude, "**/__tests__/acceptance/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
