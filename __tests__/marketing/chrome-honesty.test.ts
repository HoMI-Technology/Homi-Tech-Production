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
const HOW_IT_WORKS = src("app", "(marketing)", "how-it-works", "page.tsx");
const PREVIEW = src("components", "home", "ThresholdPreview.tsx");
const SHIFT = src("components", "home", "VerdictShift.tsx");
const FOOTER = src("components", "layout", "SitemapFooter.tsx");
const QUIET_FOOTER = src("components", "layout", "QuietHomeFooter.tsx");
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

const VERDICT_BADGES = [
  "DO NOT PROCEED",
  "ALMOST THERE",
  "BUILD FIRST",
  "Build First",
] as const;

const FAKE_SCORE_RANGES = ["80–100", "65–79", "50–64", "0–49"] as const;

describe("Wave 1 chrome honesty — Brand Use lines", () => {
  it("pins Pricing Free to the Brand Use protective-verdict line", () => {
    expect(PRICING).toContain("Protective verdict and Path — same quality as paid.");
  });

  it("pins Stripe Plus to the Brand Use companion-voice line", () => {
    expect(TIERS.plus.features).toContain(
      "Verdict in your companion's voice (Steady, Clarity, or Horizon).",
    );
    expect(TIERS_SRC).toContain(
      "Verdict in your companion's voice (Steady, Clarity, or Horizon).",
    );
  });

  it("pins companion-tier-copy Free and Plus+ to Brand Use", () => {
    expect(companionTierCopy({ advisorRealModel: false, advisorMessagesPerDay: 5 }).summary).toBe(
      "Rule-based notes on this verdict.",
    );
    expect(companionTierCopy({ advisorRealModel: true, advisorMessagesPerDay: 25 }).summary).toBe(
      "Ask about this verdict.",
    );
    expect(TIER_COPY_SRC).toContain("Rule-based notes on this verdict.");
    expect(TIER_COPY_SRC).toContain("Ask about this verdict.");
  });

  it("does not sell Rehearse or Genome; Pro ask-limit uses Brand Use if present", () => {
    const proBlob = [...TIERS.pro.features, PRICING, TIERS_SRC].join("\n");
    expect(proBlob).not.toMatch(/rehearse/i);
    expect(proBlob).not.toMatch(/genome/i);
    expect(TIERS.pro.features).toContain("Higher daily ask-about-this-verdict limits.");
    expect(PRICING).toContain("Higher daily ask-about-this-verdict limits.");
  });
});

describe("Wave 1 chrome honesty — SKU and score names", () => {
  it.each([
    ["app/(marketing)/pricing/page.tsx", PRICING],
    ["app/(marketing)/how-it-works/page.tsx", HOW_IT_WORKS],
    ["lib/stripe/tiers.ts", TIERS_SRC],
    ["lib/advisor/companion-tier-copy.ts", TIER_COPY_SRC],
    ["components/layout/SitemapFooter.tsx", FOOTER],
    ["components/layout/QuietHomeFooter.tsx", QUIET_FOOTER],
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

  it("how-it-works closes on Assess → First Moment, not Get your score /shadow-score", () => {
    expect(HOW_IT_WORKS).toContain("PRIMARY_CLOSE_HREF");
    expect(HOW_IT_WORKS).toContain("PRIMARY_CLOSE_LABEL");
    expect(HOW_IT_WORKS).not.toContain('href="/shadow-score"');
    expect(HOW_IT_WORKS).not.toContain("Get your score — 90 seconds");
    expect(HOW_IT_WORKS).not.toContain("Get your score");
  });

  it("how-it-works locks Product weights and does not claim equal weights, a trade secret, or 200+ signals", () => {
    expect(HOW_IT_WORKS).toContain(
      "Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30. How they combine stays ours.",
    );
    expect(HOW_IT_WORKS).not.toContain("HōMI weighs all three pillars equally");
    expect(HOW_IT_WORKS).not.toContain("equally-weighted");
    expect(HOW_IT_WORKS).not.toContain("equal weights");
    expect(HOW_IT_WORKS).not.toContain("weights are a trade secret");
    expect(HOW_IT_WORKS).not.toContain("those are the trade secret");
    expect(HOW_IT_WORKS).not.toContain("shadow version");
    expect(HOW_IT_WORKS).not.toContain("200+ signals");
    expect(HOW_IT_WORKS).not.toContain("Every verdict below READY comes with a map");
    expect(HOW_IT_WORKS).toContain(
      "Not yet is a starting line, not a wall. You get a map: the specific, ordered things to build first.",
    );
    expect(HOW_IT_WORKS).toContain(
      "Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30. How they combine stays ours. Then hard-stops — conditions that override the math because they are not safe to build on top of.",
    );
    expect(HOW_IT_WORKS).toContain(
      "Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30. How they combine stays ours. Here is what each pillar looks at and why it matters.",
    );
    expect(HOW_IT_WORKS).not.toContain(
      "HōMI weighs Financial Reality, Emotional Truth, and Perfect Timing at 35 / 35 / 30, then checks for hard-stops — conditions that override the math entirely because they are not safe to build on top of.",
    );
    expect(HOW_IT_WORKS).not.toContain(
      "The public weights are 35 / 35 / 30 — Financial Reality, Emotional Truth, Perfect Timing. Here is what each pillar looks at and why it matters.",
    );
  });

  it("footer is not a product CTA to /advisor", () => {
    expect(FOOTER).not.toContain("/advisor");
    expect(FOOTER).not.toContain('label: "Decision Companion"');
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

  it("homepage theater is temperature-only — no 4-band words, no 0–100 fake score surface", () => {
    const alignment = src("components", "home", "AlignmentScene.tsx");
    for (const [source, text] of [
      ["homepage", HOME],
      ["ThresholdPreview", PREVIEW],
      ["VerdictShift", SHIFT],
      ["AlignmentScene", alignment],
    ] as const) {
      for (const badge of VERDICT_BADGES) {
        expect(text, `${source} must not say ${badge}`).not.toContain(badge);
      }
      expect(text, `${source} must not pass verdict=READY`).not.toContain('verdict="READY"');
    }
    for (const range of FAKE_SCORE_RANGES) {
      expect(HOME, `homepage must not print ${range}`).not.toContain(range);
    }
    expect(HOME).not.toContain("READY");
    expect(PREVIEW).not.toContain("READY");
    expect(SHIFT).not.toContain("READY");
    expect(alignment).not.toContain("READY");
  });

  it("homepage walk does not mount a sample path or treat 700 / 36% as HōMI law", () => {
    expect(HOME).not.toMatch(/credit score above 700/i);
    expect(HOME).not.toMatch(/above 700/);
    expect(HOME).not.toMatch(/below 36%/);
    expect(HOME).not.toContain("Sample path");
    expect(HOME).not.toContain("28 / 33 / 36");
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/ThresholdPreview["']/);
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/Voices["']/);
    expect(HOME).not.toContain("<ThresholdPreview");
    expect(HOME).not.toContain("<Voices");
  });
});

describe("Wave 1 chrome honesty — BrokerPanel", () => {
  it("does not mention SnapTrade or MX", () => {
    expect(BROKER).not.toMatch(/SnapTrade/i);
    expect(BROKER).not.toMatch(/\bMX\b/);
  });
});
