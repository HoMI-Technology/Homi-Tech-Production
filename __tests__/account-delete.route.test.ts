import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockFrom, mockAdminDeleteUser, mockRevoke, mockEnv } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockAdminDeleteUser: vi.fn(),
  mockRevoke: vi.fn(),
  mockEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key" as string | undefined,
  },
}));

// The route's real limiter is 5/min per IP and every test request shares the
// test-runner "IP" — mock it so case count never trips 429s.
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true })),
  getClientIp: vi.fn(() => "test-ip"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { admin: { deleteUser: mockAdminDeleteUser } },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/plaid/remove", () => ({
  revokeUserPlaidItems: mockRevoke,
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { POST } from "@/app/api/account/delete/route";

/** Chainable builder for the fallback path's `.delete().eq().select()`. */
function makeDeleteBuilder(result: unknown) {
  const builder: Record<string, unknown> = {};
  builder.delete = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.select = vi.fn().mockResolvedValue(result);
  return builder;
}

const request = () => new Request("http://localhost/api/account/delete", { method: "POST" });

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.SUPABASE_SERVICE_ROLE_KEY = "service-key";
});

describe("POST /api/account/delete", () => {
  it("401s an anonymous request without touching anything", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(mockRevoke).not.toHaveBeenCalled();
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();
  });

  it("stops BEFORE deleting anything when Plaid revocation fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockRevoke.mockResolvedValue({ total: 2, revoked: 1, failed: 1 });

    const res = await POST(request());
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(502);
    expect(json.error).toContain("Nothing was deleted");
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();
  });

  it("revokes Plaid then erases the auth user, and reports both", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockRevoke.mockResolvedValue({ total: 2, revoked: 2, failed: 0 });
    mockAdminDeleteUser.mockResolvedValue({ error: null });

    const res = await POST(request());
    const json = (await res.json()) as { ok?: boolean; authUserRemoved?: boolean; plaidItemsRevoked?: number };

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, authUserRemoved: true, plaidItemsRevoked: 2 });
    expect(mockRevoke).toHaveBeenCalledWith(expect.anything(), "u1");
    expect(mockAdminDeleteUser).toHaveBeenCalledWith("u1");
  });

  it("never claims success when deleteUser fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockRevoke.mockResolvedValue({ total: 0, revoked: 0, failed: 0 });
    mockAdminDeleteUser.mockResolvedValue({ error: { message: "boom" } });

    const res = await POST(request());
    const json = (await res.json()) as { ok?: boolean; error?: string };

    expect(res.status).toBe(500);
    expect(json.ok).toBeUndefined();
    expect(json.error).toContain("Nothing was removed");
  });

  describe("fallback without a service key", () => {
    beforeEach(() => {
      mockEnv.SUPABASE_SERVICE_ROLE_KEY = undefined;
    });

    it("erases via the caller's own profiles row and is honest about the credential", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      mockFrom.mockReturnValue(makeDeleteBuilder({ data: [{ id: "u1" }], error: null }));

      const res = await POST(request());
      const json = (await res.json()) as { ok?: boolean; authUserRemoved?: boolean; note?: string };

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.authUserRemoved).toBe(false);
      expect(json.note).toContain("could not be removed");
      expect(mockRevoke).not.toHaveBeenCalled();
    });

    it("treats a 0-row profiles delete as FAILURE, never success (the audit bug)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      mockFrom.mockReturnValue(makeDeleteBuilder({ data: [], error: null }));

      const res = await POST(request());
      const json = (await res.json()) as { ok?: boolean; error?: string };

      expect(res.status).toBe(500);
      expect(json.ok).toBeUndefined();
      expect(json.error).toContain("Nothing was removed");
    });
  });
});
