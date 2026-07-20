import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E — smoke coverage for the funnel-critical journeys (AUDIT
 * T3.5). Public/anonymous paths run everywhere; auth journeys are scaffolded
 * but skip themselves without E2E_TEST_EMAIL/PASSWORD so CI stays green until
 * a seeded test account is provisioned.
 *
 * Browser: this environment ships Chromium at /opt/pw-browsers (see
 * PLAYWRIGHT_BROWSERS_PATH); we pass executablePath so a version skew between
 * @playwright/test and the preinstalled build can't trigger a download.
 */

const PREINSTALLED_CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const PORT = Number(process.env.E2E_PORT || 3000);
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    launchOptions: { executablePath: PREINSTALLED_CHROMIUM },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: PREINSTALLED_CHROMIUM } } },
  ],
  // Only manage the server when pointing at localhost; when E2E_BASE_URL is a
  // deployed preview, reuse it as-is.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run start -- -p ${PORT}`,
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
