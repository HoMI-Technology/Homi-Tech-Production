import { beforeEach, describe, expect, it, vi } from "vitest";

const { insertMock, sendTemplateEmail } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  sendTemplateEmail: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true })),
  getClientIp: vi.fn(() => "test-ip"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: () => ({ insert: insertMock }),
  })),
}));

vi.mock("@/lib/email/send", () => ({
  sendTemplateEmail,
}));

import { POST } from "@/app/api/waitlist/route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  insertMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
  sendTemplateEmail.mockReset();
  sendTemplateEmail.mockResolvedValue({ ok: true, sent: true });
});

describe("POST /api/waitlist", () => {
  it("rejects an invalid email without inserting", async () => {
    const res = await POST(request({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("normalizes email and records the landing source", async () => {
    const res = await POST(
      request({
        email: "  Person@Example.com ",
        interest: "home-buying",
        source: "landing",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledWith({
      email: "person@example.com",
      interested_in: ["home-buying"],
      source: "landing",
    });
    expect(sendTemplateEmail).toHaveBeenCalledWith({
      template: "waitlist",
      to: "person@example.com",
    });
  });

  it("rejects unknown interests", async () => {
    const res = await POST(request({ email: "ok@example.com", interest: "crypto" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns ok on a duplicate email so the list cannot be enumerated", async () => {
    insertMock.mockResolvedValue({ error: { code: "23505" } });
    const res = await POST(request({ email: "ok@example.com", source: "waitlist" }));
    expect(res.status).toBe(200);
    expect(sendTemplateEmail).not.toHaveBeenCalled();
  });
});
