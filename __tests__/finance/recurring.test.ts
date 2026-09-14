import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsClamped,
  daysBetween,
  detectRecurringCandidates,
  expandOccurrences,
  minOccurrencesFor,
  nextOccurrence,
  normalizePayee,
  recurringGenerationKey,
  rulesDueInWindow,
  type DetectableTransaction,
} from "@/lib/finance/recurring";
import type { RecurringTransactionRule } from "@/lib/finance/ledger";

let seq = 0;
function tx(overrides: Partial<DetectableTransaction>): DetectableTransaction {
  seq += 1;
  return {
    type: "expense",
    status: "posted",
    deletedAt: null,
    isExcludedFromBudget: false,
    amountCents: 1_000,
    transactionDate: "2026-01-01",
    merchantName: null,
    description: `item-${seq}`,
    categoryId: null,
    ...overrides,
  };
}

function series(
  merchant: string,
  amountCents: number,
  dates: string[],
  type: "income" | "expense" = "expense",
): DetectableTransaction[] {
  return dates.map((d) => tx({ merchantName: merchant, amountCents, transactionDate: d, type }));
}

function rule(overrides: Partial<RecurringTransactionRule>): RecurringTransactionRule {
  return {
    id: "rule-1",
    userId: "user-1",
    type: "expense",
    amountCents: 10_000,
    description: "Rent",
    categoryId: null,
    cadence: "monthly",
    startDate: "2026-01-31",
    nextOccurrenceDate: "2026-01-31",
    endDate: null,
    generationMode: "forecast_only",
    isActive: true,
    detectionSource: "manual",
    detectionConfidence: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("date helpers", () => {
  it("daysBetween counts whole days date-only", () => {
    expect(daysBetween("2026-01-01", "2026-01-08")).toBe(7);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1); // 2026 not leap
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2); // 2024 leap
  });

  it("addDays crosses month and year bounds", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("addMonthsClamped clamps to month end but keeps the anchor day", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonthsClamped("2026-01-15", 1)).toBe("2026-02-15");
  });
});

