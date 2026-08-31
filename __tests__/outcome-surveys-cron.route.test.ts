import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  events: [] as Array<Record<string, unknown>>,
  profiles: new Map<string, Record<string, unknown>>(),
  push: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/security", () => ({
  safeSecretEquals: (provided: string | null | undefined, expected: string) =>
    Boolean(provided && expected && provided === expected),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "outcome_surveys") {
        return {
          select: () => ({
            is: () => ({
              is: () => ({
                lte: () => ({
                  order: () => ({
                    limit: async () => ({ data: state.rows, error: null }),
                  }),
                }),
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: async () => {
              state.updates.push(payload);
              return { error: null };
            },
          }),
        };
      }
      if (table === "outcome_survey_events") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            state.events.push(payload);
            return { error: null };
          },
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: state.profiles.get("u1") ?? null,
                error: null,
              }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "push_subscriptions") {
        return {
          select: () => ({
            eq: async () => ({ data: state.push, error: null }),
          }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("@/lib/email/send", () => ({
  sendTemplateEmail: async () => ({ ok: false, sent: false }),
}));
vi.mock("@/lib/email/unsubscribe", () => ({ isUnsubscribed: async () => false }));
vi.mock("@/lib/push/send", () => ({ sendPush: async () => ({ ok: false }) }));

describe("GET /api/cron/outcome-surveys", () => {
  beforeEach(() => {
    vi.resetModules();
    state.rows = [];
    state.updates = [];
    state.events = [];
    state.profiles.clear();
    state.push = [];
    process.env.CRON_SECRET = "cron-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  async function get(auth?: string) {
    const { GET } = await import("@/app/api/cron/outcome-surveys/route");
    return GET(
      new Request("http://localhost/api/cron/outcome-surveys", {
        headers: auth ? { authorization: auth } : undefined,
      }),
    );
  }

  it("returns 401 when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const res = await get("Bearer cron-secret");
    expect(res.status).toBe(401);
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const res = await get("Bearer nope");
    expect(res.status).toBe(401);
  });

  it("leaves a due row retryable when delivery fails and the user is reachable", async () => {
    state.rows = [
      {
        id: "s1",
        user_id: "u1",
        kind: "day30",
        due_at: "2020-01-01T00:00:00.000Z",
        completed_at: null,
        notified_at: null,
      },
    ];
    state.profiles.set("u1", {
      email: "a@example.com",
      full_name: "Ada",
      email_reminders_enabled: true,
    });
    const res = await get("Bearer cron-secret");
    expect(res.status).toBe(200);
    expect(state.updates).toHaveLength(0);
  });
});
