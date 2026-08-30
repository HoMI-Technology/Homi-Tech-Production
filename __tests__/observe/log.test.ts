/**
 * Structured observe logs emit one JSON line and strip secret fields.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { logEvent } from "@/lib/observe/log";

describe("logEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes one JSON object with event, requestId, and route", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logEvent({
      event: "household_invite_failed",
      requestId: "req-1",
      route: "POST /api/household/invite",
      status: 402,
      code: "household_locked",
    });
    expect(info).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      event: "household_invite_failed",
      requestId: "req-1",
      route: "POST /api/household/invite",
      status: 402,
      code: "household_locked",
      level: "info",
    });
    expect(JSON.stringify(payload)).not.toMatch(/token|email|authorization/i);
  });

  it("uses console.error for error level", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logEvent({
      event: "household_create_failed",
      level: "error",
      requestId: "req-2",
      route: "POST /api/household",
      status: 500,
    });
    expect(error).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(error.mock.calls[0]?.[0])) as {
      level: string;
    };
    expect(payload.level).toBe("error");
  });

  it("strips reserved secret fields even if a caller passes them", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logEvent({
      event: "household_invite_created",
      requestId: "req-3",
      route: "POST /api/household/invite",
      token: "super-secret-invite-token",
      email: "partner@example.com",
    } as never);
    const line = String(info.mock.calls[0]?.[0]);
    expect(line).not.toContain("super-secret-invite-token");
    expect(line).not.toContain("partner@example.com");
  });
});
