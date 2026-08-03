import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * POST /api/agents — Agent OS orchestration route tests.
 *
 * Invariants:
 * - Feature flag NEXT_PUBLIC_FF_AGENT_OS gates the endpoint.
 * - Free-tier and anonymous requests never reach Anthropic (fallback only).
 * - Paid users reach the model when ANTHROPIC_API_KEY is configured.
 * - Response includes routed_agents, tools_suggested, sentinel, and receipt.
 * - Sentinel guardrail result reflects the reply content.
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

// The Agent OS flag is captured when lib/flags.ts is evaluated, so the env
// must be set before the route module graph is imported (not in beforeEach).
process.env.NEXT_PUBLIC_FF_AGENT_OS = "true";
const { POST } = await import("@/app/api/agents/route");

let fetchMock: ReturnType<typeof vi.fn>;

function anthropicOk(text: string) {
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
  return new Request("http://localhost/api/agents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_FF_AGENT_OS = "true";
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.RECEIPT_SIGNING_SECRET = "test-receipt-secret";
  state.user = { id: "u1" };
  state.tier = "free";
  state.role = null;
  fetchMock = vi.fn(async () => anthropicOk("Analyst here. Your DTI looks solid."));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("POST /api/agents", () => {
  it("returns 503 when the feature flag is off", async () => {
    // Flag is a build-time constant — re-import the route with it stubbed off.
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_FF_AGENT_OS", "false");
    try {
      const { POST: postFlagOff } = await import("@/app/api/agents/route");
      const res = await postFlagOff(req({ messages: [{ role: "user", content: "hi" }] }));
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: string; flag: string };
      expect(body.flag).toBe("NEXT_PUBLIC_FF_AGENT_OS");
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("returns a structured response with agents, tools, sentinel, and receipt", async () => {
    state.tier = "plus";
    const res = await POST(req({ messages: [{ role: "user", content: "what is my DTI?" }] }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      reply: string;
      source: string;
      routed_agents: string[];
      tools_suggested: string[];
      sentinel: { passed: boolean; flagged: boolean };
      receipt: { id: string; integrity: string; agents: string[]; tools: string[] };
    };

    expect(body.source).toBe("model");
    expect(body.routed_agents).toContain("analyst");
    expect(body.tools_suggested).toContain("dti_snapshot");
    expect(body.sentinel.passed).toBe(true);
    expect(body.receipt.id).toMatch(/^RCPT-/);
    expect(body.receipt.agents).toEqual(body.routed_agents);
  });

  it("free-tier user gets fallback and never reaches Anthropic", async () => {
    state.tier = "free";
    const res = await POST(req({ messages: [{ role: "user", content: "am I ready?" }] }));
    const body = (await res.json()) as { source: string; reply: string; routed_agents: string[] };
    expect(body.source).toBe("fallback");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.routed_agents).toContain("homie");
    expect(body.reply.startsWith("Homie here.")).toBe(true);
  });

  it("anonymous request gets fallback and never reaches Anthropic", async () => {
    state.user = null;
    const res = await POST(
      req({ messages: [{ role: "user", content: "am I ready?" }], demoContext: true }),
    );
    const body = (await res.json()) as { source: string };
    expect(body.source).toBe("fallback");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to deterministic reply when sentinel flags model output", async () => {
    state.tier = "plus";
    const modelReply = "You should buy this house guaranteed.";
    fetchMock = vi.fn(async () => anthropicOk(modelReply));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(req({ messages: [{ role: "user", content: "tell me what to do" }] }));
    const body = (await res.json()) as {
      reply: string;
      source: string;
      sentinel: { passed: boolean; flagged: boolean };
    };
    expect(body.source).toBe("fallback");
    expect(body.reply).not.toContain(modelReply);
    expect(body.reply.startsWith("Homie here.")).toBe(true);
    expect(body.sentinel.flagged).toBe(false);
    expect(body.sentinel.passed).toBe(true);
  });

  it("mode influences the lead agent", async () => {
    state.tier = "plus";
    const res = await POST(
      req({ messages: [{ role: "user", content: "hi" }], mode: "plan" }),
    );
    const body = (await res.json()) as { routed_agents: string[] };
    expect(body.routed_agents).toContain("architect");
  });

  it("returns 400 for invalid request body", async () => {
    const res = await POST(req({ messages: [] }));
    expect(res.status).toBe(400);
  });
});
