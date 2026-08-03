import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * NEXT_PUBLIC_FF_IMPACT_BUS and NEXT_PUBLIC_FF_AGENT_OS are build-time flags:
 * only the exact lowercase string "true" may enable them. Every other value —
 * including truthy-looking ones — must stay off, because an accidentally-on
 * flag would enable the feature in Production.
 */

async function impactBusWithEnv(value: string | undefined): Promise<boolean> {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_FF_IMPACT_BUS", value);
  const { impactBus } = await import("@/lib/flags");
  return impactBus;
}

async function agentOsWithEnv(value: string | undefined): Promise<boolean> {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_FF_AGENT_OS", value);
  const { agentOs } = await import("@/lib/flags");
  return agentOs;
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

describe("agentOs flag", () => {
  it("is enabled only by the exact string 'true'", async () => {
    expect(await agentOsWithEnv("true")).toBe(true);
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
    expect(await agentOsWithEnv(value)).toBe(false);
  });
});
