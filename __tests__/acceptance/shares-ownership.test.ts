import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * ACCEPTANCE — Share object-authorization / IDOR (BUILD-BRIEF §9, AUDIT H1)
 *
 * POST /api/shares must only let a user share an assessment they OWN.
 * Today it inserts body.assessmentId with no ownership check, so any signed-in
 * user can mint a public share link for anyone's assessment. This spec is red
 * against the current route and green once it verifies ownership (mirror the
 * pattern in app/api/assessments/override/route.ts) before inserting.
 */

const USER_B = "user-b-uuid";
let scenario: { user: unknown; ownsAssessment: boolean };
const calls = { inserts: [] as Array<{ table: string }> };

function chain(table: string) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  Object.assign(api, {
    select: self, eq: self, order: self, limit: self,
    insert: (_row: unknown) => { calls.inserts.push({ table }); return api; },
    // ownership lookup on assessments resolves owned/not-owned
    maybeSingle: async () => ({
      data: table === "assessments" ? (scenario.ownsAssessment ? { id: "assess-1" } : null) : null,
      error: null,
    }),
    single: async () => ({ data: { share_token: "tok_test" }, error: null }),
  });
  return api;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: scenario.user }, error: null }) },
    from: (table: string) => chain(table),
  })),
}));

async function callShares(assessmentId: string) {
  const { POST } = await import("@/app/api/shares/route");
  const req = new Request("https://homitechnology.com/api/shares", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assessmentId }),
  });
  return POST(req);
}

beforeEach(() => { calls.inserts = []; });

describe("POST /api/shares — object authorization", () => {
  it("rejects sharing an assessment the caller does not own (no row created)", async () => {
    scenario = { user: { id: USER_B }, ownsAssessment: false };
    const res = await callShares("someone-elses-assessment");
    expect([403, 404]).toContain(res.status);
    expect(calls.inserts.filter((c) => c.table === "score_shares")).toHaveLength(0);
  });

  it("allows sharing an assessment the caller owns", async () => {
    scenario = { user: { id: USER_B }, ownsAssessment: true };
    const res = await callShares("assess-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain("/share/");
  });

  it("requires authentication", async () => {
    scenario = { user: null, ownsAssessment: false };
    const res = await callShares("assess-1");
    expect(res.status).toBe(401);
  });
});
