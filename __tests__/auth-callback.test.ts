import { describe, it, expect, vi } from "vitest";

/**
 * Open-redirect regression test for GET /auth/callback.
 * PR15: destination is always `/` — even a legit `?next=` cannot leave landing.
 */

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: async () => ({ data: { user: null } }) },
  }),
}));

vi.mock("@/lib/email/lifecycle", () => ({
  maybeSendWelcomeEmail: async () => {},
}));

import { GET } from "@/app/auth/callback/route";

describe("GET /auth/callback — always `/` (PR15)", () => {
  it("redirects ?next=//evil.com to `/`, never off-site", async () => {
    const res = await GET(new Request("http://localhost/auth/callback?next=//evil.com"));
    const location = res.headers.get("location") ?? "";
    expect(location).toBe("http://localhost/");
    expect(location).not.toContain("evil.com");
  });

  it("sanitizes next on the code-exchange path too", async () => {
    const res = await GET(
      new Request("http://localhost/auth/callback?code=abc123&next=//evil.com"),
    );
    const location = res.headers.get("location") ?? "";
    expect(location).toBe("http://localhost/");
    expect(location).not.toContain("evil.com");
  });

  it("blocks absolute-URL and backslash variants", async () => {
    for (const payload of ["https://evil.com", "/\\evil.com", "/%2fevil.com"]) {
      const res = await GET(
        new Request(`http://localhost/auth/callback?next=${encodeURIComponent(payload)}`),
      );
      expect(res.headers.get("location")).toBe("http://localhost/");
    }
  });

  it("ignores a legit in-app next and still lands on `/`", async () => {
    const res = await GET(new Request("http://localhost/auth/callback?next=/report/123"));
    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("honors KEEP password-reset next so recovery links still work", async () => {
    const res = await GET(
      new Request("http://localhost/auth/callback?next=/auth/reset-password"),
    );
    expect(res.headers.get("location")).toBe("http://localhost/auth/reset-password");
  });

  it("routes to `/` when next is absent", async () => {
    const res = await GET(new Request("http://localhost/auth/callback"));
    expect(res.headers.get("location")).toBe("http://localhost/");
  });
});
