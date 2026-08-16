import { describe, expect, it } from "vitest";
import {
  coverageFromEnv,
  summarizePlaywrightJson,
} from "../../scripts/ci-coverage-report.mjs";

describe("coverageFromEnv", () => {
  it("is CORE when no live integration secrets exist", () => {
    const cov = coverageFromEnv({});
    expect(cov.mode).toBe("CORE");
    expect(cov.supabaseIntegration).toBe("NOT_CONFIGURED");
    expect(cov.stripeIntegration).toBe("NOT_CONFIGURED");
    expect(cov.authenticatedLighthouse).toBe("NOT_CONFIGURED");
  });

  it("is CORE when only Supabase live env is set", () => {
    const cov = coverageFromEnv({
      E2E_SUPABASE_URL: "https://example.supabase.co",
      E2E_SUPABASE_SERVICE_ROLE_KEY: "service-role",
    });
    expect(cov.mode).toBe("CORE");
    expect(cov.supabaseIntegration).toBe("CONFIGURED");
    expect(cov.stripeIntegration).toBe("NOT_CONFIGURED");
  });

  it("is FULL only when Supabase + Stripe TEST keys are both set", () => {
    const cov = coverageFromEnv({
      E2E_SUPABASE_URL: "https://example.supabase.co",
      E2E_SUPABASE_SERVICE_ROLE_KEY: "service-role",
      E2E_STRIPE_SECRET_KEY: "sk_test_abc",
      E2E_STRIPE_WEBHOOK_SECRET: "whsec_abc",
    });
    expect(cov.mode).toBe("FULL");
    expect(cov.stripeIntegration).toBe("CONFIGURED");
  });

  it("blocks live Stripe keys instead of treating them as configured", () => {
    const cov = coverageFromEnv({
      E2E_SUPABASE_URL: "https://example.supabase.co",
      E2E_SUPABASE_SERVICE_ROLE_KEY: "service-role",
      E2E_STRIPE_SECRET_KEY: "sk_live_abc",
      E2E_STRIPE_WEBHOOK_SECRET: "whsec_abc",
    });
    expect(cov.mode).toBe("CORE");
    expect(cov.stripeIntegration).toBe("BLOCKED");
    expect(cov.notes.length).toBeGreaterThan(0);
  });

  it("marks authenticated Lighthouse configured only with both LHCI secrets", () => {
    expect(
      coverageFromEnv({ LHCI_TEST_EMAIL: "a@b.c" }).authenticatedLighthouse,
    ).toBe("NOT_CONFIGURED");
    expect(
      coverageFromEnv({
        LHCI_TEST_EMAIL: "a@b.c",
        LHCI_TEST_PASSWORD: "x",
      }).authenticatedLighthouse,
    ).toBe("CONFIGURED");
  });
});

describe("summarizePlaywrightJson", () => {
  it("reports missing file as not present", () => {
    expect(summarizePlaywrightJson(null).present).toBe(false);
  });

  it("reads Playwright stats without treating skipped as unexpected", () => {
    const s = summarizePlaywrightJson({
      stats: { expected: 10, skipped: 4, unexpected: 0 },
    });
    expect(s.present).toBe(true);
    expect(s.skipped).toBe(4);
    expect(s.unexpected).toBe(0);
  });
});
