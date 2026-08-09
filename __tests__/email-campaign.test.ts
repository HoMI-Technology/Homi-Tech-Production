import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Campaign unsubscribe-filtering contract (Module C): every broadcast must
 * drop opted-out addresses before the provider call, normalize + dedupe the
 * audience, and resolve audiences from the right tables. These pin the pure
 * partition logic and the resolution path the API route relies on.
 */

import {
  partitionByUnsubscribe,
  normalizeCampaignEmail,
  resolveAudienceRecipients,
  chunk,
  RESEND_BATCH_LIMIT,
} from "@/lib/email/campaign";

describe("partitionByUnsubscribe", () => {
  it("suppresses addresses on the unsubscribe list", () => {
    const { sendable, suppressed } = partitionByUnsubscribe(
      ["a@x.co", "b@x.co", "c@x.co"],
      new Set(["b@x.co"]),
    );
    expect(sendable).toEqual(["a@x.co", "c@x.co"]);
    expect(suppressed).toEqual(["b@x.co"]);
  });

  it("matches the opt-out list case-insensitively and trims whitespace", () => {
    const { sendable, suppressed } = partitionByUnsubscribe(
      ["  Person@Example.COM ", "other@example.com"],
      new Set(["person@example.com"]),
    );
    expect(sendable).toEqual(["other@example.com"]);
    expect(suppressed).toEqual(["person@example.com"]);
  });

  it("dedupes the audience after normalization", () => {
    const { sendable, suppressed } = partitionByUnsubscribe(
      ["dup@x.co", "Dup@X.CO", " dup@x.co"],
      new Set(),
    );
    expect(sendable).toEqual(["dup@x.co"]);
    expect(suppressed).toEqual([]);
  });

  it("drops malformed addresses entirely", () => {
    const { sendable, suppressed } = partitionByUnsubscribe(
      ["not-an-email", "", "   ", "ok@x.co", "@nope"],
      new Set(),
    );
    expect(sendable).toEqual(["ok@x.co"]);
    expect(suppressed).toEqual([]);
  });

  it("sends to everyone when the unsubscribe list is empty", () => {
    const { sendable, suppressed } = partitionByUnsubscribe(["a@x.co", "b@x.co"], new Set());
    expect(sendable).toEqual(["a@x.co", "b@x.co"]);
    expect(suppressed).toEqual([]);
  });
});

describe("chunk", () => {
  it("never produces a batch larger than the Resend limit", () => {
    const emails = Array.from({ length: RESEND_BATCH_LIMIT * 2 + 7 }, (_, i) => `u${i}@x.co`);
    const batches = chunk(emails, RESEND_BATCH_LIMIT);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(RESEND_BATCH_LIMIT);
    expect(batches[1]).toHaveLength(RESEND_BATCH_LIMIT);
    expect(batches[2]).toHaveLength(7);
    expect(batches.every((b) => b.length <= RESEND_BATCH_LIMIT)).toBe(true);
  });
});

// ── Audience resolution with a mocked service-role client ────────────────────

interface FromCall {
  table: string;
  eq?: [string, string];
}

function makeService(tables: Record<string, string[]>): {
  service: SupabaseClient;
  calls: FromCall[];
} {
  const calls: FromCall[] = [];
  const rows = (table: string) => (tables[table] ?? []).map((email) => ({ email }));

  const service = {
    from: (table: string) => {
      const call: FromCall = { table };
      calls.push(call);
      return {
        select: (_cols: string) => ({
          eq: (col: string, val: string) => {
            call.eq = [col, val];
            return { range: async () => ({ data: rows(table), error: null }) };
          },
          range: async () => ({ data: rows(table), error: null }),
        }),
      };
    },
  } as unknown as SupabaseClient;

  return { service, calls };
}

describe("resolveAudienceRecipients", () => {
  it("reads only the waitlist for the waitlist audience and applies the opt-out list", async () => {
    const { service, calls } = makeService({
      waitlist: ["one@x.co", "two@x.co"],
      profiles: ["member@x.co"],
      email_unsubscribes: ["two@x.co"],
    });
    const resolved = await resolveAudienceRecipients(service, "waitlist");
    expect(resolved.sendable).toEqual(["one@x.co"]);
    expect(resolved.suppressed).toEqual(["two@x.co"]);
    expect(calls.map((c) => c.table).sort()).toEqual(["email_unsubscribes", "waitlist"]);
  });

  it("filters profiles by subscription tier for tier audiences", async () => {
    const { service, calls } = makeService({
      profiles: ["pro@x.co"],
      email_unsubscribes: [],
    });
    const resolved = await resolveAudienceRecipients(service, "pro");
    expect(resolved.sendable).toEqual(["pro@x.co"]);
    const profilesCall = calls.find((c) => c.table === "profiles");
    expect(profilesCall?.eq).toEqual(["subscription_tier", "pro"]);
    expect(calls.some((c) => c.table === "waitlist")).toBe(false);
  });

  it("merges waitlist + profiles for the all audience and delivers each address once", async () => {
    const { service } = makeService({
      waitlist: ["shared@x.co", "waiter@x.co"],
      profiles: ["Shared@X.CO", "member@x.co"],
      email_unsubscribes: [],
    });
    const resolved = await resolveAudienceRecipients(service, "all");
    expect(resolved.sendable.sort()).toEqual(["member@x.co", "shared@x.co", "waiter@x.co"]);
  });

  it("normalizeCampaignEmail lowercases and trims", () => {
    expect(normalizeCampaignEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});
