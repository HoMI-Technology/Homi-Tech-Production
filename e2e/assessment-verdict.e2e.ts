import { expect, test } from "@playwright/test";
import { signInViaUi } from "./helpers/auth";
import { completeFullAssessment, VERDICT_BADGE } from "./helpers/assessment";

/**
 * Account before assessment. Guest /assessment is First Moment — never the
 * 45-q, never /results. The signed-in verdict walk runs only when
 * E2E_TEST_EMAIL / E2E_TEST_PASSWORD are set.
 */

const email = process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.E2E_TEST_PASSWORD ?? "";

test.describe("guest /assessment is First Moment", () => {
  test("anonymous GET /assessment lands on /first-moment — never /results", async ({ page }) => {
    await page.goto("/assessment");
    await expect(page).toHaveURL(/\/first-moment/);
    await expect(page).not.toHaveURL(/\/results/);
    await expect(
      page.getByRole("heading", { name: /Most apps want you to buy/i }),
    ).toBeVisible();
    await expect(page.getByText(/^Step \d+ of \d+$/)).toHaveCount(0);
    await expect(page.getByText("See my Decision Readiness Score")).toHaveCount(0);
    await expect(page.getByText("Decision Readiness Score out of 100")).toHaveCount(0);
  });

  test("guest /results redirects to First Moment — never paints a verdict", async ({ page }) => {
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
    await expect(page).toHaveURL(/\/first-moment/, { timeout: 15_000 });
    await expect(page.getByText("Decision Readiness Score out of 100")).toHaveCount(0);
    await expect(page.getByText("See my Decision Readiness Score")).toHaveCount(0);
  });
});

test.describe("signed-in assessment → verdict", () => {
  test.skip(
    !email || !password,
    "Set E2E_TEST_EMAIL/E2E_TEST_PASSWORD to run the signed-in verdict path.",
  );

  test("completing the full assessment lands on Home Build with a canon verdict", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await signInViaUi(page, email, password);
    await completeFullAssessment(page, { decisionType: "home_buying" });

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByLabel(/Overall Decision Readiness Score/i)).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator('[class*="bg-verdict-"]').or(page.getByText(VERDICT_BADGE)).first(),
    ).toBeVisible({ timeout: 30_000 });

    const verdict = await page.evaluate(() => {
      const raw = window.localStorage.getItem("homi:last-assessment");
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { result?: { verdict?: string } };
        return parsed.result?.verdict ?? null;
      } catch {
        return null;
      }
    });
    expect(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]).toContain(verdict);
  });
});
