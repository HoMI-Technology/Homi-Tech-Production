import { expect, test } from "@playwright/test";
import { signInViaUi } from "./helpers/auth";
import { expectKillToHome } from "./helpers/kill";

/**
 * PR15: /assessment and /results are KILL → `/`.
 * Live signed-in verdict walks are retired (no product chrome).
 */

const email = process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.E2E_TEST_PASSWORD ?? "";

test.describe("KILL assessment / results", () => {
  test("anonymous GET /assessment lands on `/`", async ({ page }) => {
    await expectKillToHome(page, "/assessment");
  });

  test("guest /results redirects to `/` — never paints a verdict", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "homi:last-assessment",
        JSON.stringify({
          kind: "full",
          completedAt: "2026-08-15T00:00:00.000Z",
          inputs: { debtToIncomeRatio: 0.2 },
          result: {
            score: 88,
            verdict: "READY",
            financial: { total: 30 },
            emotional: { total: 30 },
            timing: { total: 28 },
          },
        }),
      );
    });
    await page.goto("/results");
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.getByText("Decision Readiness Score out of 100")).toHaveCount(0);
  });
});

test.describe("signed-in KILL still lands on `/`", () => {
  test.skip(
    !email || !password,
    "Set E2E_TEST_EMAIL/E2E_TEST_PASSWORD to run the signed-in KILL path.",
  );

  test("sign-in lands on `/`; /assessment and /dashboard stay killed", async ({ page }) => {
    await signInViaUi(page, email, password);
    expect(new URL(page.url()).pathname).toBe("/");
    await expectKillToHome(page, "/assessment");
    await expectKillToHome(page, "/dashboard");
    await expect(page.locator("[data-app-shell='pr10-rail']")).toHaveCount(0);
  });
});
