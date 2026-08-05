import { describe, it, expect, vi } from "vitest";

/**
 * instrumentation-client must LAZY-load @sentry/nextjs (dynamic import inside
 * the DSN guard). A static import ships the whole browser SDK in every
 * route's initial bundle even with no DSN configured — the §11 lighthouse
 * script-budget regression. These tests pin the guard: no DSN → the SDK
 * module is never evaluated; DSN set → it loads and init() runs.
 */

const sdk = vi.hoisted(() => ({ evaluations: 0, init: vi.fn() }));

vi.mock("@sentry/nextjs", () => {
  sdk.evaluations += 1;
  return { init: sdk.init };
});

describe("instrumentation-client (lazy Sentry)", () => {
  it("never evaluates the Sentry SDK when no DSN is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_DSN", "");
    await import("@/instrumentation-client");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sdk.evaluations).toBe(0);
    expect(sdk.init).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("loads and inits the SDK once a DSN is set", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://examplekey@o0.ingest.sentry.io/1");
    await import("@/instrumentation-client");
    await vi.waitFor(() => {
      expect(sdk.init).toHaveBeenCalledTimes(1);
    });
    expect(sdk.init.mock.calls[0][0]).toMatchObject({
      dsn: "https://examplekey@o0.ingest.sentry.io/1",
      tracesSampleRate: 0,
    });
    vi.unstubAllEnvs();
  });
});
