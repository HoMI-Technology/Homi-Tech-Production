/**
 * Admin v4 — ops console law.
 * Attention first. Live SSOT only. No HeroScore. No invent $. No Ask/Companion.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ADMIN_V4_ASSESSMENTS_COMPLETE,
  ADMIN_V4_ASSESSMENTS_EMPTY,
  ADMIN_V4_ASSESSMENTS_HOLD,
  ADMIN_V4_ASSESSMENTS_IN_PROGRESS,
  ADMIN_V4_ASSESSMENTS_TITLE,
  ADMIN_V4_EMPTY_TITLE,
  ADMIN_V4_LIVE_TITLE,
  ADMIN_V4_REFRESH_CTA,
  ADMIN_V4_USERS_EMPTY,
  adminV4DraftsFromAssets,
  adminV4ForbidsHeroScore,
  adminV4ForbidsInventedDollars,
  adminV4ForbidsOnTrackCopy,
  adminV4ForbidsReadyCopy,
  adminV4VisualDrafts,
  adminV4VisualView,
  buildAdminAssessmentsV4View,
  buildAdminV4View,
} from "@/lib/v4/admin-workspace";
import {
  V4_ADMIN_CONSOLE_NAV,
  V4_ADMIN_ROOMS_NAV,
  V4_PRIMARY_NAV,
  isV4AdminWorkspace,
  isV4NavActive,
  isV4QuietCommandPath,
} from "@/lib/layout/v4-shell";

function blob(view: unknown): string {
  return JSON.stringify(view);
}

describe("Admin v4 law", () => {
  it("empty headline is Nothing needs attention — never a Clarity question CTA", () => {
    const view = adminV4VisualView("empty");
    expect(view.kind).toBe("empty");
    expect(view.title).toBe(ADMIN_V4_EMPTY_TITLE);
    expect(view.kpis).toEqual([]);
    expect(view.jobs).toEqual([]);
    expect(view.body).toBeNull();
    expect(view.attentionEmpty).toBe("Nothing queued.");
    expect(ADMIN_V4_REFRESH_CTA).toBe("Refresh");
    expect(ADMIN_V4_USERS_EMPTY).toBe("No users yet.");
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toContain("HeroScore");
    expect(blob(view)).not.toContain("Clarity");
    expect(blob(view)).not.toContain("Live ops only");
    expect(blob(view)).not.toContain("Attention above KPI");
    expect(adminV4ForbidsInventedDollars(view)).toBe(true);
    expect(adminV4ForbidsHeroScore(view)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(adminV4ForbidsReadyCopy(view)).toBe(true);
    expect(blob(view).toLowerCase()).not.toContain("homie");
    expect(buildAdminV4View({
      userCount: 0,
      orgCount: 0,
      assessments7d: 0,
      waitlistCount: 0,
      emailFailedCount: 0,
    }).kind).toBe("empty");
  });

  it("normal attention sits above live KPI and never invents $", () => {
    const view = adminV4VisualView("normal");
    expect(view.kind).toBe("normal");
    expect(view.title).toBe(ADMIN_V4_LIVE_TITLE);
    expect(view.attention.length).toBeGreaterThan(0);
    expect(view.body).toBeNull();
    expect(view.kpis.map((kpi) => kpi.label)).toEqual([
      "Users",
      "Orgs",
      "Assessments 7d",
      "Waitlist",
    ]);
    expect(view.kpis).toHaveLength(4);
    expect(view.kpis.every((kpi) => kpi.label.length > 0 && kpi.value.length > 0)).toBe(true);
    expect(view.jobs[0]?.cta).toBe("Open waitlist");
    expect(view.jobs[0]?.cta).not.toMatch(/\?$/);
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toMatch(/\bOn track\b/);
    expect(blob(view)).not.toMatch(/\bREADY\b/);
    expect(blob(view).toLowerCase()).not.toContain("homie");
    expect(adminV4ForbidsHeroScore(view)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(adminV4ForbidsReadyCopy(view)).toBe(true);
    expect(adminV4ForbidsInventedDollars(view)).toBe(true);
  });

  it("marketing drafts are X+TikTok only — Instagram/Threads are not peers", () => {
    const drafts = adminV4VisualDrafts("normal");
    expect(drafts.map((d) => d.platform)).toEqual(["x", "tiktok"]);
    expect(
      adminV4DraftsFromAssets([
        { id: "1", title: "Draft · X", platform: "x", status: "in_review" },
        { id: "2", title: "IG", platform: "instagram", status: "draft" },
        { id: "3", title: "Threads", platform: "threads", status: "draft" },
      ]).map((d) => d.platform),
    ).toEqual(["x"]);
  });

  it("shell maps existing rooms only — no /team, no Ask, no Assess on admin", () => {
    expect(V4_ADMIN_CONSOLE_NAV.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/users",
      "/admin/organizations",
      "/admin/assessments",
      "/admin/activity",
      "/admin/marketing",
    ]);
    expect(V4_ADMIN_ROOMS_NAV.map((item) => item.href)).toEqual([
      "/admin/analytics",
      "/admin/attribution",
      "/admin/email",
      "/admin/ad-spend",
      "/admin/waitlist",
    ]);
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Admin")).toBe(false);
    expect(isV4AdminWorkspace("/admin/email")).toBe(true);
    expect(isV4NavActive("/admin/marketing", "/admin")).toBe(false);
    expect(isV4QuietCommandPath("/admin/waitlist")).toBe(true);
    const page = readFileSync(resolve(process.cwd(), "app/(product)/admin/page.tsx"), "utf8");
    expect(page).not.toContain("/team");
    expect(page).not.toContain("ThresholdFold");
    const command = readFileSync(
      resolve(process.cwd(), "components/layout/v4/V4TopCommand.tsx"),
      "utf8",
    );
    expect(command).toContain("isV4QuietCommandPath");
    expect(command).toContain("No Ask · Companion off");
  });

  it("assessments room is empty-or-live and never paints HeroScore, $, On track, or READY", () => {
    const empty = buildAdminAssessmentsV4View([]);
    expect(empty.kind).toBe("empty");
    expect(empty.title).toBe(ADMIN_V4_ASSESSMENTS_EMPTY);
    expect(empty.rows).toEqual([]);
    expect(adminV4ForbidsHeroScore(empty)).toBe(true);
    expect(adminV4ForbidsInventedDollars(empty)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(empty)).toBe(true);
    expect(adminV4ForbidsReadyCopy(empty)).toBe(true);

    const view = buildAdminAssessmentsV4View([
      {
        id: "ready-row",
        created_at: "2026-09-11T12:00:00.000Z",
        verdict: "READY",
        is_shadow: false,
        hard_stops: [],
      },
      {
        id: "hold-row",
        created_at: "2026-09-11T12:00:00.000Z",
        verdict: "NOT_YET",
        is_shadow: true,
        hard_stops: [{ code: "RUNWAY_UNDER_1_MONTH" }],
      },
      {
        id: "open-row",
        created_at: null,
        verdict: null,
        is_shadow: false,
        hard_stops: null,
      },
    ]);
    expect(view.kind).toBe("normal");
    expect(view.title).toBe(ADMIN_V4_ASSESSMENTS_TITLE);
    expect(view.rows.map((row) => row.statusLabel)).toEqual([
      ADMIN_V4_ASSESSMENTS_COMPLETE,
      ADMIN_V4_ASSESSMENTS_HOLD,
      ADMIN_V4_ASSESSMENTS_IN_PROGRESS,
    ]);
    expect(view.rows[1]?.kindLabel).toBe("Shadow");
    expect(view.shown).toBe(3);
    expect(view.completed).toBe(2);
    expect(view.waitCount).toBe(1);
    expect(view.shadowCount).toBe(1);
    expect(blob(view)).not.toContain("HeroScore");
    expect(blob(view)).not.toContain("overall_score");
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toMatch(/\bOn track\b/);
    expect(blob(view)).not.toMatch(/\bREADY\b/);
    expect(adminV4ForbidsHeroScore(view)).toBe(true);
    expect(adminV4ForbidsInventedDollars(view)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(adminV4ForbidsReadyCopy(view)).toBe(true);

    const page = readFileSync(
      resolve(process.cwd(), "app/(product)/admin/assessments/page.tsx"),
      "utf8",
    );
    expect(page).toContain("buildAdminAssessmentsV4View");
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("VerdictBadge");
    expect(page).not.toContain("scoreBand");
    expect(page).not.toContain("overall_score");
    expect(page).not.toContain("ThresholdFold");
    expect(page).not.toContain("/team");
  });
});
