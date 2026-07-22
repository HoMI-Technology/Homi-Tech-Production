import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Isolated config so architecture:gen can write public/architecture.json. */
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["__tests__/architecture.gen.test.ts"],
    env: {
      ARCHITECTURE_WRITE: "1",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
