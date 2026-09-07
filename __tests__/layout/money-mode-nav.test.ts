/**
 * Five-mode Money nav labels, hrefs, and path folding stay the catalog contract.
 * Source-lock of ProductBottomNav / layout mounts lives in T3 policy.
 */
import { describe, expect, it } from "vitest";
import { MONEY_MODES, modeFromPath } from "@/components/money/MoneyModeNav";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("five-mode navigation", () => {
  it("MONEY_MODES is exactly the five canonical tabs, in order", () => {
    expect(MONEY_MODES.map((m) => m.label)).toEqual([
      "Readiness",
      "Reality",
      "Decide",
      "Plan",
      "Goals",
    ]);
    expect(MONEY_MODES.map((m) => [m.id, m.href])).toEqual([
      ["readiness", "/dashboard"],
      ["reality", "/money"],
      ["decide", "/money/decide"],
      ["plan", "/money/plan"],
      ["goals", "/money/goals"],
    ]);
  });

  it("retired peer tabs fold into Reality without killing deep links", () => {
    expect(modeFromPath("/money/budget")).toBe("reality");
    expect(modeFromPath("/money/investments")).toBe("reality");
    expect(modeFromPath("/money")).toBe("reality");
    expect(modeFromPath("/money/decide")).toBe("decide");
    expect(modeFromPath("/money/plan")).toBe("plan");
    expect(modeFromPath("/money/goals")).toBe("goals");
    expect(modeFromPath("/dashboard")).toBe("readiness");
    expect(modeFromPath("/settings")).toBeNull();
    expect(modeFromPath("/journal")).toBeNull();
  });

  it("carries the locked spec microcopy as tooltips", () => {
    const blurbs = Object.fromEntries(MONEY_MODES.map((m) => [m.id, m.blurb]));
    expect(blurbs.readiness).toBe("Where you stand across the three pillars");
    expect(blurbs.reality).toBe("The picture of your cash, as it actually is");
    expect(blurbs.decide).toBe("Stress the decision before you stretch");
    expect(blurbs.plan).toBe("The path that turns readiness into action");
    expect(blurbs.goals).toBe("What you’re building toward, and how far");
  });

  it("is not mounted as a primary rail or MoneyShell tab wall", () => {
    const shell = read("components/money/MoneyShell.tsx");
    const header = read("components/layout/AppHeader.tsx");
    expect(shell).not.toContain("MoneyModeNav");
    expect(header).not.toContain("MoneyModeNav");
    expect(header).not.toContain("MONEY_MODES");
  });
});
