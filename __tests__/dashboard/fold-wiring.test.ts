import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRIMARY_CLOSE_LABEL,
  SIGNED_IN_ASSESS_HREF,
} from "@/components/marketing/first-moment-copy";
import { HEADER_MORE_NAV, HEADER_PRIMARY_NAV } from "@/lib/layout/nav-catalog";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

const BANNED_FIRST_RUN = ["Get your Shadow Score", "Take the full assessment"] as const;
const BANNED_FOLD_NOUN = "HōMI-Score";

describe("onboarding skip lands on Home", () => {
  it("Skip for now navigates to the signed-in dashboard", () => {
    const page = src("app", "(product)", "onboarding", "page.tsx");
    expect(page).toContain("useRouter");
    expect(page).toContain("ONBOARDING_SKIP_HREF");
    expect(page).toMatch(/router\.push\(\s*ONBOARDING_SKIP_HREF\s*\)/);
    expect(page).not.toMatch(/\.update\(\s*\{\s*onboarding_completed/);
    expect(page).not.toContain("createClient");
  });

  it("does not attempt an unreachable guest assessment replay", () => {
    const page = src("app", "(product)", "onboarding", "page.tsx");
    expect(page).not.toContain("loadLocalResult");
    expect(page).not.toContain("/api/assessments");
  });
});

describe("dashboard fold tells the truth about the build", () => {
  const page = src("app", "(product)", "dashboard", "page.tsx");
  const fold = src("components", "dashboard", "ThresholdFold.tsx");

  it("names hard stops from the latest assessment", () => {
    expect(page).toContain("hardStopMessages");
    expect(page).toContain("hardStopCodes");
    expect(page).toContain("leadingFoldHardStopCode");
    expect(page).toContain("hard_stops");
    expect(page).toContain("stopCode");
  });

  it("does not celebrate or percent-complete over an active hard stop", () => {
    expect(fold).not.toContain("VerdictCelebrate");
    expect(page).not.toContain("VerdictCelebrate");
  });

  it("uses Decision Readiness Score, never HōMI-Score (DESIGN.md naming law 2026-08-23)", () => {
    const rail = src("components", "score", "ScoreRail.tsx");
    expect(rail).toContain("Decision Readiness Score");
    expect(fold).toContain("Decision Readiness Score");
    expect(fold).not.toContain("ScoreRail");
    expect(page).not.toContain(BANNED_FOLD_NOUN);
    expect(fold).not.toContain(BANNED_FOLD_NOUN);
  });

  it("does not advertise launch-hidden labs on the fold", () => {
    expect(page).not.toMatch(/\/advisor/);
    expect(page).not.toMatch(/\/trinity/);
    expect(page).not.toMatch(/\/genome/);
    expect(page).not.toMatch(/Talk to the Companion/);
    expect(page).not.toMatch(/GenomeWidget/);
  });

  it("offers a draft resume close and fold analytics", () => {
    expect(fold).toContain("ThresholdFoldEmptyClose");
    expect(page).toContain("DashboardFoldBeacon");
    expect(fold).not.toContain("PathNextMove");
    expect(fold).not.toContain("DashboardResumeRamp");
  });

  it("keeps the 30-day outcome prompt off the fold", () => {
    expect(fold).not.toContain("OutcomeSurveyPrompt");
    expect(page).not.toContain("OutcomeSurveyPrompt");
  });

  it("does not surface Companion or a money card on the fold", () => {
    expect(fold).not.toContain("companionFoldLine");
    expect(fold).not.toContain("data-companion-fold-line");
    expect(fold).not.toContain("HomeMoneyStanding");
    expect(fold).not.toContain("CompanionHost");
    expect(fold).not.toContain("CompanionWidget");
    expect(fold).not.toContain("HomieAvatar");
    expect(fold).not.toMatch(/data-companion-chat/);
    expect(fold).not.toContain("/advisor");
    const host = src("components", "companion", "CompanionHost.tsx");
    expect(host).toContain('pathname === "/dashboard"');
  });

  it("locks Companion fold copy to the presence doctrine SSOT", () => {
    const truth = src("lib", "dashboard", "fold-truth.ts");
    expect(truth).toContain("COMPANION_FOLD_LINES");
    expect(truth).toContain(
      "A hard stop is the read right now. The path names what has to move first.",
    );
    expect(truth).toContain(
      "Your next honest move is the binding step on Path to Ready.",
    );
    expect(truth).toContain("You have a read. Path to Ready is the map from here.");
    expect(truth).toContain("One measurement and this page has a build to show.");
    expect(truth).toContain('COMPANION_ESCALATION_HREF = "/advisor"');
  });

  it("does not render the verdict spectrum — hard-stop theater stays off the fold", () => {
    expect(page).not.toContain("DashSpectrum");
    expect(page).not.toContain("shouldPaintDashSpectrum");
    expect(page).not.toMatch(/className="dash-spectrum"/);
    expect(page).not.toMatch(/>\s*Not yet\s*</);
    expect(page).not.toMatch(/>\s*Almost\s*</);
  });

  it("the Threshold Compass is the fold — no card stack, no second compass", () => {
    expect(page).toContain("ThresholdFold");
    expect(fold).toContain("HOME_FOLD_INSTRUMENT");
    expect(fold).toContain("dash-instrument");
    expect(fold).toContain('from "@/components/brand/ThresholdCompass"');
    expect(fold).toContain("data-home-threshold-compass");
    expect(fold).toContain("data-home-fold-score");
    expect(fold).toContain("data-home-fold-runway");
    expect(fold).toContain("data-home-fold-cash");
    expect(fold).toContain("data-path-fold-primary");
    expect(fold).toContain("VerdictBadge");
    expect(fold).toContain("hideTemperature");
    expect(fold).not.toContain("hideTemperature={false}");
    expect(fold).toContain("foldHardStopEyebrow");
    expect(fold).toContain("foldHomeHoldSentence");
    expect(fold).toContain("CASH_EMPTY_LABEL");
    expect(fold).toContain("foldHardStopOverrideLine");
    expect(fold).toContain("stopCode");
    expect(fold).toContain("data-home-fold-score-plate");
    expect(fold).toContain("resolveFoldPathPrimary");
    expect(fold).not.toContain("stopMessages[0]");
    expect(fold).not.toContain("Grow emergency fund toward 3–6 months");
    expect(fold).not.toContain("className=\"eyebrow");
    expect(fold).not.toContain("COLORS.crimson");
    expect(fold).not.toContain("textShadow");
    expect(fold).not.toContain("VERDICT_META");
    expect(fold).not.toContain("35/35/30");
    expect(fold).not.toContain("HomeMoneyStanding");
    expect(fold).not.toContain("ScoreRail");
    expect(fold).not.toContain("HomeMoneyStanding");
    expect(fold).not.toContain("PathStepLedger");
    expect(fold).not.toContain("data-home-build-hero");
    expect(fold).not.toContain("data-home-score-rail");
    expect(fold).not.toContain("HeroScore");
    expect(fold).not.toContain("Your build");
    expect(page).not.toContain("data-dash-shell-compass");
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("PillarRing");
    expect(fold).not.toContain("PillarRing");
    expect(fold).not.toContain("FinancialPositionSection");
    expect(fold).not.toContain("OperateInstrument");
    expect(fold).not.toContain("text-4xl");
    expect(fold).not.toContain("Open Money");
    expect(fold).not.toContain("Connect bank");
  });

  it("Path fold primary is the pending step title — not Mark done or Full path", () => {
    expect(fold).toContain("shownPath.title");
    expect(fold).toContain('data-path-fold-primary=""');
    expect(fold).not.toContain("Mark done");
    expect(fold).not.toContain("Full path");
    expect(fold).not.toContain("Start step");
  });

  it("does not paint a thicker crimson hard-stop frame on the fold", () => {
    const css = src("app", "globals.css");
    const marker = '.dash-instrument[data-threshold-fold][data-hard-stop="1"]';
    expect(css).toContain(marker);
    const from = css.indexOf(marker);
    const foldHardStop = css.slice(from, from + 700);
    expect(foldHardStop).not.toMatch(/#f24822/);
    expect(foldHardStop).not.toMatch(/inset 3px 0 0 0/);
    expect(page).not.toContain("VERDICT_META");
    expect(page).toContain("COLORS.cyan");
  });

  it("Home money strip stays off the fold — runway is instrument evidence", () => {
    const money = src("components", "dashboard", "HomeMoneyStanding.tsx");
    expect(fold).not.toContain("HomeMoneyStanding");
    expect(money).toContain("btn-ghost btn-sm");
    expect(money).not.toMatch(/btn-primary btn-sm/);
    expect(money).not.toContain("text-4xl");
    expect(money).not.toContain("surplusDisplay");
  });

  it("first-screen nav name is HōMI, not Home or Your build", () => {
    const catalog = src("lib", "layout", "nav-catalog.ts");
    expect(catalog).toMatch(/href: "\/dashboard"[\s\S]*label: "HōMI"/);
    expect(catalog).not.toMatch(/href: "\/dashboard"[\s\S]*label: "Home"/);
    expect(fold).not.toContain("Your build");
  });

  it("Money is not in HEADER_PRIMARY_NAV — depth, not a peer home", () => {
    const catalog = src("lib", "layout", "nav-catalog.ts");
    expect(catalog).toContain("HEADER_PRIMARY_NAV");
    expect(catalog).toMatch(
      /href: "\/money"[\s\S]*surfaces: \{ header: "more", palette: true \}/,
    );
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).not.toContain("/money");
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).toContain("/assessment");
    expect(HEADER_MORE_NAV.map((i) => i.href)).toContain("/money");
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).not.toContain("/advisor");
    expect(HEADER_MORE_NAV.map((i) => i.href)).not.toContain("/advisor");
  });

  it("LastReadChrome does not import the client ledger", () => {
    const chrome = src("components", "dashboard", "LastReadChrome.tsx");
    expect(chrome).not.toContain("loadBudgetLedger");
    expect(chrome).not.toContain("local-ledger");
    expect(chrome).not.toContain("metricsFromLedger");
    expect(chrome).not.toContain("useEffect");
    expect(chrome).not.toContain("lastMoney");
  });

  it("does not mount the kitchen-sink body on Home", () => {
    for (const banned of [
      "QuickActionGrid",
      "FinancialPositionSection",
      "ScoreHistory",
      "DecisionTimeline",
      "MetricRail",
      "ActionDock",
      "OperateInstrument",
      "OperateHeroMeta",
    ]) {
      expect(page).not.toContain(banned);
    }
  });
});

