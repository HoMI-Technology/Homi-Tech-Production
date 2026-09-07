/**
 * PR3 — Stand / Plan / Decide / More on live routes only.
 * Depth chrome + honesty. No new URLs. No invented rail labels.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HEADER_MORE_NAV, HEADER_PRIMARY_NAV, NAV_CATALOG } from "@/lib/layout/nav-catalog";
import { MAX_PATH_STEPS } from "@/lib/readiness";
import { hubLenses as toolHubLenses } from "@/lib/tools/registry";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const stand = read("components/money/MoneyStand.tsx");
const moneyPage = read("app/(product)/money/page.tsx");
const moneyShell = read("components/money/MoneyShell.tsx");
const pathPage = read("app/(product)/path/page.tsx");
const workbench = read("components/readiness/PathWorkbench.tsx");
const toolsHub = read("app/(product)/tools/page.tsx");
const decide = read("components/money/MoneyDecideHub.tsx");
const header = read("components/layout/AppHeader.tsx");
const fold = read("components/dashboard/ThresholdFold.tsx");
const band = read("components/tools/ReadinessBand.tsx");
const planChecklist = read("app/(product)/plan/page.tsx");
const moneyPlan = read("components/planner/plan/PlanCommand.tsx");

describe("CEO chrome defaults 1–7 (founder skipped picker)", () => {
  it("1 depth-only: jobs stay on live routes — no new URLs", () => {
    for (const href of ["/stand", "/decide", "/more"]) {
      expect(existsSync(resolve(process.cwd(), `app/(product)${href}/page.tsx`))).toBe(false);
    }
    expect(existsSync(resolve(process.cwd(), "app/(product)/path/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/(product)/money/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/(product)/tools/page.tsx"))).toBe(true);
    expect(pathPage).toContain('job="path"');
    expect(stand).toContain("Stand job on live `/money`");
    expect(toolsHub).toContain("Decide job primary surface");
  });

  it("2 More is a ··· drawer — not a peer home or /more URL", () => {
    expect(header).toContain("data-more-drawer");
    expect(header).toContain("data-more-backdrop");
    expect(header).toContain('aria-label="More"');
    expect(NAV_CATALOG.some((e) => e.href === "/more")).toBe(false);
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).not.toContain("/more");
  });

  it("3 Path SSOT stays on /path, separate from Money plan/budget", () => {
    expect(pathPage).toContain("PathWorkbench");
    expect(pathPage).toContain("Budget and goals stay depth");
    expect(moneyPlan).toContain("Money plan · depth");
    expect(existsSync(resolve(process.cwd(), "app/(product)/money/budget/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/(product)/money/plan/page.tsx"))).toBe(true);
  });

  it("4 Decide primary is /tools; /money/decide stays supporting", () => {
    expect(toolsHub).toContain("hubLenses");
    expect(toolsHub).toContain("not a score write");
    expect(decide).toContain('href="/tools"');
    expect(decide).toContain("does not write AssessmentResult");
  });

  it("5 Steady / Clarity / Horizon stay where those labels already apply", () => {
    const companion = read("components/companion/CompanionWidget.tsx");
    expect(companion).toContain("Steady / Clarity / Horizon only");
    expect(companion).toMatch(/Steady, Clarity, or Horizon/);
    expect(HEADER_PRIMARY_NAV.map((i) => i.label)).not.toEqual(
      expect.arrayContaining(["Stand", "Plan", "Decide", "More"]),
    );
  });

  it("6 Trinity stays launch-hidden — not More or primary chrome", () => {
    expect(HEADER_MORE_NAV.map((i) => i.href)).not.toContain("/trinity");
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).not.toContain("/trinity");
    expect(NAV_CATALOG.find((e) => e.href === "/trinity")?.surfaces.palette).toBe(false);
  });

  it("7 Home verdict fold stays visible — jobs do not replace ThresholdFold", () => {
    expect(fold).toContain("data-home-verdict");
    expect(moneyPage).not.toContain("ThresholdFold");
    expect(pathPage).not.toContain("ThresholdFold");
    expect(toolsHub).not.toContain("ThresholdFold");
  });
});

describe("PR3 topology — live routes only", () => {
  it("does not invent /stand /plan /decide /more product URLs", () => {
    for (const href of ["/stand", "/decide", "/more"]) {
      expect(NAV_CATALOG.some((e) => e.href === href)).toBe(false);
      expect(existsSync(resolve(process.cwd(), `app/(product)${href}/page.tsx`))).toBe(false);
    }
    expect(existsSync(resolve(process.cwd(), "app/(product)/path/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/(product)/plan/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/(product)/money/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/(product)/money/decide/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/(product)/tools/page.tsx"))).toBe(true);
  });

  it("does not invent Stand / Plan / Decide / More as primary rail labels", () => {
    const primaryLabels = HEADER_PRIMARY_NAV.map((i) => i.label);
    const moreLabels = HEADER_MORE_NAV.map((i) => i.label);
    for (const label of ["Stand", "Plan", "Decide", "More"]) {
      expect(primaryLabels).not.toContain(label);
      expect(moreLabels).not.toContain(label);
    }
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).not.toContain("/money");
  });

  it("keeps Path SSOT on /path separate from Money plan/budget", () => {
    expect(pathPage).toContain('job="path"');
    expect(pathPage).toContain("PathWorkbench");
    expect(moneyPlan).toContain("Money plan · depth");
    expect(moneyPlan).not.toMatch(/pulse the Decision Readiness Score/);
    expect(existsSync(resolve(process.cwd(), "app/(product)/money/budget/page.tsx"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "app/(product)/money/plan/page.tsx"))).toBe(true);
  });
});

describe("PR3 Stand — /money empty honesty, no theater", () => {
  it("empty state uses connect-accounts honesty", () => {
    expect(stand).toContain("Connect accounts to see money reality");
    expect(stand).toContain("Ledger truth lives here when accounts are real. No estimated net worth.");
    expect(stand).toContain("Connect accounts");
    expect(stand).toContain("Record manually");
    expect(stand).toContain('href="/connections"');
    expect(stand).toContain('href="/money/budget"');
  });

  it("data state is quiet facts under the verdict — no surplus hero or score rail", () => {
    expect(stand).toContain("Your money picture");
    expect(stand).toContain("Facts under the verdict");
    expect(stand).toContain("Liquid cash");
    expect(stand).toContain("Emergency runway");
    expect(stand).toContain("Flags");
    expect(stand).toContain("Score history · age as evidence");
    expect(stand).not.toContain("ScoreRail");
    expect(stand).not.toContain("OperateInstrument");
    expect(stand).not.toContain("AnimatedNumber");
    expect(stand).not.toContain("ThresholdCompass");
    expect(stand).not.toContain("font-display");
    expect(stand).not.toContain("text-6xl");
    expect(stand).not.toContain("text-7xl");
    expect(moneyPage).not.toContain("ScoreRail");
    expect(moneyPage).not.toContain("from(\"assessments\")");
  });

  it("MoneyShell does not paint a Decide/Plan mode rail", () => {
    expect(moneyShell).not.toContain("MoneyModeNav");
    expect(moneyShell).toContain("JobDepthFrame");
  });
});

describe("PR3 Plan — Path workbench max 7", () => {
  it("Path to Ready title, max 7, one next step, no body compass", () => {
    expect(pathPage).toContain("Path to Ready");
    expect(pathPage).toContain("MAX_PATH_STEPS");
    expect(MAX_PATH_STEPS).toBe(7);
    expect(pathPage).not.toContain("ThresholdCompass");
    expect(pathPage).not.toContain("PathProgressHero");
    expect(pathPage).not.toContain("font-display");
    expect(workbench).toContain("Next step");
    expect(workbench).toContain("slice(0, MAX_PATH_STEPS)");
    expect(workbench).toContain("/money/budget");
    expect(workbench).toContain("/money/plan");
    expect(workbench).toContain('href="/plan"');
  });

  it("checklist stays reachable depth without a body compass", () => {
    expect(planChecklist).not.toContain("ThresholdCompass");
    expect(planChecklist).toContain("Readiness checklist");
    expect(planChecklist).toContain('href="/path"');
  });
});

describe("PR3 Decide — /tools primary, no score write", () => {
  it("tools hub is ten equal-weight lenses with honesty", () => {
    expect(toolHubLenses()).toHaveLength(10);
    expect(toolsHub).toContain("hubLenses");
    expect(toolsHub).toContain("Educational estimates");
    expect(toolsHub).toContain("not a score write");
    expect(toolsHub).toContain("Open lens");
    expect(toolsHub).not.toContain("hubLensesByRing");
    expect(toolsHub).not.toContain("font-display");
    expect(toolsHub).not.toContain("ThresholdCompass");
  });

  it("/money/decide stays supporting and does not write a score", () => {
    expect(decide).toContain('data-money-job="decide"');
    expect(decide).toContain('href="/tools"');
    expect(decide).toContain("does not write AssessmentResult");
    expect(decide).not.toContain("/api/assessments");
    expect(decide).not.toContain("/api/scoring");
    expect(decide).not.toContain("Apply-to-my-score");
    expect(band).toContain("does not write");
    expect(band).not.toContain('href="/simulator"');
    expect(band).not.toContain("Score Simulator");
  });
});

describe("PR3 More — demoted drawer, not a peer home", () => {
  it("groups Build / Care / Account on live routes", () => {
    expect(header).toContain("data-more-drawer");
    expect(header).toContain('data-more-group={group.id}');
    expect(header).toContain('data-more-group="account"');
    expect(HEADER_MORE_NAV.map((i) => i.href).sort()).toEqual(
      ["/connections", "/household", "/journal", "/money", "/path", "/timeline", "/trust"].sort(),
    );
    expect(HEADER_MORE_NAV.map((i) => i.label)).toContain("Trust & privacy");
    expect(HEADER_MORE_NAV.map((i) => i.href)).not.toContain("/tools/preflight");
    expect(HEADER_MORE_NAV.map((i) => i.href)).not.toContain("/scenarios");
    expect(HEADER_MORE_NAV.map((i) => i.href)).not.toContain("/trinity");
    expect(HEADER_MORE_NAV.map((i) => i.href)).not.toContain("/advisor");
    expect(NAV_CATALOG.some((e) => e.label === "Companion")).toBe(false);
  });

  it("Trinity / Genome / Twin / Simulator stay off More chrome", () => {
    const moreHrefs = HEADER_MORE_NAV.map((i) => i.href);
    for (const href of ["/trinity", "/genome", "/twin", "/simulator"]) {
      expect(moreHrefs).not.toContain(href);
    }
  });
});

describe("PR3 Home verdict fold stays visible", () => {
  it("does not hide or replace ThresholdFold verdict chrome", () => {
    expect(fold).toContain("data-home-verdict");
    expect(moneyPage).not.toContain("ThresholdFold");
    expect(pathPage).not.toContain("ThresholdFold");
    expect(toolsHub).not.toContain("ThresholdFold");
  });
});
