import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
} from "@/components/marketing/first-moment-copy";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

const BANNED_FIRST_RUN = ["Get your Shadow Score", "Take the full assessment"] as const;
const BANNED_FOLD_NOUN = "Decision Readiness Score";

describe("onboarding skip lands on Home", () => {
  it("Skip for now navigates to the signed-in dashboard after save", () => {
    const page = src("app", "(product)", "onboarding", "page.tsx");
    expect(page).toContain("useRouter");
    expect(page).toContain("ONBOARDING_SKIP_HREF");
    expect(page).toContain("finish(ONBOARDING_SKIP_HREF)");
    expect(page).toMatch(/router\.push\(\s*next\s*\)/);
  });
});

describe("dashboard fold tells the truth about the build", () => {
  const page = src("app", "(product)", "dashboard", "page.tsx");
  const fold = src("components", "dashboard", "HomeFold.tsx");

  it("names hard stops from the latest assessment", () => {
    expect(page).toContain("hardStopMessages");
    expect(page).toContain("hard_stops");
  });

  it("does not celebrate or percent-complete over an active hard stop", () => {
    expect(page).toContain("shouldSuppressBuildPercent");
    expect(fold).toContain("VerdictCelebrate");
    expect(fold).toMatch(/!suppressBuildPercent[\s\S]*VerdictCelebrate/);
  });

  it("uses HōMI-Score, never Decision Readiness Score", () => {
    expect(fold).toContain("HōMI-Score");
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

  it("offers a draft resume ramp and fold analytics", () => {
    expect(fold).toContain("DashboardResumeRamp");
    expect(fold).toContain("PathNextMove");
    expect(page).toContain("DashboardFoldBeacon");
  });

  it("keeps the existing outcome prompt below Path — no second Home card", () => {
    expect(fold).toContain("<OutcomeSurveyPrompt");
    expect(fold.indexOf("<PathNextMove")).toBeLessThan(fold.indexOf("<OutcomeSurveyPrompt"));
    expect(page).not.toContain("OutcomeSurveyPrompt");
  });

  it("does not render the verdict spectrum — hard-stop theater stays off the fold", () => {
    expect(page).toContain("shouldSuppressBuildPercent");
    expect(page).not.toContain("DashSpectrum");
    expect(page).not.toContain("shouldPaintDashSpectrum");
    expect(page).not.toMatch(/className="dash-spectrum"/);
    expect(page).not.toMatch(/>\s*Not yet\s*</);
    expect(page).not.toMatch(/>\s*Almost\s*</);
  });

  it("keeps one fold instrument and does not dual-mount compass + hero", () => {
    expect(page).toContain("HomeFold");
    expect(fold).toContain("HOME_FOLD_INSTRUMENT");
    expect(fold).toContain("HeroScore");
    expect(fold).not.toContain("ThresholdCompass");
    expect(page).not.toContain("ThresholdCompass");
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("PillarRing");
    expect(fold).not.toContain("PillarRing");
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

describe("completed home assessment lands on Results", () => {
  it("FullAssessmentFlow pushes /results, never /dashboard", () => {
    const flow = src("components", "assessment", "FullAssessmentFlow.tsx");
    expect(flow).toContain('router.push("/results")');
    expect(flow).not.toMatch(/router\.push\(["']\/dashboard["']\)/);
  });
});

describe("empty Home first-run is one Assess close", () => {
  const empty = src("components", "ui", "EmptyState.tsx");
  const ramp = src("components", "dashboard", "DashboardResumeRamp.tsx");
  const onboarding = src("app", "(product)", "onboarding", "page.tsx");
  const assessment = src("app", "(product)", "assessment", "page.tsx");

  it("dashboard empty preset is Assess → First Moment with no second CTA", () => {
    const start = empty.indexOf("dashboard:");
    const end = empty.indexOf("signals:", start);
    const preset = empty.slice(start, end);
    expect(preset).toContain("PRIMARY_CLOSE_HREF");
    expect(preset).toContain("PRIMARY_CLOSE_LABEL");
    expect(PRIMARY_CLOSE_HREF).toBe("/first-moment");
    expect(PRIMARY_CLOSE_LABEL).toBe("Assess");
    expect(preset).not.toContain("secondaryHref");
    expect(preset).not.toContain("secondaryLabel");
    expect(preset).not.toContain("/shadow-score");
    for (const banned of BANNED_FIRST_RUN) {
      expect(preset).not.toContain(banned);
    }
  });

  it("resume ramp has no Shadow Score second close", () => {
    expect(ramp).toContain("PRIMARY_CLOSE_HREF");
    expect(ramp).toContain("PRIMARY_CLOSE_LABEL");
    expect(ramp).not.toContain("secondaryHref");
    expect(ramp).not.toContain("secondaryLabel");
    expect(ramp).not.toContain("/shadow-score");
    for (const banned of BANNED_FIRST_RUN) {
      expect(ramp).not.toContain(banned);
    }
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