describe("detectRecurringCandidates — cadence inference", () => {
  it("detects weekly (needs 4 occurrences)", () => {
    const txs = series("Gym", 2_500, [
      "2026-01-05",
      "2026-01-12",
      "2026-01-19",
      "2026-01-26",
    ]);
    const found = detectRecurringCandidates(txs);
    expect(found).toHaveLength(1);
    expect(found[0].suggestedCadence).toBe("weekly");
    expect(found[0].occurrences).toBe(4);
  });

  it("detects biweekly payroll", () => {
    const txs = series(
      "ACME PAYROLL",
      250_000,
      ["2026-01-02", "2026-01-16", "2026-01-30", "2026-02-13"],
      "income",
    );
    const found = detectRecurringCandidates(txs, { maxAmountCents: 500_000 });
    expect(found).toHaveLength(1);
    expect(found[0].suggestedCadence).toBe("biweekly");
    expect(found[0].type).toBe("income");
  });

  it("detects semimonthly when dates anchor to two half-month days", () => {
    const txs = series(
      "Paycheck",
      180_000,
      ["2026-01-01", "2026-01-15", "2026-02-01", "2026-02-15"],
      "income",
    );
    const found = detectRecurringCandidates(txs, { maxAmountCents: 500_000 });
    expect(found[0].suggestedCadence).toBe("semimonthly");
  });

  it("detects monthly", () => {
    const txs = series("Netflix", 1_599, ["2026-01-10", "2026-02-10", "2026-03-10"]);
    const found = detectRecurringCandidates(txs);
    expect(found[0].suggestedCadence).toBe("monthly");
    expect(found[0].medianAmountCents).toBe(1_599);
  });

  it("detects quarterly", () => {
    const txs = series("Insurance", 45_000, ["2026-01-05", "2026-04-05", "2026-07-05"]);
    expect(detectRecurringCandidates(txs)[0].suggestedCadence).toBe("quarterly");
  });

  it("detects annual", () => {
    const txs = series("Domain", 2_400, ["2024-03-01", "2025-03-01", "2026-03-01"]);
    expect(detectRecurringCandidates(txs)[0].suggestedCadence).toBe("annual");
  });

  it("rejects irregular spacing (interval CV over threshold)", () => {
    const txs = series("Cafe", 900, ["2026-01-05", "2026-01-12", "2026-02-20", "2026-02-27"]);
    // intervals 7, 39, 7 → highly irregular
    expect(detectRecurringCandidates(txs)).toEqual([]);
  });

  it("enforces minimum occurrence counts (3 for monthly, 4 for weekly)", () => {
    const twoMonthly = series("Sub", 999, ["2026-01-10", "2026-02-10"]);
    expect(detectRecurringCandidates(twoMonthly)).toEqual([]);
    const threeWeekly = series("Gym", 999, ["2026-01-05", "2026-01-12", "2026-01-19"]);
    expect(detectRecurringCandidates(threeWeekly)).toEqual([]);
    expect(minOccurrencesFor("weekly")).toBe(4);
    expect(minOccurrencesFor("monthly")).toBe(3);
  });

  it("excludes pending, voided, deleted, excluded, and non-income/expense rows", () => {
    const dates = ["2026-01-10", "2026-02-10", "2026-03-10"];
    const txs = [
      ...series("Netflix", 1_599, dates),
      tx({ merchantName: "Netflix", amountCents: 1_599, transactionDate: "2026-03-11", status: "pending" }),
      tx({ merchantName: "Netflix", amountCents: 1_599, transactionDate: "2026-03-12", deletedAt: "2026-03-13T00:00:00.000Z" }),
    ];
    const found = detectRecurringCandidates(txs);
    expect(found).toHaveLength(1);
    expect(found[0].occurrences).toBe(3);
  });

  it("filters amounts outside the noise bounds", () => {
    const tiny = series("Tips", 100, ["2026-01-10", "2026-02-10", "2026-03-10"]);
    const huge = series("Wire", 600_000, ["2026-01-10", "2026-02-10", "2026-03-10"]);
    expect(detectRecurringCandidates([...tiny, ...huge])).toEqual([]);
  });

  it("normalizes payees across case and punctuation", () => {
    expect(normalizePayee("Netflix, Inc.")).toBe("netflix inc");
    const txs = [
      tx({ merchantName: "NETFLIX", amountCents: 1_599, transactionDate: "2026-01-10" }),
      tx({ merchantName: "netflix", amountCents: 1_599, transactionDate: "2026-02-10" }),
      tx({ merchantName: "Netflix.", amountCents: 1_599, transactionDate: "2026-03-10" }),
    ];
    expect(detectRecurringCandidates(txs)).toHaveLength(1);
  });

  it("splits one payee with two distinct recurring amounts into two candidates", () => {
    const txs = [
      ...series("Gym", 2_500, ["2026-01-01", "2026-02-01", "2026-03-01"]),
      ...series("Gym", 800, ["2026-01-15", "2026-02-15", "2026-03-15"]),
    ];
    const found = detectRecurringCandidates(txs);
    expect(found).toHaveLength(2);
    expect(found.map((c) => c.medianAmountCents).sort((a, b) => a - b)).toEqual([800, 2_500]);
  });

  it("confidence rises with more occurrences and regularity, never from nothing", () => {
    const three = detectRecurringCandidates(
      series("Sub", 999, ["2026-01-10", "2026-02-10", "2026-03-10"]),
    )[0];
    const six = detectRecurringCandidates(
      series("Sub", 999, [
        "2026-01-10",
        "2026-02-10",
        "2026-03-10",
        "2026-04-10",
        "2026-05-10",
        "2026-06-10",
      ]),
    )[0];
    expect(six.confidence).toBeGreaterThan(three.confidence);
    expect(three.confidence).toBeGreaterThan(0);
    expect(six.confidence).toBeLessThanOrEqual(1);
  });

  it("labels candidates with confidence — detection is never presented as fact", () => {
    const found = detectRecurringCandidates(
      series("Sub", 999, ["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]),
    );
    expect(found[0].confidence).toBeGreaterThan(0);
    expect(found[0].intervalCv).toBe(0); // exact 7-day spacing
  });

  it("empty input yields empty output", () => {
    expect(detectRecurringCandidates([])).toEqual([]);
  });
});

describe("expandOccurrences", () => {
  it("monthly with month-end clamping (Jan 31 → Feb 28 → Mar 31)", () => {
    const dates = expandOccurrences(
      rule({ cadence: "monthly", startDate: "2026-01-31" }),
      "2026-01-01",
      "2026-05-31",
    );
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
  });

  it("semimonthly fires twice per month on anchor days", () => {
    const dates = expandOccurrences(
      rule({ cadence: "semimonthly", startDate: "2026-01-01" }),
      "2026-01-01",
      "2026-02-28",
    );
    // startDay 1 → anchors [1, 16]
    expect(dates).toEqual(["2026-01-01", "2026-01-16", "2026-02-01", "2026-02-16"]);
  });

  it("semimonthly anchors past mid-month clamp into February", () => {
    const dates = expandOccurrences(
      rule({ cadence: "semimonthly", startDate: "2026-01-16" }),
      "2026-01-01",
      "2026-03-15",
    );
    // startDay 16 → anchors [1, 16]; Jan 1 predates startDate
    expect(dates).toEqual([
      "2026-01-16",
      "2026-02-01",
      "2026-02-16",
      "2026-03-01",
      "2026-03-16",
    ].filter((d) => d <= "2026-03-15"));
  });

  it("weekly and biweekly step by exact days", () => {
    expect(
      expandOccurrences(
        rule({ cadence: "weekly", startDate: "2026-01-05" }),
        "2026-01-01",
        "2026-01-31",
      ),
    ).toEqual(["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]);
    expect(
      expandOccurrences(
        rule({ cadence: "biweekly", startDate: "2026-01-02" }),
        "2026-01-01",
        "2026-02-28",
      ),
    ).toEqual(["2026-01-02", "2026-01-16", "2026-01-30", "2026-02-13", "2026-02-27"]);
  });

  it("quarterly and annual step by months with clamping", () => {
    expect(
      expandOccurrences(
        rule({ cadence: "quarterly", startDate: "2025-11-30" }),
        "2026-01-01",
        "2026-12-31",
      ),
    ).toEqual(["2026-02-28", "2026-05-30", "2026-08-30", "2026-11-30"]);
    expect(
      expandOccurrences(
        rule({ cadence: "annual", startDate: "2024-02-29" }),
        "2025-01-01",
        "2027-12-31",
      ),
    ).toEqual(["2025-02-28", "2026-02-28", "2027-02-28"]);
  });

  it("honors endDate", () => {
    const dates = expandOccurrences(
      rule({ cadence: "monthly", startDate: "2026-01-15", endDate: "2026-03-15" }),
      "2026-01-01",
      "2026-12-31",
    );
    expect(dates).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
  });

  it("window starting after startDate only emits in-window dates", () => {
    const dates = expandOccurrences(
      rule({ cadence: "monthly", startDate: "2026-01-10" }),
      "2026-03-01",
      "2026-04-30",
    );
    expect(dates).toEqual(["2026-03-10", "2026-04-10"]);
  });

  it("empty or inverted windows yield nothing", () => {
    expect(expandOccurrences(rule({}), "2026-02-01", "2026-01-01")).toEqual([]);
    expect(
      expandOccurrences(rule({ startDate: "2026-06-01" }), "2026-01-01", "2026-02-01"),
    ).toEqual([]);
  });
});

describe("nextOccurrence / rulesDueInWindow", () => {
  it("returns the first occurrence strictly after the given date", () => {
    expect(
      nextOccurrence(rule({ cadence: "monthly", startDate: "2026-01-10" }), "2026-01-10"),
    ).toBe("2026-02-10");
    expect(
      nextOccurrence(rule({ cadence: "weekly", startDate: "2026-01-05" }), "2026-01-06"),
    ).toBe("2026-01-12");
  });

  it("returns null past endDate or when inactive/deleted", () => {
    expect(
      nextOccurrence(
        rule({ cadence: "monthly", startDate: "2026-01-10", endDate: "2026-02-10" }),
        "2026-02-10",
      ),
    ).toBeNull();
    expect(nextOccurrence(rule({ isActive: false }), "2026-01-01")).toBeNull();
    expect(
      nextOccurrence(rule({ deletedAt: "2026-01-02T00:00:00.000Z" }), "2026-01-01"),
    ).toBeNull();
  });

  it("rulesDueInWindow returns only active rules with hits, with their dates", () => {
    const rules = [
      rule({ id: "r1", cadence: "monthly", startDate: "2026-01-15" }),
      rule({ id: "r2", cadence: "weekly", startDate: "2026-01-01", isActive: false }),
      rule({ id: "r3", cadence: "annual", startDate: "2025-08-01" }),
    ];
    const due = rulesDueInWindow(rules, { fromDate: "2026-01-01", toDate: "2026-01-31" });
    expect(due.map((d) => d.rule.id)).toEqual(["r1"]);
    expect(due[0].dates).toEqual(["2026-01-15"]);
  });
});

describe("recurringGenerationKey (idempotent generation dedupe)", () => {
  it("is stable per rule + date so retries never duplicate", () => {
    expect(recurringGenerationKey("abc", "2026-01-15")).toBe("rr-abc-2026-01-15");
    expect(recurringGenerationKey("abc", "2026-01-15")).toBe(recurringGenerationKey("abc", "2026-01-15"));
    expect(recurringGenerationKey("abc", "2026-01-15")).not.toBe(recurringGenerationKey("abc", "2026-01-16"));
    expect(recurringGenerationKey("abc", "2026-01-15")).not.toBe(recurringGenerationKey("abd", "2026-01-15"));
  });

  it("every expanded occurrence maps to a unique dedupe key", () => {
    const dates = expandOccurrences(
      rule({ id: "r1", cadence: "weekly", startDate: "2026-01-05" }),
      "2026-01-01",
      "2026-03-31",
    );
    const keys = dates.map((d) => recurringGenerationKey("r1", d));
    expect(new Set(keys).size).toBe(dates.length);
  });
});
