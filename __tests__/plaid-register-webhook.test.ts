import { describe, it, expect, afterEach, vi } from "vitest";
import { registerItemWebhook } from "@/lib/plaid/register-webhook";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registerItemWebhook", () => {
  it("POSTs /item/webhook/update with the access token and webhook URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const ok = await registerItemWebhook(
      "access-sandbox-token",
      { clientId: "cid", secret: "sec", env: "sandbox" },
      "https://homitechnology.com/api/plaid/webhook",
    );

    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/item/webhook/update");
    const body = JSON.parse(String(init?.body));
    expect(body.access_token).toBe("access-sandbox-token");
    expect(body.webhook).toBe("https://homitechnology.com/api/plaid/webhook");
  });

  it("returns false when Plaid rejects so sync can continue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 400 })));
    const ok = await registerItemWebhook(
      "access-sandbox-token",
      { clientId: "cid", secret: "sec", env: "sandbox" },
      "https://homitechnology.com/api/plaid/webhook",
    );
    expect(ok).toBe(false);
  });
});
