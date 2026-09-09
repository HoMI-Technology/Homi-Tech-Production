import { expect, test } from "@playwright/test";
import { expectKillToHome } from "./helpers/kill";

/**
 * PR15: Path stack, tools, and status are KILL → `/`.
 */

test.describe("KILL path stack (public)", () => {
  test("status, preflight, and path redirect to `/`", async ({ page }) => {
    await expectKillToHome(page, "/status");
    await expectKillToHome(page, "/tools/preflight");
    await expectKillToHome(page, "/path");
  });
});
