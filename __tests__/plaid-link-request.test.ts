import { describe, it, expect } from "vitest";
import { optionalPlaidRedirectUri, plaidWebhookUrl } from "@/lib/plaid/link-request";

describe("plaidWebhookUrl", () => {
  it("appends /api/plaid/webhook to the site origin", () => {
    expect(plaidWebhookUrl("https://homitechnology.com")).toBe(
      "https://homitechnology.com/api/plaid/webhook",
    );
  });

  it("strips a trailing slash on the origin so the path is not doubled", () => {
    expect(plaidWebhookUrl("https://homitechnology.com/")).toBe(
      "https://homitechnology.com/api/plaid/webhook",
    );
  });
});

describe("optionalPlaidRedirectUri", () => {
  it("returns undefined when unset so /link/token/create is not sent an unregistered URI", () => {
    expect(optionalPlaidRedirectUri(undefined)).toBeUndefined();
    expect(optionalPlaidRedirectUri("")).toBeUndefined();
    expect(optionalPlaidRedirectUri("   ")).toBeUndefined();
  });

  it("accepts an https URI that is already on the Plaid dashboard allowlist", () => {
    expect(optionalPlaidRedirectUri("https://homitechnology.com/connections/oauth")).toBe(
      "https://homitechnology.com/connections/oauth",
    );
  });

  it("accepts http://localhost for Sandbox-only local OAuth", () => {
    expect(optionalPlaidRedirectUri("http://localhost:3000/connections/oauth")).toBe(
      "http://localhost:3000/connections/oauth",
    );
  });

  it("rejects http non-localhost and unparseable values so a bad env cannot break Link", () => {
    expect(optionalPlaidRedirectUri("http://homitechnology.com/oauth")).toBeUndefined();
    expect(optionalPlaidRedirectUri("not-a-url")).toBeUndefined();
  });
});
