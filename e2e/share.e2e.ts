import { expect, test, type Page } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers/env";
import { createTestUser, deleteTestUser, serviceClient } from "./helpers/test-user";
import { signInViaUi } from "./helpers/auth";
import { completeFullAssessment, VERDICT_BADGE } from "./helpers/assessment";

/**
 * Path 4 — share create → open → revoke.
 *
 * The 404 smoke runs anywhere (a bogus token hits get_shared_assessment,
 * returns nothing, and the page 404s). The live path drives the real loop:
 * signed-in assessment → POST /api/shares → public /share/[token] renders →
 * revoke in settings → the public link dies. Skips unless a live Supabase
 * test project with a service-role key is configured (e2e/README.md).
 */

/** Reads the server assessment id the app attaches after the background save. */
async function readServerAssessmentId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("homi:last-assessment");
    if (!raw) return null;
    try {
      return (JSON.parse(raw) as { serverId?: string }).serverId ?? null;
    } catch {
      return null;
    }
  });
}

test.describe("score share links", () => {
  test("an unknown share token renders the not-found page", async ({ page }) => {
    const res = await page.goto("/share/e2e-token-that-does-not-exist");
    // Dev-mode streaming has already sent a 200 by the time notFound() fires;
    // a production build serves a true 404. The stable contract across both is
    // the not-found page itself.
    expect([200, 404]).toContain(res?.status());
    await expect(page.getByRole("heading", { name: "Off the compass." })).toBeVisible();
  });

  test("create → open → revoke round trip (live)", async ({ page, browser }) => {
    skipWithoutLiveSupabase();
    test.setTimeout(300_000);

    const user = await createTestUser();
    try {
      await signInViaUi(page, user.email, user.password);

      // A real completed assessment, saved server-side for this user.
      await completeFullAssessment(page);

      // The app attaches the server id to the local result once the
      // background POST /api/assessments resolves — poll for it, then fall
      // back to the service-role read if the race is slow.
      let assessmentId: string | null = null;
      try {
        await expect
          .poll(async () => readServerAssessmentId(page), { timeout: 15_000, intervals: [500, 1_000, 2_000] })
          .not.toBeNull();
        assessmentId = await readServerAssessmentId(page);
      } catch {
        const { data } = await serviceClient()
          .from("assessments")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        assessmentId = (data as { id?: string } | null)?.id ?? null;
      }
      expect(assessmentId, "assessment should be saved server-side").toBeTruthy();

      // CREATE — same call ShareScoreButton makes (page.request carries the
      // context's session cookies).
      const createRes = await page.request.post("/api/shares", { data: { assessmentId } });
      expect(createRes.status(), await createRes.text()).toBe(200);
      const { url } = (await createRes.json()) as { url?: string };
      const token = url?.split("/share/").pop();
      expect(token, "share response should return a /share/<token> URL").toBeTruthy();

      // OPEN — anonymous visitor sees the read-only score page.
      const anon = await browser.newContext({ storageState: "e2e/.locale-en.json" });
      let anonPage: Page | null = null;
      try {
        anonPage = await anon.newPage();
        const openRes = await anonPage.goto(`/share/${token}`);
        expect(openRes?.status()).toBe(200);
        await expect(anonPage.getByText(/shared their HōMI readiness/)).toBeVisible();
        await expect(anonPage.getByText(VERDICT_BADGE).first()).toBeVisible();
      } finally {
        await anon.close();
      }

      // REVOKE — through the settings UI, the way a user would.
      await page.goto("/settings");
      await expect(page.getByRole("heading", { name: "Share links" })).toBeVisible();
      await expect(page.getByText(token!)).toBeVisible();
      await page.getByRole("button", { name: "Revoke" }).first().click();
      await expect(page.getByText(token!)).toHaveCount(0);

      // The public link is now dead — soft-revoked, not just hidden.
      const dead = await browser.newContext({ storageState: "e2e/.locale-en.json" });
      try {
        const deadPage = await dead.newPage();
        const deadRes = await deadPage.goto(`/share/${token}`);
        // See note above: 200 in dev streaming, 404 in prod — content is the contract.
        expect([200, 404]).toContain(deadRes?.status());
        await expect(deadPage.getByRole("heading", { name: "Off the compass." })).toBeVisible();
      } finally {
        await dead.close();
      }
    } finally {
      await deleteTestUser(user.id);
    }
  });
});
