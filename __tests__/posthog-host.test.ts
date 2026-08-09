import { describe, expect, it } from "vitest";
import { sanitizePosthogHost } from "@/lib/analytics/posthog-host";

describe("sanitizePosthogHost", () => {
  it("defaults when unset or blank", () => {
    expect(sanitizePosthogHost(undefined)).toBe("https://us.i.posthog.com");
    expect(sanitizePosthogHost("")).toBe("https://us.i.posthog.com");
    expect(sanitizePosthogHost("   ")).toBe("https://us.i.posthog.com");
  });

  it("strips inline comments pasted from .env.example notes", () => {
    expect(sanitizePosthogHost("https://us.i.posthog.com   # Or https://eu.i.posthog.com")).toBe(
      "https://us.i.posthog.com",
    );
  });

  it("trims trailing slashes", () => {
    expect(sanitizePosthogHost("https://eu.i.posthog.com/")).toBe("https://eu.i.posthog.com");
  });

  it("returns fallback when the value is only a comment", () => {
    expect(sanitizePosthogHost("# comment only")).toBe("https://us.i.posthog.com");
  });
});
