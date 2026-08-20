import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("cookie policy — Brand paste", () => {
  const page = src("app", "(marketing)", "legal", "cookies", "page.tsx");
  const banner = src("components", "consent", "CookieConsent.tsx");
  const csp = src("next.config.ts");
  const analytics = src("components", "analytics", "AnalyticsScripts.tsx");
  const consent = src("components", "consent", "consent-shared.ts");
  const attribution = src("lib", "attribution.ts");

  it("admits optional PostHog, links subprocessors, and dates 20 Aug 2026", () => {
    expect(page).toContain("PostHog");
    expect(page).toContain("Optional");
    expect(page).toContain("optional analytics");
    expect(page).toContain('href="/legal/subprocessors"');
    expect(page).toContain("Last updated: 20 Aug 2026");
  });

  it("matches CookieConsent + CSP + code: essential session, optional PostHog, no ad tech", () => {
    expect(banner).toContain("essential cookies to keep you signed in");
    expect(banner).toContain("Optional analytics");
    expect(banner).toContain("No ad tech");
    expect(page).toContain("essential cookies to keep you signed in");
    expect(page).toContain("Optional analytics help");
    expect(page).toContain("No ad tech");
    expect(page).toContain("Supabase auth session cookie");
    expect(csp).toContain("https://*.posthog.com");
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).toContain("https://cdn.plaid.com");
    expect(analytics).toContain('persistence:"memory"');
    expect(analytics).toContain("disable_session_recording:true");
    expect(page).toContain("memory-only");
    expect(page).toContain("Session recording is off");
  });

  it("discloses the first-party flags and cookie that the code actually sets", () => {
    expect(consent).toContain('CONSENT_KEY = "homi:consent"');
    expect(attribution).toContain('ATTRIBUTION_COOKIE = "homi_attr"');
    expect(page).toContain("homi:consent");
    expect(page).toContain("homi_attr");
  });

  it("does not honor GPC and does not invent ad, social, or replay programs", () => {
    expect(banner).not.toMatch(/globalPrivacyControl|GPC|doNotTrack/i);
    expect(page).toContain("We do not respond to Global Privacy Control");
    expect(page).toContain("We do not run Google Analytics, FullStory, Meta Pixel");
    expect(page).toContain("Network Advertising Initiative");
    expect(page).toContain("Digital Advertising Alliance");
    expect(page).not.toMatch(/\[INSERT|\[ADD|\[EMAIL|\[DATE/);
  });

  it("does not contain killed tracker-denial copy", () => {
    expect(page).not.toContain("zero trackers");
    expect(page).not.toContain("Zero trackers, zero ad tech");
    expect(page).not.toContain("That is the whole list");
    expect(page).not.toContain("analytics trackers");
    expect(page).not.toContain("essential only, zero trackers");
    expect(page).not.toContain("anonymous visitors use it before creating an account");
    expect(page).not.toContain(
      "most recent Shadow Score or full-assessment result, saved locally so /results and /plan work without an account",
    );
  });

  it("keeps metadata title, description, and canonical", () => {
    expect(page).toContain('title: "Cookie Policy"');
    expect(page).toContain(
      "How HōMI uses essential cookies and optional analytics. No ad tech. You can reject optional analytics anytime.",
    );
    expect(page).toContain('path: "/legal/cookies"');
  });
});
