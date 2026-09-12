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
  ADMIN_V4_USERS_CONSOLE_EMPTY,
  ADMIN_V4_USERS_COLUMNS,
  ADMIN_V4_ORGANIZATIONS_CONSOLE_EMPTY,
  ADMIN_V4_ORGANIZATIONS_COLUMNS,
  ADMIN_V4_EMAIL_CONSOLE_EMPTY,
  ADMIN_V4_EMAIL_COLUMNS,
  ADMIN_V4_WAITLIST_CONSOLE_EMPTY,
  ADMIN_V4_WAITLIST_COLUMNS,
  buildAdminAssessmentsV4View,
  buildAdminEmailV4View,
  buildAdminOrganizationsV4View,
  buildAdminUsersV4View,
  buildAdminWaitlistV4View,
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

  it("users room is empty-or-live from profiles id/created_at/role/subscription_tier", () => {
    expect(ADMIN_V4_USERS_CONSOLE_EMPTY).toBe("No live users in this console.");
    expect(ADMIN_V4_USERS_COLUMNS).toEqual([
      "id",
      "created_at",
      "role",
      "subscription_tier",
    ]);
    expect(ADMIN_V4_USERS_COLUMNS).not.toContain("score");

    const empty = buildAdminUsersV4View({ rows: [], loadError: false });
    expect(empty.kind).toBe("empty");
    expect(empty.title).toBe(ADMIN_V4_USERS_CONSOLE_EMPTY);
    expect(empty.rows).toEqual([]);
    expect(empty.columns).toEqual([...ADMIN_V4_USERS_COLUMNS]);
    expect(empty.shown).toBe(0);
    expect(adminV4ForbidsHeroScore(empty)).toBe(true);
    expect(adminV4ForbidsInventedDollars(empty)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(empty)).toBe(true);
    expect(adminV4ForbidsReadyCopy(empty)).toBe(true);

    const errored = buildAdminUsersV4View({
      rows: [
        {
          id: "should-not-render",
          created_at: "2026-09-11T12:00:00.000Z",
          role: "admin",
          subscription_tier: "pro",
        },
      ],
      loadError: true,
    });
    expect(errored.kind).toBe("empty");
    expect(errored.title).toBe(ADMIN_V4_USERS_CONSOLE_EMPTY);
    expect(errored.rows).toEqual([]);
    expect(errored.shown).toBe(0);

    const view = buildAdminUsersV4View({
      rows: [
        {
          id: "user-admin",
          created_at: "2026-09-11T12:00:00.000Z",
          role: "admin",
          subscription_tier: "pro",
        },
        {
          id: "user-partner",
          created_at: null,
          role: "partner",
          subscription_tier: "free",
        },
        {
          id: "user-plus",
          created_at: "2026-09-10T12:00:00.000Z",
          role: "user",
          subscription_tier: "plus",
        },
      ],
      loadError: false,
    });
    expect(view.kind).toBe("normal");
    expect(view.columns).toEqual(["id", "created_at", "role", "subscription_tier"]);
    expect(view.rows.map((row) => row.id)).toEqual([
      "user-admin",
      "user-partner",
      "user-plus",
    ]);
    expect(view.rows.map((row) => row.roleLabel)).toEqual([
      "admin",
      "partner",
      "user",
    ]);
    expect(view.rows.map((row) => row.tierLabel)).toEqual(["pro", "free", "plus"]);
    expect(view.rows[1]?.createdLabel).toBe("—");
    expect(view.shown).toBe(3);
    expect(view.paidCount).toBe(2);
    expect(view.adminCount).toBe(1);
    expect(view.partnerCount).toBe(1);
    expect(blob(view)).not.toContain("HeroScore");
    expect(blob(view)).not.toContain("overall_score");
    expect(blob(view)).not.toContain("score");
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toMatch(/\bREADY\b/);
    expect(blob(view)).not.toContain("Publish");
    expect(adminV4ForbidsHeroScore(view)).toBe(true);
    expect(adminV4ForbidsInventedDollars(view)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(adminV4ForbidsReadyCopy(view)).toBe(true);

    const page = readFileSync(
      resolve(process.cwd(), "app/(product)/admin/users/page.tsx"),
      "utf8",
    );
    expect(page).toContain("buildAdminUsersV4View");
    expect(page).toContain("loadError");
    expect(page).toContain("id, created_at, role, subscription_tier");
    expect(page).not.toContain('select("*")');
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("overall_score");
    expect(page).not.toContain("Publish");
    expect(page).not.toMatch(/>Score</);
    expect(page).not.toContain("ThresholdFold");
    expect(page).not.toContain("/team");
  });

  it("organizations room is empty-or-live from orgs, members, and family accounts", () => {
    expect(ADMIN_V4_ORGANIZATIONS_CONSOLE_EMPTY).toBe(
      "No live organizations in this console.",
    );
    expect(ADMIN_V4_ORGANIZATIONS_COLUMNS).toEqual([
      "id",
      "name",
      "slug",
      "kind",
      "plan",
      "created_at",
    ]);
    expect(ADMIN_V4_ORGANIZATIONS_COLUMNS).not.toContain("score");

    const empty = buildAdminOrganizationsV4View({
      rows: [],
      members: [],
      familyCount: 0,
      loadError: false,
    });
    expect(empty.kind).toBe("empty");
    expect(empty.title).toBe(ADMIN_V4_ORGANIZATIONS_CONSOLE_EMPTY);
    expect(empty.rows).toEqual([]);
    expect(empty.columns).toEqual([...ADMIN_V4_ORGANIZATIONS_COLUMNS]);
    expect(empty.shown).toBe(0);
    expect(empty.memberCount).toBe(0);
    expect(empty.familyCount).toBe(0);
    expect(adminV4ForbidsHeroScore(empty)).toBe(true);
    expect(adminV4ForbidsInventedDollars(empty)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(empty)).toBe(true);
    expect(adminV4ForbidsReadyCopy(empty)).toBe(true);

    const errored = buildAdminOrganizationsV4View({
      rows: [
        {
          id: "should-not-render",
          name: "Hidden",
          slug: "hidden",
          kind: "employer",
          plan: "plus",
          created_at: "2026-09-11T12:00:00.000Z",
        },
      ],
      members: [{ organization_id: "should-not-render" }],
      familyCount: 9,
      loadError: true,
    });
    expect(errored.kind).toBe("empty");
    expect(errored.title).toBe(ADMIN_V4_ORGANIZATIONS_CONSOLE_EMPTY);
    expect(errored.rows).toEqual([]);
    expect(errored.shown).toBe(0);
    expect(errored.memberCount).toBe(0);
    expect(errored.familyCount).toBe(0);

    const view = buildAdminOrganizationsV4View({
      rows: [
        {
          id: "org-acme",
          name: "Acme Benefits",
          slug: "acme",
          kind: "employer",
          plan: "plus",
          created_at: "2026-09-11T12:00:00.000Z",
        },
        {
          id: "org-beta",
          name: "Beta Partner",
          slug: "beta",
          kind: "partner",
          plan: "free",
          created_at: null,
        },
      ],
      members: [
        { organization_id: "org-acme" },
        { organization_id: "org-acme" },
        { organization_id: "org-beta" },
      ],
      familyCount: 4,
      loadError: false,
    });
    expect(view.kind).toBe("normal");
    expect(view.columns).toEqual([
      "id",
      "name",
      "slug",
      "kind",
      "plan",
      "created_at",
    ]);
    expect(view.rows.map((row) => row.id)).toEqual(["org-acme", "org-beta"]);
    expect(view.rows.map((row) => row.nameLabel)).toEqual([
      "Acme Benefits",
      "Beta Partner",
    ]);
    expect(view.rows.map((row) => row.kindLabel)).toEqual(["employer", "partner"]);
    expect(view.rows.map((row) => row.planLabel)).toEqual(["plus", "free"]);
    expect(view.rows.map((row) => row.memberCount)).toEqual([2, 1]);
    expect(view.rows[1]?.createdLabel).toBe("—");
    expect(view.shown).toBe(2);
    expect(view.memberCount).toBe(3);
    expect(view.familyCount).toBe(4);
    expect(view.employerCount).toBe(1);
    expect(view.partnerCount).toBe(1);
    expect(blob(view)).not.toContain("HeroScore");
    expect(blob(view)).not.toContain("overall_score");
    expect(blob(view)).not.toContain("score");
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toMatch(/\bREADY\b/);
    expect(blob(view)).not.toContain("Publish");
    expect(adminV4ForbidsHeroScore(view)).toBe(true);
    expect(adminV4ForbidsInventedDollars(view)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(adminV4ForbidsReadyCopy(view)).toBe(true);

    const page = readFileSync(
      resolve(process.cwd(), "app/(product)/admin/organizations/page.tsx"),
      "utf8",
    );
    expect(page).toContain("buildAdminOrganizationsV4View");
    expect(page).toContain("loadError");
    expect(page).toContain("id, name, slug, kind, plan, created_at");
    expect(page).toContain('from("organization_members")');
    expect(page).toContain('from("family_accounts")');
    expect(page).not.toContain('select("*")');
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("overall_score");
    expect(page).not.toContain("score-numeral");
    expect(page).not.toContain("Publish");
    expect(page).not.toMatch(/>Score</);
    expect(page).not.toContain("ThresholdFold");
    expect(page).not.toContain("/team");
  });

  it("email room is empty-or-live from campaigns and campaign_sends", () => {
    expect(ADMIN_V4_EMAIL_CONSOLE_EMPTY).toBe(
      "No live email campaigns in this console.",
    );
    expect(ADMIN_V4_EMAIL_COLUMNS).toEqual([
      "id",
      "name",
      "audience",
      "status",
      "sent_at",
    ]);
    expect(ADMIN_V4_EMAIL_COLUMNS).not.toContain("score");

    const empty = buildAdminEmailV4View({
      rows: [],
      sends: [],
      loadError: false,
    });
    expect(empty.kind).toBe("empty");
    expect(empty.title).toBe(ADMIN_V4_EMAIL_CONSOLE_EMPTY);
    expect(empty.rows).toEqual([]);
    expect(empty.columns).toEqual([...ADMIN_V4_EMAIL_COLUMNS]);
    expect(empty.shown).toBe(0);
    expect(empty.draftCount).toBe(0);
    expect(empty.sentCount).toBe(0);
    expect(empty.failedCount).toBe(0);
    expect(adminV4ForbidsHeroScore(empty)).toBe(true);
    expect(adminV4ForbidsInventedDollars(empty)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(empty)).toBe(true);
    expect(adminV4ForbidsReadyCopy(empty)).toBe(true);

    const errored = buildAdminEmailV4View({
      rows: [
        {
          id: "should-not-render",
          name: "Hidden",
          audience: "all",
          status: "sent",
          sent_at: "2026-09-11T12:00:00.000Z",
        },
      ],
      sends: [{ campaign_id: "should-not-render", status: "sent" }],
      loadError: true,
    });
    expect(errored.kind).toBe("empty");
    expect(errored.title).toBe(ADMIN_V4_EMAIL_CONSOLE_EMPTY);
    expect(errored.rows).toEqual([]);
    expect(errored.shown).toBe(0);
    expect(errored.sentCount).toBe(0);

    const view = buildAdminEmailV4View({
      rows: [
        {
          id: "camp-sent",
          name: "Waitlist note",
          audience: "waitlist",
          status: "sent",
          sent_at: "2026-09-11T12:00:00.000Z",
        },
        {
          id: "camp-draft",
          name: "Draft note",
          audience: "free",
          status: "draft",
          sent_at: null,
        },
      ],
      sends: [
        { campaign_id: "camp-sent", status: "sent" },
        { campaign_id: "camp-sent", status: "sent" },
        { campaign_id: "camp-sent", status: "failed" },
        { campaign_id: "camp-sent", status: "suppressed" },
      ],
      loadError: false,
    });
    expect(view.kind).toBe("normal");
    expect(view.columns).toEqual([
      "id",
      "name",
      "audience",
      "status",
      "sent_at",
    ]);
    expect(view.rows.map((row) => row.id)).toEqual(["camp-sent", "camp-draft"]);
    expect(view.rows.map((row) => row.nameLabel)).toEqual([
      "Waitlist note",
      "Draft note",
    ]);
    expect(view.rows.map((row) => row.audienceLabel)).toEqual([
      "waitlist",
      "free",
    ]);
    expect(view.rows.map((row) => row.statusLabel)).toEqual(["sent", "draft"]);
    expect(view.rows[0]?.sentCount).toBe(2);
    expect(view.rows[0]?.failedCount).toBe(1);
    expect(view.rows[0]?.suppressedCount).toBe(1);
    expect(view.rows[1]?.sentLabel).toBe("—");
    expect(view.shown).toBe(2);
    expect(view.draftCount).toBe(1);
    expect(view.sentCount).toBe(2);
    expect(view.failedCount).toBe(1);
    expect(blob(view)).not.toContain("HeroScore");
    expect(blob(view)).not.toContain("overall_score");
    expect(blob(view)).not.toContain("score");
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toMatch(/\bREADY\b/);
    expect(blob(view)).not.toContain("Publish");
    expect(blob(view)).not.toContain("@");
    expect(adminV4ForbidsHeroScore(view)).toBe(true);
    expect(adminV4ForbidsInventedDollars(view)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(adminV4ForbidsReadyCopy(view)).toBe(true);

    const page = readFileSync(
      resolve(process.cwd(), "app/(product)/admin/email/page.tsx"),
      "utf8",
    );
    expect(page).toContain("buildAdminEmailV4View");
    expect(page).toContain("loadError");
    expect(page).toContain("id, name, audience, status, sent_at");
    expect(page).toContain('from("campaigns")');
    expect(page).toContain('from("campaign_sends")');
    expect(page).toContain("campaign_id, status");
    expect(page).not.toContain('select("*")');
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("overall_score");
    expect(page).not.toContain("score-numeral");
    expect(page).not.toContain("Publish");
    expect(page).not.toMatch(/>Score</);
    expect(page).not.toContain("ThresholdFold");
    expect(page).not.toContain("/team");
  });

  it("waitlist room is empty-or-live from waitlist id/created_at/status/source", () => {
    expect(ADMIN_V4_WAITLIST_CONSOLE_EMPTY).toBe(
      "No live waitlist signups in this console.",
    );
    expect(ADMIN_V4_WAITLIST_COLUMNS).toEqual([
      "id",
      "created_at",
      "status",
      "source",
    ]);
    expect(ADMIN_V4_WAITLIST_COLUMNS).not.toContain("score");
    expect(ADMIN_V4_WAITLIST_COLUMNS).not.toContain("email");

    const empty = buildAdminWaitlistV4View({ rows: [], loadError: false });
    expect(empty.kind).toBe("empty");
    expect(empty.title).toBe(ADMIN_V4_WAITLIST_CONSOLE_EMPTY);
    expect(empty.rows).toEqual([]);
    expect(empty.columns).toEqual([...ADMIN_V4_WAITLIST_COLUMNS]);
    expect(empty.shown).toBe(0);
    expect(empty.taggedCount).toBe(0);
    expect(adminV4ForbidsHeroScore(empty)).toBe(true);
    expect(adminV4ForbidsInventedDollars(empty)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(empty)).toBe(true);
    expect(adminV4ForbidsReadyCopy(empty)).toBe(true);

    const errored = buildAdminWaitlistV4View({
      rows: [
        {
          id: "should-not-render",
          created_at: "2026-09-11T12:00:00.000Z",
          status: "pending",
          source: "landing",
          interested_in: ["home"],
        },
      ],
      loadError: true,
    });
    expect(errored.kind).toBe("empty");
    expect(errored.title).toBe(ADMIN_V4_WAITLIST_CONSOLE_EMPTY);
    expect(errored.rows).toEqual([]);
    expect(errored.shown).toBe(0);

    const view = buildAdminWaitlistV4View({
      rows: [
        {
          id: "wl-1",
          created_at: "2026-09-11T12:00:00.000Z",
          status: "pending",
          source: "landing",
          interested_in: ["home", "car"],
        },
        {
          id: "wl-2",
          created_at: null,
          status: "invited",
          source: null,
          interested_in: null,
        },
      ],
      loadError: false,
    });
    expect(view.kind).toBe("normal");
    expect(view.columns).toEqual(["id", "created_at", "status", "source"]);
    expect(view.rows.map((row) => row.id)).toEqual(["wl-1", "wl-2"]);
    expect(view.rows.map((row) => row.statusLabel)).toEqual([
      "pending",
      "invited",
    ]);
    expect(view.rows.map((row) => row.sourceLabel)).toEqual(["landing", "—"]);
    expect(view.rows[0]?.interestsLabel).toBe("home, car");
    expect(view.rows[1]?.interestsLabel).toBe("—");
    expect(view.rows[1]?.createdLabel).toBe("—");
    expect(view.shown).toBe(2);
    expect(view.taggedCount).toBe(1);
    expect(blob(view)).not.toContain("HeroScore");
    expect(blob(view)).not.toContain("overall_score");
    expect(blob(view)).not.toContain("score");
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toMatch(/\bREADY\b/);
    expect(blob(view)).not.toContain("Publish");
    expect(blob(view)).not.toContain("@");
    expect(adminV4ForbidsHeroScore(view)).toBe(true);
    expect(adminV4ForbidsInventedDollars(view)).toBe(true);
    expect(adminV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(adminV4ForbidsReadyCopy(view)).toBe(true);

    const page = readFileSync(
      resolve(process.cwd(), "app/(product)/admin/waitlist/page.tsx"),
      "utf8",
    );
    expect(page).toContain("buildAdminWaitlistV4View");
    expect(page).toContain("loadError");
    expect(page).toContain("id, created_at, status, source, interested_in");
    expect(page).toContain('from("waitlist")');
    expect(page).not.toContain('select("*")');
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("overall_score");
    expect(page).not.toContain("score-numeral");
    expect(page).not.toContain("Publish");
    expect(page).not.toMatch(/>Score</);
    expect(page).not.toContain("ThresholdFold");
    expect(page).not.toContain("/team");
  });
});
