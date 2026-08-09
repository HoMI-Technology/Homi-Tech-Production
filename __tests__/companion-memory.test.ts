/**
 * One-memory contracts for the Companion's server-side thread persistence.
 * What matters: persistence is best-effort (never throws, never breaks the
 * chat), the conversation is created exactly once, message order is
 * deterministic, and read-back returns chronological order.
 */

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COMPANION_CONVERSATION_TITLE,
  forgetCompanionThread,
  loadCompanionThread,
  persistCompanionExchange,
} from "@/lib/advisor/memory";

type Result = { data: unknown; error: unknown };

/**
 * Minimal chainable/thenable stand-in for a PostgREST query builder. Every
 * chain method returns itself; awaiting it (or calling maybeSingle/single)
 * resolves the configured result. Captures insert/update payloads.
 */
function makeChain(result: Result, captures?: { inserts?: unknown[]; updates?: unknown[] }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const m of ["select", "order", "limit", "eq", "delete"]) chain[m] = self;
  chain.insert = (payload: unknown) => {
    captures?.inserts?.push(payload);
    return chain;
  };
  chain.update = (payload: unknown) => {
    captures?.updates?.push(payload);
    return chain;
  };
  chain.maybeSingle = async () => result;
  chain.single = async () => result;
  chain.then = (resolve: (r: Result) => void) => resolve(result);
  return chain;
}

/** Fake client: per-table queues of chains, consumed one per .from() call. */
function makeSupabase(queues: Record<string, ReturnType<typeof makeChain>[]>): SupabaseClient {
  return {
    from(table: string) {
      const next = queues[table]?.shift();
      if (!next) throw new Error(`unexpected query on ${table}`);
      return next;
    },
  } as unknown as SupabaseClient;
}

describe("loadCompanionThread", () => {
  it("returns null when the user has no server thread", async () => {
    const supabase = makeSupabase({
      advisor_conversations: [makeChain({ data: null, error: null })],
    });
    expect(await loadCompanionThread(supabase)).toBeNull();
  });

  it("returns the thread in chronological order", async () => {
    const rows = [
      { role: "assistant", content: "second", created_at: "2026-07-17T00:00:02Z" },
      { role: "user", content: "first", created_at: "2026-07-17T00:00:01Z" },
    ];
    const supabase = makeSupabase({
      advisor_conversations: [makeChain({ data: { id: "c1" }, error: null })],
      advisor_messages: [makeChain({ data: rows, error: null })],
    });
    const thread = await loadCompanionThread(supabase);
    expect(thread?.conversationId).toBe("c1");
    expect(thread?.messages.map((m) => m.content)).toEqual(["first", "second"]);
  });

  it("carries the conversation's updated_at as a numeric ms-epoch stamp", async () => {
    const supabase = makeSupabase({
      advisor_conversations: [
        makeChain({ data: { id: "c1", updated_at: "2026-07-17T00:00:05Z" }, error: null }),
      ],
      advisor_messages: [
        makeChain({
          data: [{ role: "user", content: "hi", created_at: "2026-07-17T00:00:05Z" }],
          error: null,
        }),
      ],
    });
    const thread = await loadCompanionThread(supabase);
    expect(thread?.updatedAt).toBe(Date.parse("2026-07-17T00:00:05Z"));
  });

  it("reports a null stamp when the conversation timestamp is unparseable", async () => {
    const supabase = makeSupabase({
      advisor_conversations: [makeChain({ data: { id: "c1" }, error: null })],
      advisor_messages: [
        makeChain({
          data: [{ role: "user", content: "hi", created_at: "2026-07-17T00:00:05Z" }],
          error: null,
        }),
      ],
    });
    const thread = await loadCompanionThread(supabase);
    expect(thread?.updatedAt).toBeNull();
  });

  it("returns null instead of throwing on a read error", async () => {
    const supabase = makeSupabase({
      advisor_conversations: [makeChain({ data: { id: "c1" }, error: null })],
      advisor_messages: [makeChain({ data: null, error: { code: "500" } })],
    });
    expect(await loadCompanionThread(supabase)).toBeNull();
  });
});

describe("persistCompanionExchange", () => {
  const exchange = {
    userId: "u1",
    userMessage: "am I ready?",
    assistantMessage: "not yet — and here's why.",
    source: "model" as const,
    persona: "homie",
  };

  it("creates the conversation on first use and stores an ordered exchange", async () => {
    const captures = { inserts: [] as unknown[], updates: [] as unknown[] };
    const supabase = makeSupabase({
      advisor_conversations: [
        makeChain({ data: null, error: null }), // no existing conversation
        makeChain({ data: { id: "new-c" }, error: null }, captures), // create
        makeChain({ data: null, error: null }, captures), // updated_at bump
      ],
      advisor_messages: [makeChain({ data: null, error: null }, captures)],
    });

    const id = await persistCompanionExchange(supabase, { ...exchange, conversationId: null });
    expect(id).toBe("new-c");

    const convoInsert = captures.inserts[0] as { user_id: string; title: string };
    expect(convoInsert.user_id).toBe("u1");
    expect(convoInsert.title).toBe(COMPANION_CONVERSATION_TITLE);

    const messages = captures.inserts[1] as Array<{
      role: string;
      content: string;
      created_at: string;
      metadata?: { source: string };
    }>;
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[1].metadata?.source).toBe("model");
    // Deterministic ordering: assistant stamped strictly after the user message.
    expect(new Date(messages[1].created_at).getTime()).toBeGreaterThan(
      new Date(messages[0].created_at).getTime(),
    );
  });

  it("reuses a provided conversation id without a lookup", async () => {
    const captures = { inserts: [] as unknown[], updates: [] as unknown[] };
    const supabase = makeSupabase({
      advisor_conversations: [makeChain({ data: null, error: null }, captures)], // updated_at bump only
      advisor_messages: [makeChain({ data: null, error: null }, captures)],
    });
    const id = await persistCompanionExchange(supabase, { ...exchange, conversationId: "c9" });
    expect(id).toBe("c9");
    expect(captures.inserts).toHaveLength(1); // messages only — no conversation insert
  });

  it("returns null when the message insert fails, without throwing", async () => {
    const supabase = makeSupabase({
      advisor_conversations: [makeChain({ data: { id: "c1" }, error: null })],
      advisor_messages: [makeChain({ data: null, error: { code: "23503" } })],
    });
    expect(
      await persistCompanionExchange(supabase, { ...exchange, conversationId: null }),
    ).toBeNull();
  });

  it("never throws even when the client itself blows up", async () => {
    const supabase = {
      from: () => {
        throw new Error("boom");
      },
    } as unknown as SupabaseClient;
    expect(
      await persistCompanionExchange(supabase, { ...exchange, conversationId: null }),
    ).toBeNull();
  });
});

describe("forgetCompanionThread", () => {
  it("deletes scoped to the user and reports success honestly", async () => {
    const supabase = makeSupabase({
      advisor_conversations: [makeChain({ data: null, error: null })],
    });
    expect(await forgetCompanionThread(supabase, "u1")).toBe(true);
  });

  it("reports failure instead of pretending", async () => {
    const supabase = makeSupabase({
      advisor_conversations: [makeChain({ data: null, error: { code: "500" } })],
    });
    expect(await forgetCompanionThread(supabase, "u1")).toBe(false);
  });

  it("never throws when the client blows up", async () => {
    const supabase = {
      from: () => {
        throw new Error("boom");
      },
    } as unknown as SupabaseClient;
    expect(await forgetCompanionThread(supabase, "u1")).toBe(false);
  });
});
