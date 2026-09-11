/**
 * Partner v4 — operate home law.
 * Empty or live referral_source SSOT. Invite is /first-moment?ref=.
 * SITE_URL fail-loud. No HeroScore. No invent $. No client score override.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { V4_ASK_PLACEHOLDER_PARTNER } from "@/lib/v4/assessment-walk";
import {
  PARTNER_V4_EMPTY_CTA,
  PARTNER_V4_EMPTY_TITLE,
  PARTNER_V4_INVITE_BLOCKED,
  PARTNER_V4_LIVE_CTA,
  PARTNER_V4_LIVE_TITLE,
  PARTNER_V4_MINT_FAIL,
  PARTNER_V4_ORIGIN_CTA,
  PARTNER_V4_ORIGIN_TITLE,
  PARTNER_V4_PULSE_LIVE,
  PARTNER_V4_PULSE_TITLE,
  buildPartnerV4View,
  partnerInviteUrl,
  partnerV4ForbidsHeroScore,
  partnerV4ForbidsInventedDollars,
  partnerV4ForbidsOnTrackCopy,
  partnerV4ForbidsReadyCopy,
  partnerV4ForbidsShadowScoreInvite,
  partnerV4PulseFromLive,
  partnerV4VisualView,
} from "@/lib/v4/partner-workspace";
import { SYSTEM_V4_PROMPTS_MAX } from "@/lib/v4/system-surfaces";
import {
  V4_PARTNER_OPERATE_NAV,
  V4_PARTNER_WORKSPACE_NAV,
  V4_PRIMARY_NAV,
  isV4AskOnlyPath,
  isV4NavActive,
  isV4PartnerWorkspace,
  isV4SystemSurfacePath,
} from "@/lib/layout/v4-shell";

function blob(view: unknown): string {
  return JSON.stringify(view);
}

describe("Partner v4 law", () => {
  it("Ask placeholder is book-bound and prompts stay ≤3", () => {
    expect(V4_ASK_PLACEHOLDER_PARTNER).toBe("Ask HōMI about this partner book...");
    const empty = partnerV4VisualView("empty");
    expect(empty.askPlaceholder).toBe(V4_ASK_PLACEHOLDER_PARTNER);
    expect(empty.prompts.length).toBeLessThanOrEqual(SYSTEM_V4_PROMPTS_MAX);
    expect(partnerV4VisualView("invite-error").prompts).toHaveLength(SYSTEM_V4_PROMPTS_MAX);
    expect(partnerV4VisualView("normal").prompts).toHaveLength(SYSTEM_V4_PROMPTS_MAX);
  });

  it("empty CTA is Invite — not a Clarity question — and never invents a book", () => {
    const view = partnerV4VisualView("empty");
    expect(view.kind).toBe("empty");
    expect(view.title).toBe(PARTNER_V4_EMPTY_TITLE);
    expect(view.cta.label).toBe(PARTNER_V4_EMPTY_CTA);
    expect(view.cta.label).toBe("Invite");
    expect(view.cta.label).not.toMatch(/\?$/);
    expect(view.cta.href).toBe("#invite");
    expect(view.pulse).toEqual([]);
    expect(view.decisionContext).toBe("Partner");
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(blob(view)).not.toContain("HeroScore");
    expect(blob(view)).not.toContain("On track");
    expect(partnerV4ForbidsInventedDollars(view)).toBe(true);
    expect(partnerV4ForbidsHeroScore(view)).toBe(true);
    expect(
      buildPartnerV4View({ originMissing: false, inviteUrl: null, pulse: [] }).kind,
    ).toBe("empty");
  });

  it("SITE_URL fail-loud is Origin missing — never a silent bad link or shadow-score invite", () => {
    const view = partnerV4VisualView("invite-error");
    expect(view.kind).toBe("invite-error");
    expect(view.originMissing).toBe(true);
    expect(view.hardStopActive).toBe(true);
    expect(view.verdictLabel).toBe(PARTNER_V4_INVITE_BLOCKED);
    expect(view.title).toBe(PARTNER_V4_ORIGIN_TITLE);
    expect(view.cta.label).toBe(PARTNER_V4_ORIGIN_CTA);
    expect(view.inviteUrl).toBeNull();
    expect(view.pulse).toEqual([]);
    expect(blob(view)).toMatch(/fail-loud/i);
    expect(blob(view)).not.toContain("shadow-score?ref=");
    expect(blob(view)).not.toContain("https://homitechnology.com");
    expect(blob(view)).not.toMatch(/\bOn track\b/);
    expect(blob(view).toLowerCase()).not.toContain("homie");
    expect(partnerV4ForbidsShadowScoreInvite(view)).toBe(true);
    expect(partnerV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(partnerV4ForbidsReadyCopy(view)).toBe(true);
    expect(partnerV4ForbidsHeroScore(view)).toBe(true);
  });

  it("normal is live referral pulse with quiet age and no client scores", () => {
    const view = partnerV4VisualView("normal");
    expect(view.kind).toBe("normal");
    expect(view.title).toBe(PARTNER_V4_LIVE_TITLE);
    expect(view.cta.label).toBe(PARTNER_V4_LIVE_CTA);
    expect(view.ageLabel).toBe("Synced 12m ago");
    expect(view.pulse).toHaveLength(2);
    expect(view.pulse.every((row) => row.title === PARTNER_V4_PULSE_TITLE)).toBe(true);
    expect(view.pulse.every((row) => row.liveLabel === PARTNER_V4_PULSE_LIVE)).toBe(true);
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(partnerV4ForbidsHeroScore(view)).toBe(true);
  });

  it("origin missing outranks a live book — never invite on a silent bad origin", () => {
    const view = buildPartnerV4View({
      originMissing: true,
      inviteUrl: "https://preview.example/first-moment?ref=ptr_x",
      pulse: [partnerV4PulseFromLive({ id: "p1", liveAt: "2026-09-11T12:00:00.000Z" })],
    });
    expect(view.kind).toBe("invite-error");
    expect(view.inviteUrl).toBeNull();
    expect(view.pulse).toEqual([]);
  });

  it("live invite URL stays /first-moment?ref= and mint-fail copy is locked", () => {
    expect(partnerInviteUrl("https://preview.example", "ptr_abc")).toBe(
      "https://preview.example/first-moment?ref=ptr_abc",
    );
    expect(partnerInviteUrl(null, "ptr_abc")).toBeNull();
    expect(PARTNER_V4_MINT_FAIL).toContain("Could not mint an invite code");
    const live = buildPartnerV4View({
      originMissing: false,
      inviteUrl: partnerInviteUrl("https://preview.example", "ptr_abc"),
      pulse: [],
    });
    expect(partnerV4ForbidsShadowScoreInvite(live)).toBe(true);
    expect(live.inviteUrl).toContain("/first-moment?ref=");
    expect(live.inviteUrl).not.toContain("shadow-score?ref=");
  });

  it("page keeps live invite + fail-loud and does not reopen K3–K4 or write scores", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/(product)/partner/dashboard/page.tsx"),
      "utf8",
    );
    expect(page).toContain("PartnerWorkspaceV4");
    expect(page).toContain("first-moment?ref=");
    expect(page).toContain("Could not mint an invite code");
    expect(page).toContain("resolvePartnerInviteOrigin");
    expect(page).toContain("PartnerSiteUrlError");
    expect(page).toContain("referral_source");
    expect(page).toContain('.eq("partner_id", user.id)');
    expect(page).not.toContain("shadow-score?ref=");
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("ThresholdFold");
    expect(page).not.toContain("MetricRail");
    expect(page).not.toContain("OperateHeroMeta");
    expect(page).not.toContain("PageFrame");
    expect(page).not.toContain("scoreBand");
    expect(page).not.toContain("overall_score");
    expect(page).not.toMatch(/HOMI_V4_PARTNER/);
    expect(page).not.toContain("/admin");
    expect(page).not.toContain("/team");
    expect(page).not.toContain("assertAssessmentResultOnly");
    expect(page).not.toContain("from(\"lib/scoring");
  });

  it("partner jobs are Home · Book · Invite on the live /partner/dashboard route", () => {
    expect(V4_PARTNER_WORKSPACE_NAV.map((item) => item.label)).toEqual(["Home"]);
    expect(V4_PARTNER_WORKSPACE_NAV[0]?.href).toBe("/partner/dashboard");
    expect(V4_PARTNER_OPERATE_NAV.map((item) => item.label)).toEqual(["Book", "Invite"]);
    expect(V4_PRIMARY_NAV.some((item) => item.href === "/partner/dashboard")).toBe(false);
    expect(isV4PartnerWorkspace("/partner/dashboard")).toBe(true);
    expect(isV4PartnerWorkspace("/partner/dashboard/depth")).toBe(true);
    expect(isV4PartnerWorkspace("/partner")).toBe(false);
    expect(isV4PartnerWorkspace("/home")).toBe(false);
    expect(isV4NavActive("/partner/dashboard", "/home")).toBe(false);
    expect(isV4NavActive("/partner/dashboard", "/partner/dashboard")).toBe(true);
    expect(isV4NavActive("/partner/dashboard", "/partner/dashboard#invite")).toBe(false);
    expect(isV4AskOnlyPath("/partner/dashboard")).toBe(true);
    expect(isV4SystemSurfacePath("/partner/dashboard")).toBe(false);
  });
});
