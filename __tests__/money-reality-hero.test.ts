/**
 * Reality surface hero lock — Home + Money Reality redesign, Phase 2.
 *
 * §4.1: /money shows Homie Score + verdict + three pillars as a compact top
 * rail above the Steady Cash instrument; cash stays the dominant number.
 * §7: loading skeleton, no-ledger empty state, thin-evidence banner, Unknown
 * DTI/runway, and bank-lag last-known + updating affordance — exact copy.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const stand = read("components/money/MoneyStand.tsx");
const page = read("app/(product)/money/page.tsx");
const rail = read("components/score/ScoreRail.tsx");

describe("Reality top rail (score + verdict + pillars)", () => {
  it("page hands the latest completed assessment to MoneyStand server-side", () => {
    expect(page).toContain("getCachedUser");
    expect(page).toContain('.from("assessments")');
    expect(page).toContain('.eq("status", "completed")');
    expect(page).toContain("ScoreRailReading");
    expect(page).toMatch(/<MoneyStand readiness=\{readiness\} \/>/);
  });

  it("MoneyStand mounts the shared compact ScoreRail above the cash instrument", () => {
    expect(stand).toContain('import { ScoreRail, type ScoreRailReading } from "@/components/score/ScoreRail"');
    expect(stand).toContain('variant="compact"');
    // Main return: rail sits above the OperateInstrument cash hero.
    const mainRailIdx = stand.lastIndexOf("{scoreRail}");
    expect(mainRailIdx).toBeGreaterThan(-1);
    expect(mainRailIdx).toBeLessThan(stand.indexOf("<OperateInstrument"));
    // Loading return: rail renders even while the on-device ledger hydrates.
    const loadingIdx = stand.indexOf('aria-busy="true"');
    expect(stand.indexOf("{scoreRail}", loadingIdx)).toBeGreaterThan(loadingIdx);
  });

  it("no assessment renders an honest Unknown rail with the Assess close", () => {
    expect(stand).toContain("Unknown until your first assessment.");
    expect(stand).toContain('href="/assessment"');
    expect(stand).toContain("Decision Readiness Score Unknown");
  });

  it("ScoreRail composes locked primitives — never a new orb or compass", () => {
    expect(rail).toContain("PillarRing");
    expect(rail).toContain("VerdictBadge");
    expect(rail).toContain("PILLAR_MAX_POINTS");
    expect(rail).not.toContain("ThresholdCompass");
    // Companion card-highlight hook stays intact through the extraction.
    expect(rail).toContain("data-home-verdict");
  });
});

describe("Reality states — exact copy contract (§7)", () => {
  it("no-ledger empty state uses the locked copy", () => {
    expect(stand).toContain("No picture yet. Open Ledger or connect a bank to begin.");
  });

  it("low-completeness thin-evidence banner uses the locked copy", () => {
    expect(stand).toContain("Partial picture — more evidence makes the reading honest.");
    // Numbers stay labeled as drafts under thin evidence.
    expect(stand).toMatch(/Treat every number as a\s+draft/);
  });

  it("unknown DTI and runway render Unknown, never an invented number", () => {
    expect(stand).toMatch(/debtHonest && dti != null[\s\S]*?"Unknown"/);
    expect(stand).toMatch(/runwayMonths != null[\s\S]*?"Unknown"/);
  });

  it("bank lag shows last-known + updating affordance", () => {
    expect(stand).toContain("Bank linked");
    expect(stand).toContain("pendingTransactionCount");
    expect(stand).toMatch(/Last-known · .*pending — updates as\s+they post/);
  });

  it("loading skeleton is preserved and busies the surface", () => {
    expect(stand).toContain("animate-pulse");
    expect(stand).toContain('aria-busy="true"');
  });

  it("educational posture stays on the money surface", () => {
    expect(stand).toMatch(/educational/i);
    expect(stand).toMatch(/not provide financial, tax, mortgage, or investment/i);
  });

  it("respects prefers-reduced-motion on the linked pulse", () => {
    expect(stand).toContain("motion-safe:animate-pulse");
  });
});
