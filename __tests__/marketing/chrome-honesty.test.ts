/**
 * Pricing / companion-tier copy is the Brand Use line — runtime, not source grep.
 * Page-level SKU/Shadow Score bans live in T3 policy.
 */
import { describe, expect, it } from "vitest";
import { TIERS } from "@/lib/stripe/tiers";
import { companionTierCopy } from "@/lib/advisor/companion-tier-copy";

const SKU_BANNED = [
  "HōMI Companion",
  "Full AI Companion",
  "Get Companion",
  "daily Companion limits",
  "Higher daily Companion limits",
] as const;

describe("Wave 1 chrome honesty — Brand Use lines", () => {
  it("pins Stripe Plus to the Brand Use companion-voice line", () => {
    expect(TIERS.plus.features).toContain(
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
  });

  it("does not sell Rehearse or Genome on the Pro feature list", () => {
    const blob = TIERS.pro.features.join("\n");
    expect(blob).not.toMatch(/rehearse/i);
    expect(blob).not.toMatch(/genome/i);
    expect(TIERS.pro.features).toContain("Higher daily ask-about-this-verdict limits.");
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
