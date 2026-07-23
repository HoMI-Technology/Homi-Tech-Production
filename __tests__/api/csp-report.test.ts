import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ratelimit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

import { POST } from "@/app/api/csp-report/route";
import { rateLimit } from "@/lib/ratelimit";

const mockRateLimit = vi.mocked(rateLimit);

describe("POST /api/csp-report", () => {
  it("accepts a single CSP report and returns 204", async () => {
    const req = new Request("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: JSON.stringify({
        "csp-report": {
          "violated-directive": "script-src",
          "blocked-uri": "https://evil.com/script.js",
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
  });

  it("accepts a Reporting API array and returns 204", async () => {
    const req = new Request("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/reports+json" },
      body: JSON.stringify([
        {
          body: {
            effectiveDirective: "style-src",
            blockedURL: "https://bad.com/style.css",
          },
        },
      ]),
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
  });

  it("returns 204 even for malformed JSON (never errors a beacon)", async () => {
    const req = new Request("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: "not-json-at-all",
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
  });

  it("returns 204 when rate-limited (silent drop)", async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false });

    const req = new Request("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
  });
});
