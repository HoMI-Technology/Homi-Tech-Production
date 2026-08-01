import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * sendLifecycleEmail contract: claim-first idempotency (a duplicate ledger key
 * means some other run owns the send), unsubscribe suppression for marketing
 * mail, and claim release on provider failure so tomorrow's cron can retry.
 */

let unsubscribed = false;
vi.mock("@/lib/email/unsubscribe", () => ({
  isUnsubscribed: vi.fn(async () => unsubscribed),
  listUnsubscribeHeaders: () => ({}),
}));

import { sendLifecycleEmail } from "@/lib/email/send";

interface LedgerCalls {
  inserts: Array<Record<string, unknown>>;
  deletes: string[];
}

function makeService(opts: { claimError?: { code: string; message: string } | null }): {
  service: SupabaseClient;
  calls: LedgerCalls;
} {
  const calls: LedgerCalls = { inserts: [], deletes: [] };
  const service = {
    from: () => ({
      insert: async (rowValue: Record<string, unknown>) => {
        calls.inserts.push(rowValue);
        return { error: opts.claimError ?? null };
      },
      delete: () => ({
        eq: async (_col: string, value: string) => {
          calls.deletes.push(value);
          return { error: null };
        },
      }),
    }),
  } as unknown as SupabaseClient;
  return { service, calls };
}

const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));

function args(service: SupabaseClient) {
  return {
    service,
    dedupeKey: "welcome:u1",
    userId: "u1",
    to: "a@b.co",
    template: "welcome",
    marketing: true,
    render: () => ({ subject: "s", html: "<p>h</p>" }),
  };
}

beforeEach(() => {
  unsubscribed = false;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  process.env.RESEND_API_KEY = "re_test";
});

describe("sendLifecycleEmail", () => {
  it("claims the ledger key then sends exactly once", async () => {
    const { service, calls } = makeService({});
    const result = await sendLifecycleEmail(args(service));
    expect(result.ok).toBe(true);
    expect(calls.inserts).toHaveLength(1);
    expect(calls.inserts[0].dedupe_key).toBe("welcome:u1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("skips silently when the key is already claimed (unique violation)", async () => {
    const { service } = makeService({ claimError: { code: "23505", message: "duplicate" } });
    const result = await sendLifecycleEmail(args(service));
    expect(result).toEqual({ ok: false, skipped: "duplicate" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("suppresses marketing mail to unsubscribed recipients before claiming", async () => {
    unsubscribed = true;
    const { service, calls } = makeService({});
    const result = await sendLifecycleEmail(args(service));
    expect(result).toEqual({ ok: false, skipped: "unsubscribed" });
    expect(calls.inserts).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still sends transactional mail to unsubscribed recipients", async () => {
    unsubscribed = true;
    const { service } = makeService({});
    const result = await sendLifecycleEmail({ ...args(service), marketing: false });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("releases the claim when the provider rejects, so a retry can re-attempt", async () => {
    fetchMock.mockImplementation(async () => new Response("boom", { status: 500 }));
    const { service, calls } = makeService({});
    const result = await sendLifecycleEmail(args(service));
    expect(result).toEqual({ ok: false, skipped: "provider_error" });
    expect(calls.deletes).toEqual(["welcome:u1"]);
  });

  it("releases the claim when Resend is unconfigured, so sends self-heal after setup", async () => {
    delete process.env.RESEND_API_KEY;
    const { service, calls } = makeService({});
    const result = await sendLifecycleEmail(args(service));
    expect(result).toEqual({ ok: false, skipped: "unconfigured" });
    expect(calls.deletes).toEqual(["welcome:u1"]);
  });
});

/**
 * The From name is brand-visible on the first email a user ever receives, and
 * it is the kind of string that silently rots: `sendTemplateEmail` shipped for
 * months carrying "H┼ìMI" — the UTF-8 bytes of `ō` decoded as CP437 and
 * re-saved. Nothing failed, the mail just went out misbranded. Assert the exact
 * codepoint on every sender so a bad round-trip breaks the build instead.
 */
describe("From header encoding", () => {
  const EXPECTED_FROM = "HōMI <hello@homitechnology.com>";

  async function capturedFrom(send: () => Promise<unknown>): Promise<string> {
    await send();
    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
    return (JSON.parse(String(init.body)) as { from: string }).from;
  }

  it("sendTemplateEmail addresses mail as HōMI, not mojibake", async () => {
    const { sendTemplateEmail } = await import("@/lib/email/send");
    const from = await capturedFrom(() =>
      sendTemplateEmail({ template: "waitlist", to: "a@b.co" }),
    );
    expect(from).toBe(EXPECTED_FROM);
  });

  it("sendLifecycleEmail addresses mail as HōMI, not mojibake", async () => {
    const { service } = makeService({});
    const from = await capturedFrom(() => sendLifecycleEmail(args(service)));
    expect(from).toBe(EXPECTED_FROM);
  });
});
