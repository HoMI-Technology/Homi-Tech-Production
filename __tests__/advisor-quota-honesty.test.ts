import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { nextDailyResetIso, nextMonthlyResetIso, summarizeAdvisorUsage } from "@/lib/advisor/usage";
import { formatQuotaReset, nextTierUp, overQuotaCopy } from "@/lib/advisor/quota-copy";

const FREE = { advisorMessagesPerDay: 5, advisorMessagesPerMonth: 60 };
const mid = new Date("2026-08-14T15:00:00.000Z");

describe("summarizeAdvisorUsage", () => {
  it("reports nothing binding while under both caps", () => {
    const u = summarizeAdvisorUsage({ dayCount: 2, monthCount: 20 }, FREE, mid);
    expect(u.bindingScope).toBeNull();
    expect(u.resetsAt).toBeNull();
    expect(u.remainingToday).toBe(3);
    expect(u.remainingThisMonth).toBe(40);
  });

  it("reports daily when only the day is exhausted", () => {
    const u = summarizeAdvisorUsage({ dayCount: 5, monthCount: 20 }, FREE, mid);
    expect(u.bindingScope).toBe("daily");
    expect(u.resetsAt).toBe("2026-08-15T00:00:00.000Z");
  });

  it("reports monthly when only the month is exhausted", () => {
    const u = summarizeAdvisorUsage({ dayCount: 1, monthCount: 60 }, FREE, mid);
    expect(u.bindingScope).toBe("monthly");
    expect(u.resetsAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("reports the LONGER wait when both caps are blown", () => {
    // The original defect: a bare `false` was always read as "today", so a user whose
    // month was gone was told their messages returned tomorrow.
    const u = summarizeAdvisorUsage({ dayCount: 5, monthCount: 60 }, FREE, mid);
    expect(u.bindingScope).toBe("monthly");
    expect(u.resetsAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("never reports a negative remainder", () => {
    const u = summarizeAdvisorUsage({ dayCount: 9, monthCount: 99 }, FREE, mid);
    expect(u.remainingToday).toBe(0);
    expect(u.remainingThisMonth).toBe(0);
  });

  it("rolls the daily reset across a month boundary", () => {
    const eom = new Date("2026-08-31T23:00:00.000Z");
    expect(nextDailyResetIso(eom)).toBe("2026-09-01T00:00:00.000Z");
  });

  it("rolls the monthly reset across a year boundary", () => {
    const eoy = new Date("2026-12-20T10:00:00.000Z");
    expect(nextMonthlyResetIso(eoy)).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("nextTierUp", () => {
  it("walks the ladder", () => {
    expect(nextTierUp("free")).toBe("plus");
    expect(nextTierUp("plus")).toBe("pro");
    expect(nextTierUp("pro")).toBe("family");
  });

  it("has nothing above family", () => {
    expect(nextTierUp("family")).toBeNull();
  });
});

describe("overQuotaCopy", () => {
  it("names the month when the month is what ran out", () => {
    const c = overQuotaCopy({ scope: "monthly", resetsAt: null, tier: "free" });
    expect(c.title).toBe("You've used this month's messages.");
  });

  it("names the day when the day is what ran out", () => {
    const c = overQuotaCopy({ scope: "daily", resetsAt: null, tier: "free" });
    expect(c.title).toBe("You've used today's messages.");
  });

  it("claims no window when usage could not be read", () => {
    const c = overQuotaCopy({ scope: null, resetsAt: null, tier: "free" });
    expect(c.title).toBe("You've reached your message limit.");
    expect(c.resetsAt).toBeNull();
  });

  it("never asks a top-tier subscriber to upgrade", () => {
    const c = overQuotaCopy({ scope: "daily", resetsAt: null, tier: "family" });
    expect(c.canUpgrade).toBe(false);
    expect(c.upgradeHref).toBeUndefined();
    expect(c.nextTierName).toBeUndefined();
  });

  it("offers the next tier up by name below the top", () => {
    expect(overQuotaCopy({ scope: "daily", resetsAt: null, tier: "free" }).nextTierName).toBe(
      "HōMI Plus",
    );
    expect(overQuotaCopy({ scope: "daily", resetsAt: null, tier: "pro" }).nextTierName).toBe(
      "HōMI Family",
    );
  });

  it("never names a SKU 'Companion'", () => {
    for (const tier of ["free", "plus", "pro", "family"] as const) {
      for (const scope of ["daily", "monthly", null] as const) {
        const c = overQuotaCopy({ scope, resetsAt: null, tier });
        expect(c.title).not.toMatch(/Companion/i);
        expect(c.nextTierName ?? "").not.toMatch(/Companion/i);
      }
    }
  });
});

describe("formatQuotaReset", () => {
  it("returns empty for a missing or unparseable instant", () => {
    expect(formatQuotaReset("daily", null)).toBe("");
    expect(formatQuotaReset("daily", "not-a-date")).toBe("");
  });

  it("always carries a clock time, so a monthly reset never reads as a bare date", () => {
    // In US Eastern, 2026-09-01T00:00Z is Aug 31 8:00 PM. Without the time this
    // rendered "Resets Aug 31." under a "this month's messages" headline.
    const out = formatQuotaReset("monthly", "2026-09-01T00:00:00.000Z");
    expect(out).toMatch(/^Resets /);
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });

  it("uses a weekday for daily and a date for monthly", () => {
    expect(formatQuotaReset("daily", "2026-08-24T00:00:00.000Z")).toMatch(
      /Mon|Tue|Wed|Thu|Fri|Sat|Sun/,
    );
    expect(formatQuotaReset("monthly", "2026-09-01T00:00:00.000Z")).toMatch(
      /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/,
    );
  });
});

describe("SQL/TS lockstep", () => {
  // The day boundary exists twice: once in the quota RPC, once in lib/advisor/usage.ts.
  // Only a comment held them together, and a comment does not fail a build. If the SQL
  // bucket ever moves (e.g. a fixed offset, or a per-user timezone), usage.ts must move
  // with it — otherwise the reset time shown to users silently becomes wrong while every
  // other test still passes.
  const sql = readFileSync("supabase/migrations/00030_advisor_monthly_quota.sql", "utf8");

  it("the RPC still buckets on a bare UTC current_date", () => {
    expect(sql).toMatch(/values \(uid, current_date, 0\)/);
    expect(sql).toMatch(/date_trunc\('month', current_date\)/);
  });

  it("the RPC applies no timezone or offset that usage.ts does not model", () => {
    expect(sql).not.toMatch(/at time zone/i);
    expect(sql).not.toMatch(/current_date\s*[-+]\s*interval/i);
  });
});
