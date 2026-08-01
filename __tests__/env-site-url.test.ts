import { describe, it, expect, beforeEach, vi } from "vitest";

import { env } from "@/lib/env";

/**
 * NEXT_PUBLIC_SITE_URL is set in Production only. Before the preview fallback,
 * a preview deployment silently used the production origin — so a preview
 * checkout redirected to production on success, and preview-generated share
 * links pointed at rows the production site cannot resolve. Neither fails
 * loudly, which is why this is pinned by tests.
 */
describe("env.NEXT_PUBLIC_SITE_URL", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    // Start from "nothing set" so each case opts into exactly what it needs.
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    vi.stubEnv("VERCEL_URL", "");
  });

  it("prefers an explicit NEXT_PUBLIC_SITE_URL above everything else", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.example.com");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "should-be-ignored.vercel.app");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://staging.example.com");
  });

  it("falls back to the deployment's own host on a preview build", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "homi-platform-abc123.vercel.app");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://homi-platform-abc123.vercel.app");
  });

  it("works client-side, where only the NEXT_PUBLIC_ mirrors are inlined", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "homi-platform-xyz789.vercel.app");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://homi-platform-xyz789.vercel.app");
  });

  it("does not double up the scheme if VERCEL_URL ever carries one", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "https://homi-platform-abc123.vercel.app");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://homi-platform-abc123.vercel.app");
  });

  it("uses production origin on a production build with the var unset", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "homi-platform-prod.vercel.app");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://homitechnology.com");
  });

  it("uses production origin off-platform (local dev, CI) with nothing set", () => {
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://homitechnology.com");
  });
});
