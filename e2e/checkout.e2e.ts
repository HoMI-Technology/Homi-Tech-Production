import { expect, test } from "@playwright/test";
import { liveStripeEnv, skipWithoutLiveStripe } from "./helpers/env";
import { createTestUser, deleteTestUser, serviceClient } from "./helpers/test-user";
import { signInViaUi } from "./helpers/auth";
import {
  buildCheckoutCompletedEvent,
  signStripePayload,
  stripeApiGet,
  stripeApiPost,
  type StripeCheckoutSession,
} from "./helpers/stripe";

/**
 * Path 3 — checkout (test mode) → tier granted.
 *
 * The pricing render smoke runs anywhere. The live path is the full money
 * loop: our /api/checkout → Stripe-hosted checkout paid with the 4242 test
 * card → success redirect → a faithfully-signed `checkout.session.completed`
 * delivered to our webhook (what Stripe would POST; local `stripe listen`
 * can't reach a CI runner) → the profile's tier flips to "plus".
 *
 * Gated on live Supabase + Stripe TEST keys; skips cleanly otherwise. The
 * dev server under test must also have STRIPE_SECRET_KEY / STRIPE_PRICE_PLUS /
 * STRIPE_WEBHOOK_SECRET / SUPABASE_SERVICE_ROLE_KEY (see e2e/README.md).
 */
test.describe("checkout", () => {
  test("pricing page renders all tiers with checkout CTAs", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Pricing", level: 1 })).toBeVisible();
    for (const cta of ["Start Plus", "Start Pro", "Start Family"]) {
      await expect(page.getByRole("button", { name: cta })).toBeVisible();
    }
  });

  test("test-mode purchase grants the plus tier (live)", async ({ page }) => {
    skipWithoutLiveStripe();
    test.setTimeout(300_000);
    const stripe = liveStripeEnv();
    if (!stripe) return; // narrowed for TS; skipWithoutLiveStripe already handled it

    const user = await createTestUser();
    let subscriptionId: string | null = null;
    try {
      await signInViaUi(page, user.email, user.password);

      await page.goto("/pricing");
      await page.getByRole("button", { name: "Start Plus" }).click();

      // /api/checkout 302s us to the Stripe-hosted page. If billing isn't
      // configured on the dev server, the button degrades to a waitlist note
      // instead — surface that as an actionable error, not a bare timeout.
      try {
        await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
      } catch (err) {
        if (await page.getByText("Billing opens soon").isVisible()) {
          throw new Error(
            "Checkout unavailable: /api/checkout returned configured:false — the dev server needs " +
              "STRIPE_SECRET_KEY + STRIPE_PRICE_PLUS (test mode). See e2e/README.md.",
          );
        }
        throw err;
      }

      // The session id is embedded in the hosted-checkout URL (cs_test_...).
      const sessionId = page.url().match(/cs_test_[A-Za-z0-9]+/)?.[0];
      expect(sessionId, "hosted checkout URL should carry a cs_test_ session id").toBeTruthy();

      // --- Stripe-hosted payment form (external selectors — Stripe owns this
      // page; if they redesign it, this gated smoke is exactly what should
      // report the drift). Card fields are JS-masked, so type, don't fill.
      const emailField = page.locator("#email");
      if (await emailField.isVisible().catch(() => false)) {
        await emailField.fill(user.email);
      }
      await page.locator("#cardNumber").pressSequentially("4242424242424242", { delay: 20 });
      await page.locator("#cardExpiry").pressSequentially("1234", { delay: 20 }); // 12/34
      await page.locator("#cardCvc").pressSequentially("123", { delay: 20 });
      const billingName = page.locator("#billingName");
      if (await billingName.isVisible().catch(() => false)) {
        await billingName.fill("E2E Smoke");
      }
      const postal = page.locator("#billingPostalCode");
      if (await postal.isVisible().catch(() => false)) {
        await postal.fill("12345");
      }
      await page.locator('button[type="submit"]').first().click();

      // Success redirects back to the app: {SITE_URL}/dashboard?upgraded=1.
      await page.waitForURL("**/dashboard**", { timeout: 120_000 });
      expect(page.url()).toContain("upgraded=1");

      // The completed session, read back from Stripe (test mode).
      const session = await stripeApiGet<StripeCheckoutSession>(
        `/checkout/sessions/${sessionId}`,
        stripe.secretKey,
      );
      expect(session.payment_status).toBe("paid");
      expect(session.client_reference_id).toBe(user.id);
      subscriptionId = session.subscription ?? null;

      // Deliver what Stripe would POST to the webhook — same event shape,
      // real session, real signature — straight to the local route handler.
      const rawBody = buildCheckoutCompletedEvent(session);
      const webhookRes = await page.request.post("/api/webhooks/stripe", {
        data: rawBody,
        headers: {
          "content-type": "application/json",
          "stripe-signature": signStripePayload(rawBody, stripe.webhookSecret),
        },
      });
      expect(webhookRes.status(), await webhookRes.text()).toBe(200);

      // The webhook resolves the tier from the session's line items (real
      // Stripe round-trip), so the price must carry lookup_key
      // homi_plus_monthly — that is production configuration this test guards.
      await expect
        .poll(
          async () => {
            const { data } = await serviceClient()
              .from("profiles")
              .select("subscription_tier")
              .eq("id", user.id)
              .single();
            return (data as { subscription_tier?: string } | null)?.subscription_tier ?? null;
          },
          { timeout: 20_000, intervals: [500, 1_000, 2_000, 4_000] },
        )
        .toBe("plus");
    } finally {
      // Best-effort: cancel the test subscription so it can't generate
      // renewal webhooks, then remove the user entirely.
      if (subscriptionId) {
        try {
          await stripeApiPost(`/subscriptions/${subscriptionId}/cancel`, stripe.secretKey);
        } catch {
          // test-mode hygiene only
        }
      }
      await deleteTestUser(user.id);
    }
  });
});
