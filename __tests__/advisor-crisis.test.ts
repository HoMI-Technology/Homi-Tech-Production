import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Safety triage invariant for the Companion (Safety Canon — minimal tier).
 *
 * detectAcuteDistress is the deterministic gate in front of BOTH reply paths
 * of POST /api/advisor. When the latest user message expresses acute
 * distress, the route must return the word-locked CRISIS_SUPPORT_MESSAGE —
 * before quota, before tier gating, before any model fetch — for every kind
 * of caller (free, paid, anonymous demo). The reply never contains scoring
 * or assessment talk, and the statement is never treated as assessment data.
 */

import { detectAcuteDistress, CRISIS_SUPPORT_MESSAGE } from "@/lib/advisor/crisis";
import { PHASE0_PAUSE_COPY } from "@/lib/advisor/phase0";

const OPEN_PHASE0 = {
  frozen: false,
  frozen_until: null,
  last_signal_at: null,
};

const state = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  tier: "free" as string,
  role: null as string | null,
  phase0: {
    frozen: false,
    frozen_until: null as string | null,
    last_signal_at: null as string | null,
  },
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
    rpc: async (fn: string) => {
      if (fn === "phase0_get_state" || fn === "phase0_ingest") {
        return { data: state.phase0, error: null };
      }
      return { data: true, error: null };
    },
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
  state.phase0 = { ...OPEN_PHASE0 };
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("detectAcuteDistress", () => {
  it.each([
    "honestly after this divorce I don't see the point of anything anymore",
    "I keep thinking about suicide",
    "sometimes I want to kill myself",
    "my family would be better off without me",
    "I don't want to be here anymore",
    "I've thought about hurting myself",
    "what's the point, nothing matters anymore",
    "there is no reason to keep going",
  ])("fires on acute distress: %s", (text) => {
    expect(detectAcuteDistress(text)).toBe(true);
  });

  it.each([
    "I'm killing it at work this quarter",
    "that kitchen is to die for",
    "this housing market is killing me",
    "I see no point in refinancing right now",
    "I don't see the point of a bigger house",
    "I want to end my lease early",
    "the deadline is brutal",
    "am I ready to buy?",
    "",
  ])("stays quiet on ordinary money talk: %s", (text) => {
    expect(detectAcuteDistress(text)).toBe(false);
  });
});

describe("CRISIS_SUPPORT_MESSAGE (word-locked copy)", () => {
  it("carries both crisis resources", () => {
    expect(CRISIS_SUPPORT_MESSAGE).toContain("988");
    expect(CRISIS_SUPPORT_MESSAGE).toContain("741741");
  });

  it("contains no scoring or assessment talk", () => {
    const lowered = CRISIS_SUPPORT_MESSAGE.toLowerCase();
    for (const banned of ["score", "verdict", "assessment", "readiness", "pillar", "not yet"]) {
      expect(lowered).not.toContain(banned);
    }
  });
});

describe("POST /api/advisor — crisis short-circuit", () => {
  const DISTRESS = "after this divorce I don't see the point of anything anymore";

  it("free signed-in user gets the word-locked reply; no model call", async () => {
    const res = await POST(req({ messages: [{ role: "user", content: DISTRESS }] }));
    const body = (await res.json()) as { reply: string; source: string };
    expect(body.source).toBe("crisis");
    expect(body.reply).toBe(CRISIS_SUPPORT_MESSAGE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("paid user in distress is short-circuited before the model", async () => {
    state.tier = "plus";
    const res = await POST(req({ messages: [{ role: "user", content: DISTRESS }] }));
    const body = (await res.json()) as { reply: string; source: string };
    expect(body.source).toBe("crisis");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("anonymous demoContext caller still gets the crisis reply", async () => {
    state.user = null;
    const res = await POST(
      req({ messages: [{ role: "user", content: DISTRESS }], demoContext: true }),
    );
    const body = (await res.json()) as { reply: string; source: string };
    expect(body.source).toBe("crisis");
    expect(body.reply).toBe(CRISIS_SUPPORT_MESSAGE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signed-in Phase 0 freeze refuses a clean message (no READY from the model)", async () => {
    const frozenUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    state.phase0 = {
      frozen: true,
      frozen_until: frozenUntil,
      last_signal_at: frozenUntil,
    };

    const res = await POST(
      req({
        messages: [{ role: "user", content: "am I ready to buy?" }],
        phase0Frozen: false,
      }),
    );
    const body = (await res.json()) as { reply: string; source: string };
    expect(body.source).toBe("phase0");
    expect(body.reply).toContain("Your assessment is paused");
    expect(body.reply).not.toMatch(/\bREADY\b/);
    expect(body.reply).not.toMatch(/ALMOST THERE/);
    expect(body.reply).not.toMatch(/BUILD FIRST/);
    expect(body.reply).not.toMatch(/DO NOT PROCEED/);
    expect(body.reply).not.toMatch(/NOT YET/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ordinary money questions do not trip the gate", async () => {
    const res = await POST(
      req({ messages: [{ role: "user", content: "am I ready to buy a home?" }] }),
    );
    const body = (await res.json()) as { source: string };
    expect(body.source).not.toBe("crisis");
  });
});

describe("POST /api/advisor — Phase 0 two-category freeze", () => {
  const TWO_CATEGORY = "nothing will ever get better and my life is falling apart";

  it("two-category text returns Brand freeze copy, not a verdict", async () => {
    const res = await POST(req({ messages: [{ role: "user", content: TWO_CATEGORY }] }));
    const body = (await res.json()) as { reply: string; source: string; phase0?: { frozen: boolean } };
    expect(body.source).toBe("phase0");
    expect(body.phase0?.frozen).toBe(true);
    expect(body.reply).toContain(PHASE0_PAUSE_COPY.split("\n")[0]);
    expect(body.reply).not.toContain("READY");
    expect(body.reply).not.toContain("ALMOST THERE");
    expect(body.reply).not.toContain("DO NOT PROCEED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("one language signal does not freeze (acute still wins when it fires)", async () => {
    const res = await POST(
      req({ messages: [{ role: "user", content: "I feel hopeless about this mortgage" }] }),
    );
    const body = (await res.json()) as { source: string };
    expect(body.source).not.toBe("phase0");
  });
});
