import { describe, it, expect, beforeEach } from "vitest";
import {
  hashPartnerKey,
  scoreBand,
  pillarBand,
  signReceipt,
  verifyReceiptSignature,
  PARTNER_KEY_PREFIX,
  type ReceiptClaims,
} from "@/lib/receipts";

const CLAIMS: ReceiptClaims = {
  sub: "abcd1234abcd1234",
  verdict: "READY",
  scoreBand: "high",
  pillars: { financial: "strong", emotional: "developing", timing: "building" },
  issuedAt: "2026-07-01T00:00:00.000Z",
  expiresAt: "2026-07-31T00:00:00.000Z",
  revoked: false,
};

describe("partner key hashing", () => {
  it("is stable and prefixed", () => {
    expect(PARTNER_KEY_PREFIX).toBe("homi_live_");
    const h1 = hashPartnerKey("homi_live_deadbeef");
    const h2 = hashPartnerKey("homi_live_deadbeef");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not collide across distinct keys", () => {
    expect(hashPartnerKey("homi_live_a")).not.toBe(hashPartnerKey("homi_live_b"));
  });
});

describe("bands are coarse and monotonic", () => {
  it("maps scores to the four canonical bands at the verdict thresholds", () => {
    expect(scoreBand(80)).toBe("high");
    expect(scoreBand(79)).toBe("moderate");
    expect(scoreBand(65)).toBe("moderate");
    expect(scoreBand(50)).toBe("emerging");
    expect(scoreBand(49)).toBe("early");
  });

  it("buckets pillar percentages into three bands", () => {
    expect(pillarBand(90)).toBe("strong");
    expect(pillarBand(60)).toBe("developing");
    expect(pillarBand(20)).toBe("building");
  });
});

describe("receipt signing", () => {
  beforeEach(() => {
    process.env.RECEIPT_SIGNING_SECRET = "test-signing-secret";
  });

  it("signs and verifies a receipt round-trip", () => {
    const signed = signReceipt(CLAIMS);
    expect(signed.signature?.alg).toBe("HS256");
    expect(signed.signature?.kid).toBe("homi-receipt-v1");
    expect(verifyReceiptSignature(signed)).toBe(true);
  });

  it("rejects a tampered claim (verdict upgraded in a screenshot)", () => {
    const signed = signReceipt(CLAIMS);
    const tampered = {
      ...signed,
      claims: { ...signed.claims, verdict: "READY" as const, scoreBand: "high" as const },
    };
    // Same claims still verify...
    expect(verifyReceiptSignature(tampered)).toBe(true);
    // ...but flipping a signed field breaks the signature.
    const forged = { ...signed, claims: { ...signed.claims, scoreBand: "early" as const } };
    expect(verifyReceiptSignature(forged)).toBe(false);
  });

  it("is canonical: field order in the object never changes the signature", () => {
    const reordered: ReceiptClaims = {
      revoked: false,
      expiresAt: "2026-07-31T00:00:00.000Z",
      issuedAt: "2026-07-01T00:00:00.000Z",
      pillars: { timing: "building", emotional: "developing", financial: "strong" },
      scoreBand: "high",
      verdict: "READY",
      sub: "abcd1234abcd1234",
    };
    expect(signReceipt(reordered).signature?.value).toBe(signReceipt(CLAIMS).signature?.value);
  });

  it("emits no signature (and cannot verify) without a signing secret", () => {
    delete process.env.RECEIPT_SIGNING_SECRET;
    const signed = signReceipt(CLAIMS);
    expect(signed.signature).toBeNull();
    expect(verifyReceiptSignature(signed)).toBe(false);
  });
});
