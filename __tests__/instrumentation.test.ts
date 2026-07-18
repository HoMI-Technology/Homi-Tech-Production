import { describe, it, expect, vi } from "vitest";

describe("instrumentation (Sentry scaffold)", () => {
  // Dynamic import of @sentry/nextjs configs can exceed the default 5s under
  // full-suite load (cold transform of the Sentry package); the no-op path
  // itself is synchronous once modules resolve.
  it(
    "register() resolves without SENTRY_DSN (no-op path never throws)",
    async () => {
      vi.stubEnv("NEXT_RUNTIME", "nodejs");
      const mod = await import("@/instrumentation");
      await expect(mod.register()).resolves.toBeUndefined();
      expect(typeof mod.onRequestError).toBe("function");
      vi.unstubAllEnvs();
    },
    15_000,
  );
});
