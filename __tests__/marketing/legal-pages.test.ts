import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

const PRIVACY = src("app", "(marketing)", "legal", "privacy", "page.tsx");
const COOKIES = src("app", "(marketing)", "legal", "cookies", "page.tsx");
const TERMS = src("app", "(marketing)", "legal", "terms", "page.tsx");
const SUBPROCESSORS = src("app", "(marketing)", "legal", "subprocessors", "page.tsx");

const PAGES = { privacy: PRIVACY, cookies: COOKIES, terms: TERMS };

describe("legal pages — honest rewrite lock", () => {
  it("dates all three pages 20 Aug 2026", () => {
    for (const [name, page] of Object.entries(PAGES)) {
      expect(page, name).toContain("Last updated: 20 Aug 2026");
    }
  });

  it("keeps Next.js metadata titles, descriptions, and routes", () => {
    expect(PRIVACY).toContain('title: "Privacy Policy"');
    expect(PRIVACY).toContain('path: "/legal/privacy"');
    expect(COOKIES).toContain('title: "Cookie Policy"');
    expect(COOKIES).toContain('path: "/legal/cookies"');
    expect(TERMS).toContain('title: "Terms of Service"');
    expect(TERMS).toContain('path: "/legal/terms"');
  });

  it("uses the real entity, address, domain, and emails — no phone", () => {
    expect(PRIVACY).toContain("HOMI TECHNOLOGIES LLC");
    expect(PRIVACY).toContain("3072 Floweva St");
    expect(PRIVACY).toContain("Palm Springs, FL 33406");
    expect(PRIVACY).toContain("homitechnology.com");
    expect(PRIVACY).toContain("hello@homitechnology.com");
    expect(PRIVACY).toContain("security@homitechnology.com");
    expect(PRIVACY).toContain("Info@homitechnology.com");
    expect(TERMS).toContain("3072 Floweva St");
    expect(TERMS).toContain("Palm Springs, FL 33406");
    expect(TERMS).toContain("hello@homitechnology.com");
    expect(TERMS).toContain("Info@homitechnology.com");
    for (const [name, page] of Object.entries(PAGES)) {
      expect(page, name).toMatch(/We do not have a telephone number|No telephone/);
      expect(page, name).not.toMatch(/tel:/);
      expect(page, name).not.toMatch(/\+1[-\s(]/);
    }
  });

  it("lists the live subprocessors and no retired vendors", () => {
    for (const vendor of [
      "Vercel",
      "Supabase",
      "Plaid",
      "Stripe",
      "PostHog",
      "Sentry",
      "Resend",
      "Anthropic",
    ]) {
      expect(SUBPROCESSORS).toContain(vendor);
      expect(PRIVACY).toContain(vendor);
    }
    expect(PRIVACY).toContain("We do not use MX, SnapTrade, Meta Pixel");
    expect(PRIVACY).toContain("Google Analytics, or FullStory");
  });

  it("is US-only privacy — no GDPR program, SCCs, DPO, or EU establishment", () => {
    expect(PRIVACY).toContain("United States privacy notice");
    expect(PRIVACY).toContain("We do not claim GDPR operations");
    expect(PRIVACY).toContain("standard contractual clauses");
    expect(PRIVACY).toMatch(/data-protection\s+officer/);
    expect(PRIVACY).toMatch(/EEA or UK\s+establishment/);
    expect(PRIVACY).not.toMatch(/\bDPO\b/);
  });

  it("does not sell or share for targeted advertising and does not invent GPC", () => {
    expect(PRIVACY).toContain("We do not sell personal information");
    expect(PRIVACY).toMatch(/do not share personal information for\s+targeted advertising/);
    expect(PRIVACY).toContain("does not read Global Privacy Control");
    expect(COOKIES).toContain("We do not respond to Global Privacy Control");
    expect(PRIVACY).not.toContain("We honor GPC");
    expect(COOKIES).not.toContain("We honor GPC");
  });

  it("keeps Florida venue and does not invent arbitration", () => {
    expect(TERMS).toContain("State of Florida");
    expect(TERMS).toContain("courts located in Florida");
    expect(TERMS).toContain("We do not require arbitration");
    expect(TERMS).not.toContain("JAMS");
    expect(TERMS).not.toContain("DecisionLayer");
    expect(TERMS).not.toContain("30 days to opt out");
    expect(TERMS).toContain("California resident");
    expect(TERMS).not.toMatch(/laws of the State of California/);
  });

  it("cross-links the pages we did not rewrite", () => {
    expect(PRIVACY).toContain('href="/legal/disclaimer"');
    expect(PRIVACY).toContain('href="/legal/subprocessors"');
    expect(TERMS).toContain('href="/legal/disclaimer"');
    expect(TERMS).toContain('href="/legal/acceptable-use"');
    expect(TERMS).toContain('href="/legal/dmca"');
    expect(TERMS).toContain('href="/legal/subprocessors"');
    expect(COOKIES).toContain('href="/legal/subprocessors"');
    expect(COOKIES).toContain('href="/legal/privacy"');
  });

  it("does not leak scoring internals or dump template placeholders", () => {
    for (const [name, page] of Object.entries(PAGES)) {
      expect(page, name).not.toMatch(/\b35%\b/);
      expect(page, name).not.toMatch(/\bREADY ≥/);
      expect(page, name).not.toMatch(/\[CompanyName\]|\[INSERT|\[ADD\]|\[DATE\]|\[EMAIL\]/);
      expect(page, name).not.toMatch(/General Legal|legal-templates/i);
    }
  });

  it("keeps educational-only facts without inventing a new product", () => {
    expect(PRIVACY).toContain("educational only");
    expect(TERMS).toContain("educational only");
    expect(TERMS).toContain("not a lender");
    expect(TERMS).toContain("not a registered investment advisor");
    expect(TERMS).toContain("not a credit bureau");
    expect(TERMS).toContain("score is not advice");
  });
});
