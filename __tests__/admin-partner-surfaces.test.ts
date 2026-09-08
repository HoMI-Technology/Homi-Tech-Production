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
    expect(page).toContain("AttentionStrip");
    expect(page).toContain('data-admin-attention=""');
    expect(page).toContain("<PageFrame");
    expect(page).toContain('data-admin-depth=""');
    expect(page).toContain("Marketing");
    expect(page).not.toContain("Marketing · depth");
    expect(page).toContain("Marketing is depth");
    expect(page.indexOf("AttentionStrip")).toBeLessThan(page.indexOf("<MetricRail"));
    expect(page.indexOf("data-admin-attention")).toBeLessThan(page.indexOf("<MetricRail"));
    expect(page.indexOf("<MetricRail")).toBeLessThan(page.indexOf("data-admin-depth"));
    expect(page).not.toContain("ThresholdFold");
  });

  it("Marketing follows the locked command-center v2 section order", () => {
    const page = read("app/(product)/admin/marketing/page.tsx");
    expect(page).toContain('data-marketing-attention=""');
    expect(page).toContain("MarketingTodayStrip");
    // Locked order (docs/design/marketing-command-center-v2.md rev 3):
    // Today → ActivationInstrument → MetricRail (3-cell) → quick-action chips
    // → Proof → Owned → Create (agency) → Claim → Library.
    const order = [
      "data-marketing-attention",
      "<ActivationInstrument",
      "<MetricRail",
      'id="proof"',
      'id="owned"',
      'id="create"',
      'id="claim"',
      'id="library"',
    ];
    for (let i = 1; i < order.length; i++) {
      expect(page.indexOf(order[i - 1])).toBeGreaterThanOrEqual(0);
      expect(page.indexOf(order[i])).toBeGreaterThanOrEqual(0);
      expect(page.indexOf(order[i - 1])).toBeLessThan(page.indexOf(order[i]));
    }
    // Agency suite after Proof, never between header and engine; tabbed
    // AgencyDesks is the spec-rejected Alternative B.
    expect(page).not.toContain("<AgencyDesks");
    expect(page.indexOf('id="proof"')).toBeLessThan(page.indexOf('id="create"'));
    // Locked PageHeader copy + primary Email action.
    expect(page).toMatch(/What to do this week to create activations/);
    expect(page).toContain('href: "/admin/email"');
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

  it("Admin home uses PageFrame under shell v3 — no Wordmark left rail", () => {
    const layout = read("app/(product)/admin/layout.tsx");
    expect(layout).toContain("AdminOperateChrome");
    expect(layout).not.toContain("Wordmark");
    expect(layout).not.toContain("AdminSidebar");
    const chrome = read("components/admin/AdminOperateChrome.tsx");
    expect(chrome).toContain('pathname === "/admin"');
    expect(chrome).toContain("AdminSidebar");
    expect(chrome).not.toContain("Wordmark");
    expect(chrome).not.toContain("ThresholdCompass");
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
    expect(page).toMatch(/>\s*Partner\s*<\/p>/);
    expect(page).not.toContain("Partner · /partner/dashboard");
    expect(page).toContain('data-partner-invite=""');
    expect(page).toContain("InviteShareRow");
    expect(page).toContain("first-moment?ref=");
    expect(page).toContain("Copy invite");
    expect(page).not.toContain("shadow-score?ref=");
    expect(page).not.toContain("Shadow Score");
    expect(page).not.toContain("VerdictBadge");
    expect(page).not.toContain("PathNextMove");
    expect(page).not.toContain("HomeFold");
    expect(page).not.toContain("NOT_YET");
    expect(page).toContain('data-partner-resources=""');
    // Resources demoted — no glass-hover marketing wall
    expect(page).not.toMatch(/data-partner-resources[\s\S]*glass-hover/);
  });

  it("Employee hub keeps privacy and Path ghost — score rail unmounted", () => {
    const page = read("app/(product)/employee/dashboard/page.tsx");
    expect(page).toMatch(/>\s*Employee\s*<\/p>/);
    expect(page).not.toContain("Employee · /employee/dashboard");
    expect(page).toContain('data-employee-privacy=""');
    expect(page).toContain("OperateHeroMeta");
    expect(page).toContain("MetricRail");
    expect(page).toContain("EmptyState");
    expect(page).toContain('tone="operate"');
    expect(page).toContain("What your employer sees");
    expect(page).toContain("Your score here");
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
    // Six-card product wall removed
    expect(page).not.toMatch(/glass glass-hover block p-4[\s\S]*Path to Ready/);
    expect(page).not.toMatch(/title: "Companion"/);
    const pathLink = page.match(/<Link[^>]*href="\/path"[^>]*>/);
    expect(pathLink?.[0] ?? "").toMatch(/btn-ghost/);
  });

  it("Team stays aggregate-only with no named individuals copy", () => {
    const page = read("app/(product)/team/page.tsx");
    expect(page).toContain("Team · aggregate only");
    expect(page).not.toContain("Team · /team");
    expect(page).toContain('data-team-aggregates=""');
    expect(page).toMatch(/Individuals are not listed|No named individuals/);
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
