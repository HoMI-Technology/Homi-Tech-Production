import { test } from "@playwright/test";
import { expectKillToHome } from "./helpers/kill";

/**
 * PR15: Decision Lab / tools / scenarios are KILL → `/`.
 */

test.describe("Decision Lab is KILL", () => {
  test("/tools and /scenarios redirect to `/`", async ({ page }) => {
    await expectKillToHome(page, "/tools");
    await expectKillToHome(page, "/tools/affordability");
    await expectKillToHome(page, "/scenarios");
  });
});
