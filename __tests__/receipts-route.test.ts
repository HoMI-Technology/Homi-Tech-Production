import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * GET /api/v1/receipts/:token contract — the B2B verification surface.
 * Auth by hashed partner key; fail-closed on revocation/expiry; audit-log
 * writes only for live receipts; verdict + bands only in the body.
 */

const VALID_TOKEN = "a".repeat(32);
const GOOD_KEY = "homi_live_" + "b".repeat(32);
const TEST_KEY = "homi_test_" + "c".repeat(32);

interface Scenario {
  keyRow: { id: string; revoked_at: string | null } | null;
  share: {
    id: string;
    expires_at: string | null;
    revoked_at: string | null;
    created_at: string;
    audience_partner_key_id?: string | null;
    assessment: Record<string, unknown> | null;
  } | null;
}

let scenario: Scenario;
let verificationInserts: Array<Record<string, unknown>>;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "partner_api_keys") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: scenario.keyRow, error: null }) }),
          }),
        };
      }
      if (table === "score_shares") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: scenario.share, error: null }) }),
          }),
        };
      }
      // receipt_verifications
      return {
        insert: async (row: Record<string, unknown>) => {
          verificationInserts.push(row);
          return { error: null };
        },
      };
    },
  }),
}));

async function call(token: string, key?: string, purpose?: string | null) {
  const { GET } = await import("@/app/api/v1/receipts/[token]/route");
  const headers: Record<string, string> = { "x-forwarded-for": "5.5.5.5" };
  if (key) headers.authorization = `Bearer ${key}`;
  if (purpose !== null) headers["homi-purpose"] = purpose ?? "educational_guidance";
  return GET(new Request(`https://homitechnology.com/api/v1/receipts/${token}`, { headers }), {
    params: Promise.resolve({ token }),
  });
}

function liveShare() {
  return {
    id: "share-1",
    expires_at: "2099-01-01T00:00:00.000Z",
    revoked_at: null,
    created_at: "2026-07-01T00:00:00.000Z",
    audience_partner_key_id: "key-1",
    assessment: {
      overall_score: 82,
      verdict: "READY",
      financial_score: 30,
      emotional_score: 24,
      timing_score: 20,
    },
  };
}

beforeEach(() => {
  verificationInserts = [];
  scenario = { keyRow: { id: "key-1", revoked_at: null }, share: liveShare() };
  process.env.RECEIPT_SIGNING_SECRET = "test-secret";
});

describe("GET /api/v1/receipts/:token", () => {
  it("401s without a partner key and never queries the share", async () => {
    const res = await call(VALID_TOKEN);
    expect(res.status).toBe(401);
    expect(verificationInserts).toHaveLength(0);
  });

  it("401s for a revoked partner key", async () => {
    scenario.keyRow = { id: "key-1", revoked_at: "2026-01-01T00:00:00.000Z" };
    const res = await call(VALID_TOKEN, GOOD_KEY);
    expect(res.status).toBe(401);
  });

  it("verifies a live receipt: 200, signed, bands only, audit-logged", async () => {
    const res = await call(VALID_TOKEN, GOOD_KEY);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      valid: boolean;
      status: string;
      receipt: Record<string, unknown>;
      signature: { value: string } | null;
    };
    expect(json.valid).toBe(true);
    expect(json.status).toBe("valid");
    expect(json.receipt.verdict).toBe("READY");
    expect(json.receipt.scoreBand).toBe("high");
    // Never leak the raw score or sub-scores.
    expect(JSON.stringify(json.receipt)).not.toContain("82");
    expect(json.receipt.overall_score).toBeUndefined();
    expect(json.signature?.value).toBeTruthy();
    expect(verificationInserts).toHaveLength(1);
    expect(verificationInserts[0]).toMatchObject({ share_id: "share-1", partner_key_id: "key-1" });
  });

  it("fails closed for a revoked share: 404, no audit row", async () => {
    scenario.share = { ...liveShare(), revoked_at: "2026-07-02T00:00:00.000Z" };
    const res = await call(VALID_TOKEN, GOOD_KEY);
    expect(res.status).toBe(404);
    const json = (await res.json()) as { valid: boolean; status: string };
    expect(json.valid).toBe(false);
    expect(json.status).toBe("not_found");
    expect(verificationInserts).toHaveLength(0);
  });

  it("fails closed for an expired share: 404 not_found", async () => {
    scenario.share = { ...liveShare(), expires_at: "2020-01-01T00:00:00.000Z" };
    const res = await call(VALID_TOKEN, GOOD_KEY);
    expect(res.status).toBe(404);
    const json = (await res.json()) as { status: string };
    expect(json.status).toBe("not_found");
  });

  it("404s when the share is not bound to this partner key", async () => {
    scenario.share = { ...liveShare(), audience_partner_key_id: null };
    const res = await call(VALID_TOKEN, GOOD_KEY);
    expect(res.status).toBe(404);
    expect(verificationInserts).toHaveLength(0);
  });

  it("404s tokens shorter than 32 hex", async () => {
    const res = await call("aa".repeat(8), GOOD_KEY);
    expect(res.status).toBe(404);
  });

  it("404s for an unknown token", async () => {
    scenario.share = null;
    const res = await call(VALID_TOKEN, GOOD_KEY);
    expect(res.status).toBe(404);
  });

  it("400s when Homi-Purpose is omitted", async () => {
    const res = await call(VALID_TOKEN, GOOD_KEY, null);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code?: string } | string };
    const code = typeof json.error === "string" ? json.error : json.error.code;
    expect(String(code)).toMatch(/PURPOSE_REQUIRED|purpose/i);
    expect(verificationInserts).toHaveLength(0);
  });

  it("404s eligibility purposes so scanners do not get a forbidden-use menu", async () => {
    for (const purpose of ["lending", "employment", "housing", "insurance"]) {
      const res = await call(VALID_TOKEN, GOOD_KEY, purpose);
      expect(res.status).toBe(404);
    }
    expect(verificationInserts).toHaveLength(0);
  });

  it("returns purpose, not_for, and Decision Readiness name — never a raw score", async () => {
    const res = await call(VALID_TOKEN, GOOD_KEY);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { receipt: Record<string, unknown> };
    expect(json.receipt.purpose).toBe("educational_guidance");
    expect(json.receipt.scoreName).toBe("Decision Readiness");
    expect(json.receipt.notFor).toEqual(["credit", "employment", "housing", "insurance"]);
    expect(JSON.stringify(json)).not.toContain("82");
    expect(json.receipt.overall_score).toBeUndefined();
  });

  it("accepts a homi_test_ partner key", async () => {
    const res = await call(VALID_TOKEN, TEST_KEY);
    expect(res.status).toBe(200);
  });
});
