import { expect, test } from "@playwright/test";
import { expectKillToHome } from "./helpers/kill";

/**
 * PR15: Path / Impact Bus product surfaces are KILL → `/`.
 *
 * CI still greps `@flag-off` as a dedicated first step — keep that tag on a
 * redirect assertion so the job stays green.
 */

test.describe("Impact Bus @flag-off contract", () => {
  test("@flag-off /path is KILL → `/`", async ({ page }) => {
    await expectKillToHome(page, "/path");
    await expect(page.locator("[data-impact-toast]")).toHaveCount(0);
  });
});

test.describe("Impact Bus KILL (flag-on suite still runs this file)", () => {
  test("/dashboard and /path redirect home", async ({ page }) => {
    await expectKillToHome(page, "/dashboard");
    await expectKillToHome(page, "/path");
  });
});
