/**
 * Home money standing is Path evidence dashes — never a verdict or surplus claim.
 */
import { describe, expect, it } from "vitest";
import { buildHomeMoneyStandingView } from "@/lib/dashboard/home-money-standing";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";

const lastMoney = (partial: Partial<LastReadMoneyInputs> = {}): LastReadMoneyInputs => ({
  debtToIncomeRatio: 0.61,
  emergencyFundMonths: 0.4,
  savingsRate: 0.02,
  liquidDollars: 1200,
  ...partial,
});

describe("buildHomeMoneyStandingView", () => {
  it("empty picture is Path evidence dashes — not a verdict or surplus", () => {
    const view = buildHomeMoneyStandingView({
      lastMoney: null,
      hardStopFlags: [],
      bankLinked: false,
    });
    expect(view.status).toBe("empty");
    expect(view.runwayMonths).toBeNull();
    expect(view.liquidDollars).toBeNull();
    expect(view.hardStopFlags).toEqual([]);
    expect(view.primaryHref).toBe("/money/budget");
    expect(view.secondaryHref).toBe("/connections");
    expect(view.standingLine).not.toMatch(/76|surplus|verdict/i);
  });

  it("ready picture surfaces last-read runway, liquid, and hard-stop flags", () => {
    const view = buildHomeMoneyStandingView({
      lastMoney: lastMoney(),
      hardStopFlags: ["Emergency runway is under 1 month."],
      bankLinked: false,
    });
    expect(view.status).toBe("ready");
    expect(view.runwayMonths).toBe(0.4);
    expect(view.liquidDollars).toBe(1200);
    expect(view.hardStopFlags).toEqual(["Emergency runway is under 1 month."]);
    expect(view.standingLine).toMatch(/Emergency runway is under 1 month/i);
    expect(view.primaryHref).toBe("/money");
    expect(view.secondaryHref).toBe("/connections");
  });

  it("linked bank points Decide as the secondary depth CTA", () => {
    const view = buildHomeMoneyStandingView({
      lastMoney: lastMoney({ emergencyFundMonths: 4 }),
      hardStopFlags: [],
      bankLinked: true,
    });
    expect(view.secondaryHref).toBe("/money/decide");
    expect(view.standingLine).toMatch(/runway covers about 4/i);
  });
});
