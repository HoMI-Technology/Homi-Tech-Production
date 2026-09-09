import { expect, test } from "@playwright/test";
import { skipWithoutLiveStripe } from "./helpers/env";
import { expectKillToHome } from "./helpers/kill";

/**
 * PR15: /pricing and checkout APIs are KILL.
 */

test.describe("checkout", () => {
  test("pricing page redirects to `/`", async ({ page }) => {
    await expectKillToHome(page, "/pricing");
  });

  test("checkout API is dark (live env)", async ({ request }) => {
    skipWithoutLiveStripe();
    const res = await request.post("/api/checkout", { data: {} });
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});
