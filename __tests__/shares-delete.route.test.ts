import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockFrom, mockEq, mockMaybeSingle, mockUpdate, mockSelect } = vi.hoisted(
  () => {
    return {
      mockGetUser: vi.fn(),
      mockFrom: vi.fn(),
      mockEq: vi.fn(),
      mockMaybeSingle: vi.fn(),
      mockUpdate: vi.fn(),
      mockSelect: vi.fn(),
    };
  },
);

// The route calls `createClient()` fresh per request; `from` is attached to
// the resolved client so both the ownership select and the revoke update
// resolve against the same in-test fixtures.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { DELETE } from "@/app/api/shares/[id]/route";

/** Builds a chainable Supabase query-builder mock that supports both the
 * `.select().eq().eq().maybeSingle()` ownership check and the
 * `.update().eq().eq()` revoke write (awaited directly as a thenable). */
function makeBuilder({
  selectResult,
  updateResult,
}: {
  selectResult: unknown;
  updateResult: unknown;
}) {
  const builder: Record<string, unknown> = {};
  builder.select = mockSelect.mockReturnValue(builder);
  builder.update = mockUpdate.mockReturnValue(builder);
  builder.eq = mockEq.mockReturnValue(builder);
  builder.maybeSingle = mockMaybeSingle.mockResolvedValue(selectResult);
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(updateResult).then(resolve, reject);
  return builder;
}

function makeRequest(id: string) {
  return {
    request: new Request(`http://localhost/api/shares/${id}`, { method: "DELETE" }),
    context: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/shares/[id]", () => {
  it("returns 401 for an anonymous request", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { request, context } = makeRequest("share-1");
    const res = await DELETE(request, context);

    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 404 and does not write a revoke when the share is not owned by the caller", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-a" } } });
    const builder = makeBuilder({
      selectResult: { data: null, error: null },
      updateResult: { error: null },
    });
    mockFrom.mockReturnValue(builder);

    const { request, context } = makeRequest("share-owned-by-someone-else");
    const res = await DELETE(request, context);
    const json = (await res.json()) as { error?: string };

    expect(res.status).toBe(404);
    expect(json.error).toBeTruthy();
    // Ownership check ran, but update was never invoked because it 404'd first.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 200 and writes revoked_at when the caller owns the share", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-a" } } });
    const builder = makeBuilder({
      selectResult: { data: { id: "share-1" }, error: null },
      updateResult: { error: null },
    });
    mockFrom.mockReturnValue(builder);

    const { request, context } = makeRequest("share-1");
    const res = await DELETE(request, context);
    const json = (await res.json()) as { ok?: boolean };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) }),
    );
  });
});
