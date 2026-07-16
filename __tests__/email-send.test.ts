import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendTemplateEmail } from "@/lib/email/send";

describe("sendTemplateEmail", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns not_configured when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendTemplateEmail({
      template: "welcome",
      to: "user@example.com",
      params: { name: "Cody" },
    });
    expect(result).toEqual({ ok: true, sent: false, reason: "not_configured" });
  });

  it("sends via Resend when configured", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

    const result = await sendTemplateEmail({
      template: "welcome",
      to: "user@example.com",
      params: { name: "Cody" },
    });

    expect(result).toEqual({ ok: true, sent: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
