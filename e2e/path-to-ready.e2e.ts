import { expect, test } from "@playwright/test";
import { signInViaUi } from "./helpers/auth";
import { expectKillToHome } from "./helpers/kill";

const email = process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.E2E_TEST_PASSWORD ?? "";

/**
 * PR15: /path is KILL → `/` even with seeded Path state.
 */

test.describe("Path to Ready is KILL", () => {
  test("path page redirects to `/`", async ({ page }) => {
    await expectKillToHome(page, "/path");
  });

  test("signed-in /path and /dashboard still redirect to `/`", async ({ page }) => {
    test.skip(
      !email || !password,
      "Set E2E_TEST_EMAIL/E2E_TEST_PASSWORD to run signed-in KILL Path.",
    );
    await signInViaUi(page, email, password);
    await expectKillToHome(page, "/path");
    await expectKillToHome(page, "/dashboard");
  });
});
