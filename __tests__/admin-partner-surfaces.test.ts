/**
 * Phase 4–5 lock — Admin/Marketing attention-first; Partner/Employee surface map.
 * Phases 1–3 (Path CTA, Companion presence, Money/Tools depth) stay untouched.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("admin + marketing attention doctrine", () => {
  it("publishes Phase 4 doctrine", () => {
    expect(existsSync(resolve(process.cwd(), "docs/ADMIN-MARKETING-ATTENTION.md"))).toBe(true);
    const doc = read("docs/ADMIN-MARKETING-ATTENTION.md");
    expect(doc).toMatch(/What needs ops attention now/);
    expect(doc).toMatch(/Ship or kill|ship or kill/i);
    expect(doc).toMatch(/Companion stays/);
  });

  it("Admin home mounts AttentionStrip before MetricRail", () => {
    const page = read("app/(product)/admin/page.tsx");
    const workspace = read("components/v4/admin/AdminWorkspaceV4.tsx");
    expect(page).toContain("AdminWorkspaceV4");
    expect(workspace).toContain("AttentionStrip");
    expect(workspace).toContain('data-admin-attention=""');
    expect(workspace).toContain("<PageFrame");
    expect(workspace.indexOf("AttentionStrip")).toBeLessThan(workspace.indexOf("<MetricRail"));
    expect(page).not.toContain("ThresholdFold");
  });

  it("Marketing follows Queue/Approve lock — Publish disabled, X+TikTok only", () => {
    const page = read("app/(product)/admin/marketing/page.tsx");
    const surface = read("components/v4/admin/AdminMarketingV4.tsx");
    expect(page).toContain("AdminMarketingV4");
    expect(surface).toContain("Queue");
    expect(surface).toContain("Approve");
    expect(surface).toContain("Publish");
    expect(surface).toContain('aria-disabled="true"');
    expect(page).toContain("adminV4DraftsFromAssets");
    expect(page).not.toContain("<ActivationInstrument");
    expect(page).not.toContain("<AgencyDesks");
    expect(surface).toContain("aria-disabled");
  });

  it("Ad spend mounts attention before MetricRail and tables", () => {
    const page = read("app/(product)/admin/ad-spend/page.tsx");
    expect(page).toContain('data-ad-spend-attention=""');
    expect(page).toContain("AttentionStrip");
    expect(page.indexOf("data-ad-spend-attention")).toBeLessThan(page.indexOf("<MetricRail"));
    expect(page.indexOf("AttentionStrip")).toBeLessThan(page.indexOf("AdSpendForm"));
  });

  it("Companion stays off admin routes", () => {
    const host = read("components/companion/CompanionHost.tsx");
    const widget = read("components/companion/CompanionWidget.tsx");
    expect(host).toMatch(/pathname === "\/admin"/);
    expect(host).toMatch(/pathname\?\.startsWith\("\/admin\/"\)/);
    expect(host).toMatch(/pathname === "\/dashboard"/);
    expect(widget).toMatch(/pathname === "\/admin"/);
    expect(widget).toMatch(/pathname\.startsWith\("\/admin\/"\)/);
  });

  it("Admin home uses Shell v4 — leftover PageFrame, no Wordmark in layout", () => {
    const layout = read("app/(product)/admin/layout.tsx");
    expect(layout).not.toContain("AdminOperateChrome");
    expect(layout).not.toContain("Wordmark");
    expect(layout).toContain("isV4HomeEnabled");
    const workspace = read("components/v4/admin/AdminWorkspaceV4.tsx");
    expect(workspace).toContain("<PageFrame");
  });
});

describe("partner + employee surfaces doctrine", () => {
  it("publishes Phase 5 doctrine", () => {
    expect(existsSync(resolve(process.cwd(), "docs/PARTNER-EMPLOYEE-SURFACES.md"))).toBe(true);
    const doc = read("docs/PARTNER-EMPLOYEE-SURFACES.md");
    expect(doc).toMatch(/How is my book/);
    expect(doc).toMatch(/private standing/i);
    expect(doc).toMatch(/aggregates/i);
  });

  it("Partner primary is invite — not personal Path hero", () => {
    const page = read("app/(product)/partner/dashboard/page.tsx");
    const workspace = read("components/v4/partner/PartnerWorkspaceV4.tsx");
    expect(page).not.toContain("Partner · /partner/dashboard");
    expect(page).toContain("PartnerWorkspaceV4");
    expect(page).toContain("first-moment?ref=");
    expect(workspace).toContain('data-partner-invite=""');
    expect(workspace).toContain("InviteShareRow");
    expect(workspace).toContain("Copy invite");
    expect(page).not.toContain("shadow-score?ref=");
    expect(page).not.toContain("Shadow Score");
    expect(page).not.toContain("VerdictBadge");
    expect(page).not.toContain("PathNextMove");
    expect(page).not.toContain("HomeFold");
    expect(page).not.toContain("NOT_YET");
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("scoreBand");
    expect(page).not.toContain("data-partner-resources");
  });

  it("Employee hub is Shell v4 operate home — score theater unmounted", () => {
    const page = read("app/(product)/employee/dashboard/page.tsx");
    expect(page).not.toContain("Employee · /employee/dashboard");
    expect(page).toContain("EmployeeWorkspaceV4");
    expect(page).toContain("assertAssessmentResultOnly");
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("VerdictBadge");
    expect(page).not.toContain("data-employee-score-rail");
    expect(page).not.toContain("data-employee-primary");
    expect(page).not.toContain("Private Decision Readiness Score");
    expect(page).not.toContain("Continue your build on personal Home");
    expect(page).not.toContain("Not yet is not no");
    expect(page).not.toContain("tint={tint}");
    expect(page).not.toContain('tint="transparent"');
    expect(page).not.toContain("OperateInstrument");
    expect(page).not.toContain("dash-instrument");
    expect(page).not.toContain("ThresholdFold");
    expect(page).not.toContain("PathNextMove");
    expect(page).not.toContain("HomeFold");
    expect(page).not.toContain("financial_score");
    expect(page).not.toContain("overall_score");
    expect(page).not.toContain("ThresholdCompass");
    expect(page).not.toContain("MetricRail");
    expect(page).not.toContain("OperateHeroMeta");
    expect(page).not.toContain("PageFrame");
    expect(page).not.toContain("Your score here");
    expect(page).not.toMatch(/glass glass-hover block p-4[\s\S]*Path to Ready/);
    expect(page).not.toMatch(/title: "Companion"/);
  });

  it("Team stays aggregate-only with no named individuals copy", () => {
    const page = read("app/(product)/team/page.tsx");
    const workspace = read("components/v4/team/TeamWorkspaceV4.tsx");
    const ssot = read("lib/v4/team-workspace.ts");
    expect(page).toContain("Team · aggregate only");
    expect(page).not.toContain("Team · /team");
    expect(page).toContain("TeamWorkspaceV4");
    expect(workspace).toContain('data-team-aggregates=""');
    expect(ssot).toMatch(/Individuals are not listed|No named individuals/);
    expect(page).not.toContain("PathNextMove");
    expect(page).not.toContain("ActionDock");
    expect(page).not.toContain('href="/dashboard"');
    expect(page).not.toMatch(/href=["']\/team\/dashboard/);
    expect(existsSync(resolve(process.cwd(), "app/(product)/team/dashboard/page.tsx"))).toBe(
      false,
    );
  });

  it("does not reopen Phases 1–3 locks", () => {
    expect(read("components/dashboard/PathNextMove.tsx")).toContain('data-path-fold-primary=""');
    expect(read("lib/dashboard/fold-truth.ts")).toContain("function companionFoldLine");
    expect(read("components/dashboard/ThresholdFold.tsx")).not.toContain("HomeMoneyStanding");
    expect(read("components/dashboard/HomeMoneyStanding.tsx")).toContain("btn-ghost btn-sm");
  });
});
