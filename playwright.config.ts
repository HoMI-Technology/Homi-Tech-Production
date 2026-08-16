import { defineConfig, devices } from "@playwright/test";
import { resolveBrowserUse } from "./e2e/helpers/browser";

/**
 * HōMI Playwright E2E smoke suite (AUDIT T3.5).
 *
 * Two tiers of specs live under e2e/:
 *   - local/anonymous specs that only need the Next.js dev server (they always
 *     run, including on forks and in CI without secrets);
 *   - live specs that need a real Supabase test project and/or Stripe test-mode
 *     keys. Those self-skip with a clear message when their env is absent, so
 *     CI never goes red on missing secrets. See e2e/README.md for the env map.
 *
 * Specs use the `*.e2e.ts` suffix on purpose: vitest's default include glob
 * (`*.{test,spec}.*`) never matches it, so the unit-test gate never picks
 * these specs up, and this suite never runs inside vitest.
 *
 * Browser: on local Windows, prefer system Chrome/Edge. Corporate Application
 * Control blocks Playwright's bundled chrome-headless-shell (spawn UNKNOWN).
 * CI keeps the bundled Chromium. Override with PLAYWRIGHT_CHANNEL,
 * PLAYWRIGHT_CHROME_PATH, or PLAYWRIGHT_USE_BUNDLED=1.
 */

// Load .env.local when present (Node >= 20.6 built-in — no dotenv dependency).
// In CI the workflow injects real env vars; loadEnvFile never overrides those.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local in this environment (e.g. CI) — env comes from the workflow.
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const browserUse = resolveBrowserUse();

export default defineConfig({
  testDir: "./e2e",
  // Only *.e2e.ts files are Playwright specs. Helpers and *.setup.ts are not.
  testMatch: "**/*.e2e.ts",
  // The full assessment walk is ~49 steps on a dev server that compiles routes
  // on first hit — give the suite room.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry in CI absorbs dev-server compile flakes; locally a failure is real.
  retries: process.env.CI ? 1 : 0,
  // Two workers in CI keep auth/Stripe rate limits and runner CPU comfortable.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never" }],
        ["json", { outputFile: "playwright-results.json" }],
      ]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "en-US",
    extraHTTPHeaders: {
      "Accept-Language": "en-US",
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Dev mode compiles on demand — first navigation to a route can be slow.
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    ...browserUse,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...browserUse,
      },
    },
  ],
  // Skip bootstrapping a local server when the suite targets a remote host
  // (production / Preview smoke via E2E_BASE_URL).
  webServer: /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(baseURL)
    ? {
        command: "npm run dev",
        url: baseURL,
        // Local runs reuse a dev server you already started; CI always boots fresh.
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          // Share links and the Stripe success redirect are built from SITE_URL —
          // pin it to the local server so the smoke suite never wanders to prod.
          NEXT_PUBLIC_SITE_URL: baseURL,
          NEXT_TELEMETRY_DISABLED: "1",
          // Forward the flag explicitly (defaulting off) so the Next.js child
          // process and the spec runner always agree on the Impact Bus state,
          // regardless of how the suite was launched.
          NEXT_PUBLIC_FF_IMPACT_BUS: process.env.NEXT_PUBLIC_FF_IMPACT_BUS ?? "false",
        },
      }
    : undefined,
});
