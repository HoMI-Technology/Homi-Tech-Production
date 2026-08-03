import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * NEXT_PUBLIC_FF_IMPACT_BUS is a build-time flag: only the exact lowercase
 * string "true" may enable the Impact Bus. Every other value — including
 * truthy-looking ones — must stay off, because an accidentally-on flag would
 * enable the feature in Production.
 */

async function impactBusWithEnv(value: string | undefined): Promise<boolean> {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_FF_IMPACT_BUS", value);
  const { impactBus } = await import("@/lib/flags");
  return impactBus;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("impactBus flag", () => {
  it("is enabled only by the exact string 'true'", async () => {
    expect(await impactBusWithEnv("true")).toBe(true);
  });

  it.each([
    ["undefined", undefined],
    ["empty string", ""],
    ["false", "false"],
    ["1", "1"],
    ["TRUE", "TRUE"],
    ["True", "True"],
    ["yes", "yes"],
    [" true (padded)", " true "],
  ])("stays off for %s", async (_label, value) => {
    expect(await impactBusWithEnv(value)).toBe(false);
  });
});
