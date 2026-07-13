import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  unsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrl,
  listUnsubscribeHeaders,
} from "@/lib/email/unsubscribe";

describe("email unsubscribe tokens", () => {
  beforeEach(() => {
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://homitechnology.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips a valid token", () => {
    const token = unsubscribeToken("Person@Example.com");
    expect(verifyUnsubscribeToken("Person@Example.com", token)).toBe(true);
  });

  it("is case- and whitespace-insensitive on the email", () => {
    const token = unsubscribeToken("person@example.com");
    expect(verifyUnsubscribeToken("  PERSON@EXAMPLE.COM ", token)).toBe(true);
  });

  it("rejects a token for a different email", () => {
    const token = unsubscribeToken("a@example.com");
    expect(verifyUnsubscribeToken("b@example.com", token)).toBe(false);
  });

  it("rejects a tampered token", () => {
    const token = unsubscribeToken("a@example.com");
    expect(verifyUnsubscribeToken("a@example.com", token + "x")).toBe(false);
  });

  it("fails closed when no secret is configured", () => {
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "");
    vi.stubEnv("INTERNAL_API_SECRET", "");
    expect(verifyUnsubscribeToken("a@example.com", "anything")).toBe(false);
  });

  it("builds a one-click URL and RFC 8058 headers", () => {
    const url = unsubscribeUrl("a@example.com");
    expect(url).toContain("https://homitechnology.com/api/unsubscribe?e=a%40example.com&t=");
    const headers = listUnsubscribeHeaders("a@example.com");
    expect(headers["List-Unsubscribe"]).toBe(`<${url}>`);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});
