import { describe, it, expect, vi } from "vitest";

/**
 * Open-redirect regression test for GET /auth/callback (ported from
 * origin/feat/security-hardening 4324ce4): a crafted ?next=//evil.com must
 * collapse to the in-app fallback and never become an off-site Location.
 * Supabase + email side effects are mocked so the handler runs in isolation.
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

describe("GET /auth/callback — open-redirect guard", () => {
  it("redirects ?next=//evil.com to the in-app fallback, never off-site", async () => {
    const res = await GET(new Request("http://localhost/auth/callback?next=//evil.com"));
    const location = res.headers.get("location") ?? "";
    expect(location).toBe("http://localhost/dashboard");
    expect(location).not.toContain("evil.com");
  });

  it("sanitizes next on the code-exchange path too", async () => {
    const res = await GET(
      new Request("http://localhost/auth/callback?code=abc123&next=//evil.com"),
    );
    const location = res.headers.get("location") ?? "";
    expect(location).toBe("http://localhost/dashboard");
    expect(location).not.toContain("evil.com");
  });

  it("blocks absolute-URL and backslash variants", async () => {
    for (const payload of ["https://evil.com", "/\\evil.com", "/%2fevil.com"]) {
      const res = await GET(
        new Request(`http://localhost/auth/callback?next=${encodeURIComponent(payload)}`),
      );
      expect(res.headers.get("location")).toBe("http://localhost/dashboard");
    }
  });

  it("passes a legit in-app next through unchanged", async () => {
    const res = await GET(new Request("http://localhost/auth/callback?next=/report/123"));
    expect(res.headers.get("location")).toBe("http://localhost/report/123");
  });

  it("falls back to /dashboard when next is absent", async () => {
    const res = await GET(new Request("http://localhost/auth/callback"));
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });
});
