import { describe, expect, it } from "vitest";
import {
  defineDti,
  definePeriodSurplus,
  defineRunwayMonths,
  metricsFromLedger,
  completenessLabel,
} from "@/lib/finance/metrics";
import {
  addManualTransaction,
  emptyBudgetLedger,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";

describe("definePeriodSurplus", () => {
  it("uses income - expense - debtPayments", () => {
    const s = definePeriodSurplus({
      incomeCents: 900_000,
      netExpenseCents: 400_000,
      debtPaymentsCents: 100_000,
    });
    expect(s.dollars).toBe(4000);
    expect(s.formula).toBe("income - netExpense - debtPayments");
  });
});

describe("defineDti", () => {
  it("returns null when debt is unknown — never invent 0% DTI", () => {
    expect(
      defineDti({ incomeCents: 900_000, debtPaymentsCents: null }).pct,
    ).toBeNull();
  });

  it("computes pct when both known", () => {
    const d = defineDti({ incomeCents: 1_000_000, debtPaymentsCents: 300_000 });
    expect(d.pct).toBeCloseTo(30, 5);
  });
});

describe("defineRunwayMonths", () => {
  it("returns null liquid when missing", () => {
    const r = defineRunwayMonths({
      liquidCents: null,
      monthlyOutflowCents: 400_000,
      liquidSource: "missing",
    });
    expect(r.months).toBeNull();
    expect(r.liquidSource).toBe("missing");
  });
});

describe("metricsFromLedger", () => {
  it("marks thin completeness for a single month of manual data", () => {
    const nowIso = "2026-08-08T12:00:00.000Z";
    let ledger: BudgetLedgerState = emptyBudgetLedger(nowIso);
    ledger = addManualTransaction(
      ledger,
      {
        type: "income",
        amountCents: 900_000,
        description: "Pay",
        categoryId: "cat-payroll",
        transactionDate: "2026-08-01",
      },
      nowIso,
    );
    const m = metricsFromLedger(ledger, nowIso, nowIso);
    expect(m.source).toBe("ledger");
    expect(m.evidence.completeness).toBe("low");
    expect(m.surplus.incomeDollars).toBe(9000);
    expect(m.dti.pct).toBeNull();
    expect(m.evidence.hasDebtSignal).toBe(false);
  });
});

describe("completenessLabel", () => {
  it("never says Live picture", () => {
    expect(completenessLabel("high")).not.toMatch(/live/i);
    expect(completenessLabel("low")).toBe("Thin picture");
  });
});
