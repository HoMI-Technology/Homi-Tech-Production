import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for /api/advisor/history GET — the read side of the advisor
 * thread's persistence contract. The response carries the ms-epoch
 * `updatedAt` stamp so lib/persistence.ts can reconcile the local thread
 * last-write-wins against the server copy.
 */

type Row = Record<string, unknown> | null;

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  convo: null as Row,
  messages: [] as Row[],
}));

/** Chainable/thenable stand-in mirroring the PostgREST builder the route uses. */
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const m of ["select", "order", "limit", "eq"]) chain[m] = self;
  chain.maybeSingle = async () => result;
  chain.then = (resolve: (r: { data: unknown; error: unknown }) => void) => resolve(result);
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "advisor_conversations") {
        return makeChain({ data: state.convo, error: null });
      }
      if (table === "advisor_messages") {
        return makeChain({ data: state.messages, error: null });
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.7",
  rateLimit: async () => ({ allowed: true }),
}));

import { GET } from "@/app/api/advisor/history/route";

function getRequest() {
  return new Request("http://localhost/api/advisor/history");
}

beforeEach(() => {
  state.user = { id: "user-1" };
  state.convo = null;
  state.messages = [];
});

describe("GET /api/advisor/history", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("returns the empty shape when the user has no server thread", async () => {
    const res = await GET(getRequest());
    expect(await res.json()).toEqual({ conversationId: null, messages: [], updatedAt: null });
  });

  it("returns the thread with a numeric ms-epoch updatedAt stamp", async () => {
    state.convo = { id: "convo-1", updated_at: "2026-07-17T12:00:00.000Z" };
    state.messages = [
      { role: "assistant", content: "second", created_at: "2026-07-17T12:00:01.000Z" },
      { role: "user", content: "first", created_at: "2026-07-17T12:00:00.000Z" },
    ];
    const res = await GET(getRequest());
    const body = await res.json();
    expect(body.conversationId).toBe("convo-1");
    expect(body.messages.map((m: { content: string }) => m.content)).toEqual(["first", "second"]);
    expect(body.updatedAt).toBe(Date.parse("2026-07-17T12:00:00.000Z"));
  });
});
