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
// Cast because Next declares NODE_ENV as a readonly literal union.
(process.env as { NODE_ENV?: string }).NODE_ENV = "test";

const alias = {
  "@": fileURLToPath(new URL(".", import.meta.url)),
  // Plans.md 6.5 — server-only is a Next build poison; tests need a no-op.
  "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
};

const sharedTest = {
  setupFiles: ["./vitest.setup.ts"] as string[],
  env: { NODE_ENV: "test" as const },
};

const unitExclude = [
  ...configDefaults.exclude,
  "**/__tests__/acceptance/**",
  "**/__tests__/architecture.gen.test.ts",
  "e2e/**",
  "**/.claude/**",
  "**/__tests__/policy/**",
  "**/__tests__/contract/**",
  "**/__tests__/behavior/**",
  "**/__tests__/boundary/**",
  "**/__tests__/support/**",
];

/**
 * Five-tier topology (test-rebuild mission §5).
 * `unit` is the inert home of the existing suite (legacy + rebuilt-in-place).
 * `policy` is the T3 AST harness. contract / behavior / boundary includes are
 * empty migration slots so root-level guards can move later without a
 * second config rewrite.
 *
 * Coverage is off unless `vitest run --coverage` / `npm run test:coverage`.
 * Thresholds are the measured 2026-08-30 baseline — ratchet up, never down.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    environment: "node",
    ...sharedTest,
    exclude: unitExclude,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        ...configDefaults.exclude,
        "**/__tests__/**",
        "e2e/**",
        "scripts/**",
        "**/*.d.ts",
      ],
      // Thresholds filled after the first measured baseline (ratchet only).
    },
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          ...sharedTest,
          exclude: unitExclude,
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "policy",
          environment: "node",
          ...sharedTest,
          include: ["__tests__/policy/**/*.test.ts"],
          testTimeout: 15_000,
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "contract",
          environment: "node",
          ...sharedTest,
          include: ["__tests__/contract/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "behavior",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts", "./__tests__/support/behavior-setup.ts"],
          env: { NODE_ENV: "test" },
          include: ["__tests__/behavior/**/*.{test.ts,test.tsx}"],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "boundary",
          environment: "node",
          ...sharedTest,
          include: ["__tests__/boundary/**/*.test.ts"],
        },
      },
    ],
  },
});
