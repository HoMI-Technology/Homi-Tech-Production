import { describe, it, expect } from "vitest";

/** CSP report collector: accepts both report shapes and always 204s a beacon. */

async function post(body: unknown, contentType = "application/csp-report") {
  const { POST } = await import("@/app/api/csp-report/route");
  return POST(
    new Request("https://homitechnology.com/api/csp-report", {
      method: "POST",
      headers: {
        "content-type": contentType,
        "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 200)}`,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/csp-report", () => {
  it("accepts a legacy csp-report payload with 204", async () => {
    const res = await post({
      "csp-report": { "violated-directive": "script-src", "blocked-uri": "https://evil.example" },
    });
    expect(res.status).toBe(204);
  });

  it("accepts a Reporting API payload with 204", async () => {
    const res = await post(
      [
        {
          type: "csp-violation",
          body: { effectiveDirective: "img-src", blockedURL: "https://x.example" },
        },
      ],
      "application/reports+json",
    );
    expect(res.status).toBe(204);
  });

  it("never errors on malformed JSON", async () => {
    const res = await post("{not json", "application/csp-report");
    expect(res.status).toBe(204);
  });
});
