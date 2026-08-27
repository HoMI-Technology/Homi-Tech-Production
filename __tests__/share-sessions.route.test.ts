import { describe, it, expect, vi, beforeEach } from "vitest";

const GOOD_KEY = "homi_live_" + "b".repeat(32);
const TEST_KEY = "homi_test_" + "c".repeat(32);

let keyRow: { id: string; revoked_at: string | null } | null;
let inserted: Record<string, unknown> | null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "partner_api_keys") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: keyRow, error: null }) }),
          }),
        };
      }
      if (table === "share_sessions") {
        return {
          insert: (row: Record<string, unknown>) => {
            inserted = row;
            return {
              select: () => ({
                single: async () => ({
                  data: { id: "sess-1", expires_at: row.expires_at },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      return { insert: async () => ({ error: null }) };
    },
  }),
}));

async function post(key?: string, purpose?: string | null) {
  const { POST } = await import("@/app/api/v1/share-sessions/route");
  const headers: Record<string, string> = { "x-forwarded-for": "5.5.5.5" };
  if (key) headers.authorization = `Bearer ${key}`;
  if (purpose !== null) headers["homi-purpose"] = purpose ?? "educational_guidance";
  return POST(new Request("https://homitechnology.com/api/v1/share-sessions", { method: "POST", headers }));
}

beforeEach(() => {
  keyRow = { id: "key-1", revoked_at: null };
  inserted = null;
  process.env.NEXT_PUBLIC_SITE_URL = "https://homitechnology.com";
});

describe("POST /api/v1/share-sessions", () => {
  it("401s without a partner key", async () => {
    const res = await post();
    expect(res.status).toBe(401);
  });

  it("400s without Homi-Purpose", async () => {
    const res = await post(GOOD_KEY, null);
    expect(res.status).toBe(400);
  });

  it("returns only id, url, expiry — no score — for a live key", async () => {
    const res = await post(GOOD_KEY);
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.id).toBe("sess-1");
    expect(String(json.url)).toContain("/assessment?session=sess-1");
    expect(json.expires_at).toBeTruthy();
    expect(json.score).toBeUndefined();
    expect(JSON.stringify(json)).not.toMatch(/overall_score|"score":/);
    expect(inserted?.partner_key_id).toBe("key-1");
  });

  it("accepts a homi_test_ key", async () => {
    const res = await post(TEST_KEY);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { url: string };
    expect(json.url).toContain("env=test");
  });
});
