import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * ACCEPTANCE — Share object-authorization / IDOR (BUILD-BRIEF §9, AUDIT H1)
 *
 * POST /api/shares must only let a user share an assessment they OWN.
 * Originally red against a route that inserted body.assessmentId with no
 * ownership check (any signed-in user could mint a public share link for
 * anyone's assessment); the route now verifies ownership before inserting
 * (AUDIT T1.1, mirroring app/api/assessments/override/route.ts) and this spec
 * proves that gate stays in place. The fixture also models the route's later
 * entitlements share-cap queries (.is/.gt count builders) with zero active
 * shares, so the cap never masks the ownership behaviour under test.
 */

const USER_B = "user-b-uuid";
let scenario: { user: unknown; ownsAssessment: boolean };
const calls = { inserts: [] as Array<{ table: string }> };

function chain(table: string) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  Object.assign(api, {
    select: self,
    eq: self,
    order: self,
    limit: self,
    is: self,
    gt: self,
    delete: self,
    insert: (_row: unknown) => {
      calls.inserts.push({ table });
      return api;
    },
    // ownership lookup on assessments resolves owned/not-owned; the profiles
    // lookup (entitlements) resolves null → free tier, maxActiveShares 3
    maybeSingle: async () => ({
      data: table === "assessments" ? (scenario.ownsAssessment ? { id: "assess-1" } : null) : null,
      error: null,
    }),
    single: async () => ({ data: { share_token: "tok_test" }, error: null }),
    // The active-share-cap count queries `await` the builder chain directly;
    // zero active shares keeps every tier under its cap.
    then: (resolve: (value: unknown) => void) => resolve({ data: null, error: null, count: 0 }),
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

beforeEach(() => {
  calls.inserts = [];
});

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
