import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { GET } from "@/app/api/healthcheck/route";
import { createClient } from "@/lib/supabase/server";

const mockCreateClient = vi.mocked(createClient);

describe("GET /api/healthcheck", () => {
  it("returns 200 with ok=true when database is reachable", async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      ok: boolean;
      database: "ok" | "error";
      latencyMs: number;
      time: string;
      version: string;
    };

    expect(json.ok).toBe(true);
    expect(json.database).toBe("ok");
    expect(typeof json.latencyMs).toBe("number");
    expect(typeof json.time).toBe("string");
    expect(typeof json.version).toBe("string");
  });

  it("returns 503 with ok=false when database is unreachable", async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          error: { message: "connection refused" },
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET();
    expect(res.status).toBe(503);

    const json = (await res.json()) as {
      ok: boolean;
      database: "ok" | "error";
    };

    expect(json.ok).toBe(false);
    expect(json.database).toBe("error");
  });
});
