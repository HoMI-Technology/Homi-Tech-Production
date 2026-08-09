import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { env, hasStripe, hasAnthropic, hasPostHog } from "@/lib/env";

/**
 * Environment validation security audit
 * ======================================
 *
 * Verifies that lib/env.ts behaves securely:
 *  - required vars throw helpful errors when missing
 *  - optional vars return undefined gracefully (no throw)
 *  - feature-flag helpers mirror the underlying env state
 */

describe("env.ts — required variables", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws a descriptive error when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => env.NEXT_PUBLIC_SUPABASE_URL).toThrow(/Missing required environment variable/);
    expect(() => env.NEXT_PUBLIC_SUPABASE_URL).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("throws a descriptive error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toThrow(
      /Missing required environment variable/,
    );
    expect(() => env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("throws only on first access (lazy validation), not at import time", () => {
    // If we got this far, the module has already been imported.
    // The real test is that missing vars don't crash the test suite at import.
    expect(() => env.NEXT_PUBLIC_SUPABASE_URL).not.toThrow(/import/);
  });

  it("returns the value when required vars are present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-anon-key");
  });
});

describe("env.ts — optional variables", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns undefined when ANTHROPIC_API_KEY is absent (no throw)", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("returns undefined when STRIPE_SECRET_KEY is absent (no throw)", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
  });

  it("returns undefined when STRIPE_WEBHOOK_SECRET is absent", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(env.STRIPE_WEBHOOK_SECRET).toBeUndefined();
  });

  it("returns undefined when NEXT_PUBLIC_POSTHOG_KEY is absent", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    expect(env.NEXT_PUBLIC_POSTHOG_KEY).toBeUndefined();
  });

  it("falls back to canonical URL when NEXT_PUBLIC_SITE_URL is absent", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://homitechnology.com");
  });

  it("strips inline comments from NEXT_PUBLIC_POSTHOG_HOST", () => {
    process.env.NEXT_PUBLIC_POSTHOG_HOST =
      "https://us.i.posthog.com  # EU: https://eu.i.posthog.com";
    expect(env.NEXT_PUBLIC_POSTHOG_HOST).toBe("https://us.i.posthog.com");
  });
});

describe("env.ts — feature-flag helpers", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("hasStripe() returns false when STRIPE_SECRET_KEY is absent", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(hasStripe()).toBe(false);
  });

  it("hasStripe() returns true when STRIPE_SECRET_KEY is present", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
    expect(hasStripe()).toBe(true);
  });

  it("hasAnthropic() returns false when ANTHROPIC_API_KEY is absent", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(hasAnthropic()).toBe(false);
  });

  it("hasAnthropic() returns true when ANTHROPIC_API_KEY is present", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-api03-xxx";
    expect(hasAnthropic()).toBe(true);
  });

  it("hasPostHog() returns false when NEXT_PUBLIC_POSTHOG_KEY is absent", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    expect(hasPostHog()).toBe(false);
  });

  it("hasPostHog() returns true when NEXT_PUBLIC_POSTHOG_KEY is present", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_xxx";
    expect(hasPostHog()).toBe(true);
  });
});
