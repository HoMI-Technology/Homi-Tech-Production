import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Cost-safety invariant for POST /api/advisor.
 *
 * The real Anthropic model may ONLY be reached by an authenticated PAID user
 * (entitlement advisorRealModel === true). A free-tier user and an anonymous
 * demoContext (/artifact playground) request must NEVER hit the model fetch —
 * they get the deterministic rule-based fallback at $0 AI cost. This test mocks
 * global.fetch and asserts it is not called on those paths, and that the
 * response `source` is "fallback"; a paid user, by contrast, reaches the model.
 */

const state = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  tier: "free" as string,
  role: null as string | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: state.user ? { subscription_tier: state.tier, role: state.role } : null,
            error: null,
          }),
        }),
      }),
    }),
    // Under-quota by default so the gate always allows; quota is not what this
    // test exercises.
    rpc: async () => ({ data: true, error: null }),
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.7",
  rateLimit: async () => ({ allowed: true }),
}));

// Persistence is a best-effort side effect irrelevant to the invariant.
vi.mock("@/lib/advisor/memory", () => ({
  persistCompanionExchange: async () => null,
}));

import { POST } from "@/app/api/advisor/route";

let fetchMock: ReturnType<typeof vi.fn>;

function anthropicOk() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: [{ type: "text", text: "model reply" }],
      usage: { input_tokens: 10, output_tokens: 20 },
    }),
  };
}

function req(body: unknown) {
  return new Request("http://localhost/api/advisor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  state.user = { id: "u1" };
  state.tier = "free";
  state.role = null;
  fetchMock = vi.fn(async () => anthropicOk());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("POST /api/advisor — real-model cost gate", () => {
  it("free-tier signed-in user never reaches the model (serves fallback)", async () => {
    state.tier = "free";
    const res = await POST(req({ messages: [{ role: "user", content: "am I ready?" }] }));
    const body = (await res.json()) as { source: string };
    expect(body.source).toBe("fallback");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("anonymous demoContext request never reaches the model (serves fallback)", async () => {
    state.user = null;
    const res = await POST(
      req({ messages: [{ role: "user", content: "am I ready?" }], demoContext: true }),
    );
    const body = (await res.json()) as { source: string };
    expect(body.source).toBe("fallback");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("paid (Plus) user reaches the current Anthropic Messages API contract", async () => {
    state.tier = "plus";
    const res = await POST(req({ messages: [{ role: "user", content: "am I ready?" }] }));
    const body = (await res.json()) as { source: string };
    expect(body.source).toBe("model");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "content-type": "application/json",
      "x-api-key": "test-key",
      "anthropic-version": "2023-06-01",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
    });
  });
});
