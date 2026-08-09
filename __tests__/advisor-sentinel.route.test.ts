import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Sentinel guardrail invariant for POST /api/advisor.
 *
 * When the real Anthropic model returns advice-like or pressure language that
 * triggers Sentinel patterns, the route must NOT forward that reply to the user.
 * It must fall back to the deterministic persona reply and report source
 * "fallback". Safe model replies continue to be returned as source "model".
 */

const state = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  tier: "plus" as string,
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
    rpc: async () => ({ data: true, error: null }),
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.7",
  rateLimit: async () => ({ allowed: true }),
}));

vi.mock("@/lib/advisor/memory", () => ({
  persistCompanionExchange: async () => null,
}));

import { POST } from "@/app/api/advisor/route";

let fetchMock: ReturnType<typeof vi.fn>;

function anthropicReply(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: [{ type: "text", text }],
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
  state.tier = "plus";
  state.role = null;
  fetchMock = vi.fn(async () => anthropicReply("model reply"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("POST /api/advisor — Sentinel output guardrail", () => {
  it("returns model reply when Sentinel does not flag it", async () => {
    fetchMock = vi.fn(async () =>
      anthropicReply("I can walk through your numbers, but I won't tell you to buy."),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(req({ messages: [{ role: "user", content: "am I ready?" }] }));
    const body = (await res.json()) as { source: string; reply: string };
    expect(body.source).toBe("model");
    expect(body.reply).toContain("walk through your numbers");
  });

  it("falls back to deterministic reply when model says 'you should buy'", async () => {
    fetchMock = vi.fn(async () => anthropicReply("You should buy this house guaranteed."));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(req({ messages: [{ role: "user", content: "am I ready?" }] }));
    const body = (await res.json()) as { source: string; reply: string };
    expect(body.source).toBe("fallback");
    expect(body.reply).not.toContain("You should buy");
  });

  it("falls back to deterministic reply when model claims approval/qualification", async () => {
    fetchMock = vi.fn(async () => anthropicReply("You are approved for a $400,000 mortgage."));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(req({ messages: [{ role: "user", content: "am I ready?" }] }));
    const body = (await res.json()) as { source: string; reply: string };
    expect(body.source).toBe("fallback");
    expect(body.reply).not.toContain("approved for");
  });

  it("falls back to deterministic reply when model recommends an action", async () => {
    fetchMock = vi.fn(async () =>
      anthropicReply("I recommend that you sign the offer this weekend."),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(req({ messages: [{ role: "user", content: "am I ready?" }] }));
    const body = (await res.json()) as { source: string; reply: string };
    expect(body.source).toBe("fallback");
    expect(body.reply).not.toContain("recommend");
  });
});
