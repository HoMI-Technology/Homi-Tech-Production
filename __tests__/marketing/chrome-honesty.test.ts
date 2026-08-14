import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TIERS } from "@/lib/stripe/tiers";
import { companionTierCopy } from "@/lib/advisor/companion-tier-copy";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

const PRICING = src("app", "(marketing)", "pricing", "page.tsx");
const TIERS_SRC = src("lib", "stripe", "tiers.ts");
const TIER_COPY_SRC = src("lib", "advisor", "companion-tier-copy.ts");
const HOME = src("app", "(marketing)", "page.tsx");
const PREVIEW = src("components", "home", "ThresholdPreview.tsx");
const SHIFT = src("components", "home", "VerdictShift.tsx");
const FOOTER = src("components", "layout", "SiteFooter.tsx");
const BROKER = src("components", "planner", "wealth", "BrokerPanel.tsx");

const SKU_BANNED = [
  "HōMI Companion",
  "Full AI Companion",
  "Get Companion",
  "daily Companion limits",
  "Higher daily Companion limits",
];

const SHADOW_BANNED = [
  "Shadow Score",
  "Get your Shadow Score",
  "Get your score",
  "Start with the free score",
  "Get your score — 90 seconds",
];

const SOLD_LIES = [
  "behavioral genome",
  "Behavioral genome",
  "Up to 5 linked household members",
  "up to 5 household members",
  "5 household members",
];

describe("Wave 1 chrome honesty — SKU and score names", () => {
  it.each([
    ["app/(marketing)/pricing/page.tsx", PRICING],
    ["lib/stripe/tiers.ts", TIERS_SRC],
    ["lib/advisor/companion-tier-copy.ts", TIER_COPY_SRC],
    ["components/layout/SiteFooter.tsx", FOOTER],
  ])("%s never names a Companion SKU or Shadow Score product", (_rel, text) => {
    for (const banned of [...SKU_BANNED, ...SHADOW_BANNED]) {
      expect(text).not.toContain(banned);
    }
  });

  it("pricing and Stripe copy do not sell genome, five-seat households, or /partner", () => {
    for (const banned of SOLD_LIES) {
      expect(PRICING).not.toContain(banned);
      expect(TIERS_SRC).not.toContain(banned);
    }
    expect(PRICING).not.toContain('href="/partner"');
    expect(PRICING).not.toMatch(/Trinity|Twin/);
    expect(TIERS_SRC).not.toMatch(/Trinity|Twin/);
  });

  it("if Pro mentions Rehearse, it is clearly not live", () => {
    const proBlob = [...TIERS.pro.features, PRICING].join("\n");
    if (/rehearse/i.test(proBlob)) {
      expect(proBlob.toLowerCase()).toMatch(/not live/);
    }
  });

  it("companionTierCopy never emits banned SKU strings", () => {
    const blobs = [
      companionTierCopy({ advisorRealModel: false, advisorMessagesPerDay: 5 }),
      companionTierCopy({ advisorRealModel: true, advisorMessagesPerDay: 25 }),
    ].flatMap((c) => [c.summary, c.detail ?? ""]);
    for (const blob of blobs) {
      for (const banned of SKU_BANNED) {
        expect(blob).not.toContain(banned);
      }
    }
  });
});

describe("Wave 1 chrome honesty — primary close", () => {
  it("pricing free and footer CTAs go to First Moment / Assess, not a score", () => {
    expect(PRICING).toContain("PRIMARY_CLOSE_HREF");
    expect(PRICING).toContain("PRIMARY_CLOSE_LABEL");
    expect(PRICING).not.toContain('href="/shadow-score"');
    expect(FOOTER).toContain('href: "/first-moment"');
    expect(FOOTER).toContain('label: "Assess"');
    expect(FOOTER).not.toContain("/shadow-score");
  });
});

describe("Wave 1 chrome honesty — homepage theater", () => {
  it("does not present a fake 0–100 HōMI-Score as the visitor's score", () => {
    expect(HOME).not.toMatch(/score-numeral[^>]*>\s*76\s*</);
    expect(HOME).not.toMatch(/score-numeral[^>]*>\s*52\s*</);
    expect(PREVIEW).not.toMatch(/uppercase tracking-\[0\.25em\] text-dim">HōMI-Score</);
    expect(SHIFT).not.toMatch(/uppercase tracking-\[0\.25em\] text-dim">HōMI-Score</);
    expect(PREVIEW).toContain("Temperature");
    expect(SHIFT).toContain("Temperature");
  });

  it("sample path does not treat credit 700 or DTI 36% as HōMI law", () => {
    expect(HOME).not.toMatch(/credit score above 700/i);
    expect(HOME).not.toMatch(/above 700/);
    expect(HOME).not.toMatch(/below 36%/);
    expect(HOME).toMatch(/50%/);
    expect(HOME).toMatch(/620/);
    expect(HOME).toMatch(/45%/);
  });
});

describe("Wave 1 chrome honesty — BrokerPanel", () => {
  it("does not mention SnapTrade or MX", () => {
    expect(BROKER).not.toMatch(/SnapTrade/i);
    expect(BROKER).not.toMatch(/\bMX\b/);
  });
});
