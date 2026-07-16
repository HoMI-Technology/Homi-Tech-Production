import { describe, it, expect, vi } from "vitest";

describe("instrumentation (Sentry scaffold)", () => {
  it("register() resolves without SENTRY_DSN (no-op path never throws)", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const mod = await import("@/instrumentation");
    await expect(mod.register()).resolves.toBeUndefined();
    expect(typeof mod.onRequestError).toBe("function");
    vi.unstubAllEnvs();
  });
});
