import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  existing: {
    id: "survey-1",
    completed_at: null as string | null,
    user_id: "user-1",
  },
  updates: [] as Array<Record<string, unknown>>,
  events: [] as Array<Record<string, unknown>>,
  assessmentUpdates: 0,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "assessments") {
        return {
          update: () => {
            state.assessmentUpdates += 1;
            return { eq: () => ({ eq: async () => ({ error: null }) }) };
          },
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
      if (table !== "outcome_surveys") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.existing, error: null }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          state.updates.push(payload);
          return {
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        },
      };
    },
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.9",
  rateLimit: async () => ({ allowed: true }),
}));

import { POST } from "@/app/api/outcomes/surveys/route";

function post(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/outcomes/surveys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/outcomes/surveys", () => {
  beforeEach(() => {
    state.user = { id: "user-1" };
    state.existing = { id: "survey-1", completed_at: null, user_id: "user-1" };
    state.updates = [];
    state.events = [];
    state.assessmentUpdates = 0;
  });

  it("requires auth", async () => {
    state.user = null;
    const res = await post({
      surveyId: "11111111-1111-4111-8111-111111111111",
      outcome: "moved",
    });
    expect(res.status).toBe(401);
  });

  it("rejects invalid ranges", async () => {
    const res = await post({
      surveyId: "11111111-1111-4111-8111-111111111111",
      outcome: "moved",
      financial_stress: 99,
    });
    expect(res.status).toBe(400);
    expect(state.updates).toHaveLength(0);
  });

  it("refuses to mutate a completed survey and never touches assessments", async () => {
    state.existing.completed_at = "2026-08-01T00:00:00.000Z";
    const res = await post({
      surveyId: "11111111-1111-4111-8111-111111111111",
      outcome: "moved",
    });
    expect(res.status).toBe(409);
    expect(state.assessmentUpdates).toBe(0);
  });

  it("stores structured fields without score or verdict", async () => {
    const res = await post({
      surveyId: "11111111-1111-4111-8111-111111111111",
      outcome: "waited",
      financial_stress: 4,
    });
    expect(res.status).toBe(200);
    expect(state.updates[0]).toMatchObject({
      outcome: "waited",
      financial_stress: 4,
      contact_state: "completed",
    });
    expect(state.updates[0]).not.toHaveProperty("score");
    expect(state.updates[0]).not.toHaveProperty("verdict");
    expect(state.assessmentUpdates).toBe(0);
    expect(state.events[0]?.event_type).toBe("completed");
  });

  it("stores no_answer without score or verdict", async () => {
    const res = await post({
      surveyId: "11111111-1111-4111-8111-111111111111",
      outcome: "no_answer",
    });
    expect(res.status).toBe(200);
    expect(state.updates[0]).toMatchObject({
      outcome: "no_answer",
      contact_state: "completed",
    });
    expect(state.updates[0]).not.toHaveProperty("score");
    expect(state.updates[0]).not.toHaveProperty("verdict");
    expect(state.assessmentUpdates).toBe(0);
  });
});
