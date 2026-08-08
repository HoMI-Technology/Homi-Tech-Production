import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * EMAIL_FROM contract: the default must stay byte-identical to the sender that
 * was hardcoded in the four send paths before centralization, because that
 * address is the one verified on the Resend domain — any drift 403s every send
 * (GO-LIVE-CHECKLIST §1). The env override exists so ops can repoint the
 * sender without a deploy; it must win when set and be ignored when blank.
 */

const CANONICAL = "HōMI <hello@homitechnology.com>";

async function loadEmailFrom(value?: string): Promise<string> {
  vi.resetModules();
  if (value === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = value;
  const mod = await import("@/lib/email/from");
  return mod.EMAIL_FROM;
}

afterEach(() => {
  delete process.env.EMAIL_FROM;
  vi.resetModules();
});

describe("EMAIL_FROM", () => {
  it("defaults to the Resend-verified brand identity when unset", async () => {
    expect(await loadEmailFrom(undefined)).toBe(CANONICAL);
  });

  it("falls back to the default when set but empty", async () => {
    expect(await loadEmailFrom("")).toBe(CANONICAL);
  });

  it("uses the ops override when one is provided", async () => {
    expect(await loadEmailFrom("HōMI <noreply@homitechnology.com>")).toBe(
      "HōMI <noreply@homitechnology.com>",
    );
  });
});
