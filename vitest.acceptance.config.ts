import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// Runs ONLY the independent acceptance suite (BUILD-BRIEF §9).
// These are implementation-agnostic behavioural oracles. An agent must make
// them pass WITHOUT editing them. They are red against the current codebase
// by design — that is the proof they test real behaviour, not a tautology.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/acceptance/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
