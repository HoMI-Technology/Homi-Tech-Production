import { test, expect } from "@playwright/test";
import { expectKillToHome } from "./helpers/kill";

test.describe("Money Reality — KILL", () => {
  test("tools hub, calculators, finance, and money fold to `/`", async ({ page }) => {
    await expectKillToHome(page, "/tools");
    await expectKillToHome(page, "/tools/runway");
    await expectKillToHome(page, "/tools/net-worth");
    await expectKillToHome(page, "/finance");
    await expectKillToHome(page, "/money");
    await expectKillToHome(page, "/money/budget");
  });
});
