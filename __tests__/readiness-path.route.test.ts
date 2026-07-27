import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "127.0.0.1",
  rateLimit: vi.fn(async () => ({ allowed: true })),
}));

import { GET, PUT } from "@/app/api/readiness-path/route";
import { computeScore, type AssessmentInputs } from "@/lib/scoring";
import { buildReadinessPath } from "@/lib/readiness";

const SAFE: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 0.5,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 9,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.22,
  downPaymentProgress: 0.85,
  monthlyHousingRatio: 0.3,
};

function chain(result: { data: unknown; error: unknown }) {
  const api = {
    select: vi.fn(() => api),
    eq: vi.fn(() => api),
    maybeSingle: vi.fn(async () => result),
    upsert: vi.fn(async () => result),
  };
  return api;
}

describe("/api/readiness-path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET 401 when signed out", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(new Request("http://localhost/api/readiness-path"));
    expect(res.status).toBe(401);
  });

  it("GET returns null state when no row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    const res = await GET(new Request("http://localhost/api/readiness-path"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.state).toBeNull();
  });

  it("PUT 401 when signed out", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const path = buildReadinessPath(computeScore(SAFE));
    const res = await PUT(
      new Request("http://localhost/api/readiness-path", {
        method: "PUT",
        body: JSON.stringify({ state: path, client_updated_at: Date.now() }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("PUT accepts a valid path", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const api = chain({ data: null, error: null });
    mockFrom.mockReturnValue(api);
    const path = buildReadinessPath(computeScore(SAFE));
    const res = await PUT(
      new Request("http://localhost/api/readiness-path", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: path, client_updated_at: Date.now() }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(api.upsert).toHaveBeenCalled();
  });
});
