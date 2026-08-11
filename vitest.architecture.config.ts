import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// See vitest.config.ts — ambient NODE_ENV=production breaks React/test hatches.
(process.env as { NODE_ENV?: string }).NODE_ENV = "test";

/** Isolated config so architecture:gen can write public/architecture.json. */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["__tests__/architecture.gen.test.ts"],
    env: {
      NODE_ENV: "test",
      ARCHITECTURE_WRITE: "1",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
});
