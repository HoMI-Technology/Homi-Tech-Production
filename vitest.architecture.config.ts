import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** Isolated config so architecture:gen can write public/architecture.json. */
export default defineConfig({
  plugins: [react()],
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
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
});
