import { describe, it, expect, beforeEach } from "vitest";

/**
 * /api/cron/lifecycle auth contract: fails closed without CRON_SECRET, rejects
 * bad bearer tokens, and degrades gracefully (200, skipped) when the service
 * role isn't configured — a cron that 500s forever on a fresh env would page
 * the owner about nothing.
 */

async function call(headers: Record<string, string> = {}) {
  const { GET } = await import("@/app/api/cron/lifecycle/route");
  return GET(new Request("https://homitechnology.com/api/cron/lifecycle", { headers }));
}

beforeEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("GET /api/cron/lifecycle", () => {
  it("fails closed when CRON_SECRET is unset", async () => {
    const res = await call({ authorization: "Bearer anything" });
    expect(res.status).toBe(401);
  });

  it("rejects a wrong bearer token", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await call({ authorization: "Bearer wrong" });
    expect(res.status).toBe(401);
  });

  it("degrades gracefully when the service role is not configured", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await call({ authorization: "Bearer s3cret" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; skipped?: string };
    expect(json.ok).toBe(false);
    expect(json.skipped).toBe("no_service_role");
  });
});
