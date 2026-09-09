import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

/**
 * CEO wave chrome locks — customer-visible launch surfaces must not advertise
 * Homie or the launch-hidden labs. Routes stay; fillers come off the body.
 */
describe("launch chrome locks", () => {
  it("keeps lab routes (do not delete — only hide from customer chrome)", () => {
    for (const rel of [
      "app/(product)/advisor/page.tsx",
      "app/(product)/calendar/page.tsx",
      "app/(product)/signals/page.tsx",
      "app/(product)/trinity/page.tsx",
      "app/(product)/genome/page.tsx",
      "app/(product)/daily/page.tsx",
      "app/(product)/simulator/page.tsx",
    ]) {
      expect(existsSync(resolve(process.cwd(), rel)), rel).toBe(true);
    }
  });

  it("Money Stand has no Ask Homie /advisor launcher", () => {
    const stand = read("components/money/MoneyStand.tsx");
    expect(stand).not.toMatch(/Ask Homie/);
    expect(stand).not.toMatch(/\/advisor/);
  });

  it("dashboard next-move and featured actions do not launch /advisor", () => {
    const dash = read("app/(product)/dashboard/page.tsx");
    const actions = read("lib/dashboard/context-actions.ts");
    expect(dash).not.toMatch(/Talk to the Companion/);
    expect(dash).not.toMatch(/\/advisor/);
    expect(actions).not.toMatch(/\/advisor/);
  });

  it("ThresholdFold-era Home leftovers stay unmounted (do not restore)", () => {
    for (const rel of [
      "components/dashboard/HomeFold.tsx",
      "components/dashboard/PathNextMove.tsx",
      "components/dashboard/DashSpectrum.tsx",
      "components/dashboard/GenomeWidget.tsx",
      "components/dashboard/DecisionTimeline.tsx",
      "components/dashboard/FinancialPositionSection.tsx",
      "components/dashboard/BankConnectCard.tsx",
      "components/dashboard/ConnectionsTile.tsx",
      "components/dashboard/GoalCard.tsx",
      "components/dashboard/PathStepLedger.tsx",
      "components/dashboard/ScoreDeltaBadge.tsx",
      "components/dashboard/TrinityGapAlert.tsx",
      "components/dashboard/VerdictCelebrate.tsx",
      "components/dashboard/HeroScore.tsx",
      "components/dashboard/QuickActionGrid.tsx",
      "components/dashboard/LastReadChrome.tsx",
      "components/dashboard/HomeMoneyStanding.tsx",
      "components/dashboard/HomeMoneyRecheck.tsx",
      "components/dashboard/DashboardResumeRamp.tsx",
      "components/score/ScoreRail.tsx",
    ]) {
      expect(existsSync(resolve(process.cwd(), rel)), rel).toBe(false);
    }
  });

  it("dashboard body has no Signals / Trinity / Genome / Daily / Simulator fillers", () => {
    const dash = read("app/(product)/dashboard/page.tsx");
    expect(dash).not.toMatch(/TrinityGapAlert/);
    expect(dash).not.toMatch(/GenomeWidget/);
    expect(dash).not.toMatch(/DailyPulseStrip/);
    expect(dash).not.toMatch(/Daily pulse/);
    expect(dash).not.toMatch(/Daily check-in/);
    expect(dash).not.toMatch(/\/signals/);
    expect(dash).not.toMatch(/\/trinity/);
    expect(dash).not.toMatch(/\/genome/);
    expect(dash).not.toMatch(/\/daily/);
    expect(dash).not.toMatch(/\/simulator/);
  });

  it("path footer has no Calendar → /calendar", () => {
    const path = read("app/(product)/path/page.tsx");
    expect(path).not.toMatch(/href=["']\/calendar["']/);
  });
});
