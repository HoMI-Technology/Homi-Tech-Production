import { expect, test } from "@playwright/test";

/**
 * Account before assessment. Guest /assessment is First Moment — not the 45-q
 * and not /results. The signed-in walk stays in share.e2e.ts (live Supabase).
 */
test.describe("guest /assessment is First Moment", () => {
  test("anonymous GET /assessment redirects to /first-moment and does not start the 45-q", async ({
    page,
  }) => {
    await page.goto("/assessment");
    await expect(page).toHaveURL(/\/first-moment/);
    await expect(
      page.getByRole("heading", { name: /Most apps want you to buy/i }),
    ).toBeVisible();
    await expect(page.getByText(/^Step \d+ of \d+$/)).toHaveCount(0);
  });
});
