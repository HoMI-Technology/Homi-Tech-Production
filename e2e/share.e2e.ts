import { expect, test } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers/env";
import { expectKillToHome } from "./helpers/kill";

/**
 * PR15: public share URLs are KILL → `/`. Live create/revoke is retired.
 */

test.describe("score share links", () => {
  test("an unknown share token redirects to `/`", async ({ page }) => {
    await expectKillToHome(page, "/share/e2e-token-that-does-not-exist");
  });

  test("live share round trip is retired (KILL /api/shares)", async ({ page }) => {
    skipWithoutLiveSupabase();
    const res = await page.request.post("/api/shares", { data: {} });
    expect(res.status()).toBe(404);
    await expectKillToHome(page, "/share/whatever");
  });
});
