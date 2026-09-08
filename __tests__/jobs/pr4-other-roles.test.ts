/**
 * PR4 — Other roles (employee → partner → admin → team) on live routes.
 * Shell v3 chrome + leftover kills. No new URLs. No score invent.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const employee = read("app/(product)/employee/dashboard/page.tsx");
const partner = read("app/(product)/partner/dashboard/page.tsx");
const admin = read("app/(product)/admin/page.tsx");
const adminLayout = read("app/(product)/admin/layout.tsx");
const team = read("app/(product)/team/page.tsx");
const header = read("components/layout/AppHeader.tsx");
const host = read("components/companion/CompanionHost.tsx");
const css = read("app/globals.css");

describe("PR4 live routes only — no invented homes", () => {
  it("does not add /team/dashboard or extra /employee /partner /admin rooms", () => {
    expect(existsSync(resolve(process.cwd(), "app/(product)/team/dashboard/page.tsx"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "app/(product)/employee/page.tsx"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "app/(product)/partner/page.tsx"))).toBe(false);
    expect(employee).toContain('role="employee"');
    expect(partner).toContain('role="partner"');
    expect(admin).toContain('role="admin"');
    expect(team).toContain('role="team"');
    expect(team).toContain("/team — not /team/dashboard");
  });

  it("does not clone personal Stand/Plan/Decide/More onto role rails", () => {
    for (const src of [employee, partner, admin, team]) {
      expect(src).not.toMatch(/Stand job|Plan job|Decide job/);
      expect(src).not.toContain("JOURNEY_ORDER");
    }
  });
});

describe("PR4 employee leftover kills", () => {
  it("kills personal-score theater as one unit", () => {
    expect(employee).not.toContain("HeroScore");
    expect(employee).not.toContain("VerdictBadge");
    expect(employee).not.toContain("Not yet is not no");
    expect(employee).not.toContain("Continue your build on personal Home");
    expect(employee).not.toContain("tint={tint}");
    expect(employee).toContain('tint="transparent"');
    expect(employee).not.toContain("ThresholdFold");
    expect(employee).not.toContain("ThresholdCompass");
    expect(employee).not.toContain("financial_score");
    expect(employee).toContain("Your score here");
    expect(employee).toMatch(/label:\s*"Your score here"[\s\S]*value:\s*"—"/);
  });

  it("keeps privacy / OperateHeroMeta / PageFrame / MetricRail", () => {
    expect(employee).toContain('data-employee-privacy=""');
    expect(employee).toContain("OperateHeroMeta");
    expect(employee).toContain('role="employee"');
    expect(employee).toContain("MetricRail");
    expect(employee).toContain("What your employer sees");
    expect(employee).toContain("What stays yours");
  });
});

describe("PR4 partner leftover kills", () => {
  it("invite URL is /first-moment?ref= with fail-loud site origin", () => {
    expect(partner).toContain("first-moment?ref=");
    expect(partner).not.toContain("shadow-score?ref=");
    expect(partner).toContain("resolvePartnerInviteOrigin");
    expect(partner).not.toMatch(
      /NEXT_PUBLIC_SITE_URL\s*\?\?\s*["']https:\/\/homitechnology\.com["']/,
    );
  });

  it("empty first viewport is badge-free and does not write client score", () => {
    expect(partner).not.toContain("VerdictBadge");
    expect(partner).not.toContain("NOT_YET");
    expect(partner).not.toContain("Shadow Score");
    expect(partner).toContain("referral_source");
    expect(partner).toContain("never writes score or ledger");
  });
});

describe("PR4 admin leftover kills", () => {
  it("PageFrame wraps home and AttentionStrip stays above MetricRail", () => {
    expect(admin).toContain("<PageFrame");
    expect(admin.indexOf("AttentionStrip")).toBeLessThan(admin.indexOf("<MetricRail"));
    expect(admin.indexOf("<MetricRail")).toBeLessThan(admin.indexOf("data-admin-depth"));
    expect(admin).not.toContain("ThresholdFold");
    expect(adminLayout).toContain("AdminOperateChrome");
    expect(adminLayout).not.toContain("Wordmark");
  });

  it("CompanionHost stays off all /admin*", () => {
    expect(host).toMatch(/pathname === "\/admin"/);
    expect(host).toMatch(/pathname\?\.startsWith\("\/admin\/"\)/);
  });
});

describe("PR4 team leftover kills", () => {
  it("aggregate-only operate — no personal Path primary, no peer score wall", () => {
    expect(team).toContain('data-team-aggregates=""');
    expect(team).not.toContain("ActionDock");
    expect(team).not.toContain('href="/path"');
    expect(team).not.toContain("HeroScore");
    expect(team).not.toContain("VerdictBadge");
    expect(team).not.toContain("overall_score");
  });
});

describe("PR4 shared shell locks", () => {
  it("quiet top bar still owns compass size 28 glow=false animated=false", () => {
    expect(header).toContain("SHELL_COMPASS_SIZE = 28");
    expect(header).toContain("glow={false}");
    expect(header).toContain("animated={false}");
    expect(header).toContain("data-app-shell");
  });

  it("Fraunces 0% on operate role surfaces", () => {
    expect(css).toContain("OTHER_ROLES_CRAFT v3");
    expect(css).toContain('[data-operate-role="employee"] .dash-hero-meta h1');
    expect(css).toContain('[data-operate-role="partner"] .dash-hero-meta h1');
    expect(css).toContain('[data-operate-role="admin"] .type-h2');
    expect(css).toContain('[data-operate-role="team"] .font-display');
    expect(employee).not.toContain("font-display");
    expect(partner).not.toContain("font-display");
    expect(team).not.toContain("font-display");
    expect(admin).not.toContain("font-display");
  });
});