describe("completed home assessment lands on Home Build", () => {
  it("FullAssessmentFlow pushes /dashboard, never /results", () => {
    const flow = src("components", "assessment", "FullAssessmentFlow.tsx");
    expect(flow).toContain('router.push("/dashboard")');
    expect(flow).not.toMatch(/router\.push\(["']\/results["']\)/);
  });

  it("ThresholdFold mounts SaveStatusBanner so locked/failed saves still surface", () => {
    const fold = src("components", "dashboard", "ThresholdFold.tsx");
    expect(fold).toContain("SaveStatusBanner");
  });
});

describe("empty Home first-run is one Assess close", () => {
  const empty = src("components", "ui", "EmptyState.tsx");
  const ramp = src("components", "dashboard", "DashboardResumeRamp.tsx");
  const onboarding = src("app", "(product)", "onboarding", "page.tsx");
  const assessment = src("app", "(product)", "assessment", "page.tsx");
  const sidebar = src("components", "layout", "AppSidebar.tsx");

  it("dashboard empty preset is Assess → /assessment with no second CTA", () => {
    const start = empty.indexOf("dashboard:");
    const end = empty.indexOf("signals:", start);
    const preset = empty.slice(start, end);
    expect(preset).toContain("SIGNED_IN_ASSESS_HREF");
    expect(preset).toContain("PRIMARY_CLOSE_LABEL");
    expect(SIGNED_IN_ASSESS_HREF).toBe("/assessment");
    expect(PRIMARY_CLOSE_LABEL).toBe("Assess");
    expect(preset).not.toContain("PRIMARY_CLOSE_HREF");
    expect(preset).not.toContain("secondaryHref");
    expect(preset).not.toContain("secondaryLabel");
    expect(preset).not.toContain("/shadow-score");
    for (const banned of BANNED_FIRST_RUN) {
      expect(preset).not.toContain(banned);
    }
  });

  it("resume ramp uses the signed-in Assess close — never First Moment", () => {
    expect(ramp).toContain('preset="dashboard"');
    expect(ramp).not.toContain("PRIMARY_CLOSE_HREF");
    expect(ramp).not.toContain("secondaryHref");
    expect(ramp).not.toContain("secondaryLabel");
    expect(ramp).not.toContain("/shadow-score");
    for (const banned of BANNED_FIRST_RUN) {
      expect(ramp).not.toContain(banned);
    }
  });

  it("live sidebar mounts the workspace switcher for multi-role users", () => {
    expect(sidebar).toContain("DashboardSwitcher");
    expect(sidebar).toContain("visibleDashboards");
    expect(sidebar).toContain("data-sidebar-workspace-switcher");
  });

  it("employee hub empty close is Assess → /assessment, not Shadow Score", () => {
    const employee = src("app", "(product)", "employee", "dashboard", "page.tsx");
    expect(employee).toContain('actionHref="/assessment"');
    expect(employee).toContain('actionLabel="Assess"');
    expect(employee).not.toContain("Get your Shadow Score");
    expect(employee).not.toContain('actionHref="/shadow-score"');
    expect(employee).not.toContain("ThresholdCompass");
    expect(employee).toContain('href="/path"');
    expect(employee).not.toContain('href: "/plan"');
  });

  it("onboarding and the guest assessment gate do not print those CTAs", () => {
    for (const file of [onboarding, assessment]) {
      expect(file).not.toContain("/shadow-score");
      for (const banned of BANNED_FIRST_RUN) {
        expect(file).not.toContain(banned);
      }
    }
  });
});
