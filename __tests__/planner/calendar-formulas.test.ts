/**
 * Decision-calendar formula parity — ported from the Vite reference
 * build's planner-calendar.test.mjs acceptance suite.
 *
 * Dates are anchored to the seed: buildDemoSeed dates every bill and
 * ledger row relative to "today", so each assertion derives its ISO
 * anchor from the seed's own bill dueDates (TECO is always due "today",
 * rent +3d, Spectrum +5d, Netflix +8d) rather than hardcoding the
 * screenshot's calendar date.
 *
 * The numbers are the contract (screenshot canon, cal-final-* /
 * cal-ultra-addbill.png / cal-final-inspector.png):
 *
 *   EOM projected    = cashNow − Σ open bills                = $16,374.72
 *   Proj on +5d      = cashNow − (112.40 + 1,850 + 79.99)    = $16,678.21
 *   Proj on +8d      = cashNow − (… + 15.49)                 = $16,662.72
 *   DAY IMPACT today = 0 in − 0 out − 112.40                 = −$112.40
 */

import { describe, it, expect } from "vitest";
import { buildDemoSeed, summarizeAccounts, upcomingBillsTotal } from "@/lib/planner/derived";
import {
  billState,
  buildAgendaDays,
  buildRunwaySeries,
  dayRollup,
  monthOfISO,
  monthWindowStats,
  projectedCashOn,
} from "@/lib/planner/calendar";
import type { Bill } from "@/lib/planner/types";

// The screenshots' "today" was the 2nd of a 31-day month; any such date
// reproduces the layout. Everything below is derived from the seed.
const seed = buildDemoSeed(new Date("2031-01-02T12:00:00"));
const { bills, transactions, accounts } = seed;

function billById(id: string): Bill {
  const b = bills.find((bill) => bill.id === id);
  if (!b) throw new Error(`seed bill missing: ${id}`);
  return b;
}

const TODAY = billById("bill-demo-teco").dueDate; // offset +0 → the seed's "today"
const RENT_DAY = billById("bill-demo-rent").dueDate; // +3d
const SPECTRUM_DAY = billById("bill-demo-spectrum").dueDate; // +5d
const NETFLIX_DAY = billById("bill-demo-netflix").dueDate; // +8d

const cashNow = summarizeAccounts(accounts).cash;
const openTotal = upcomingBillsTotal(bills);

describe("demo-seed calendar anchors", () => {
  it("cashNow $18,720.60 and open bills $2,345.88 feed every formula", () => {
    expect(Math.abs(cashNow - 18720.6)).toBeLessThan(0.01);
    expect(Math.abs(openTotal - 2345.88)).toBeLessThan(0.01);
  });
});

describe("EOM projected — cashNow − Σ open bills", () => {
  it("equals $16,374.72 on the demo seed and steps down at due dates", () => {
    const series = buildRunwaySeries(cashNow, bills, transactions, monthOfISO(TODAY));
    // The formula, not the absolute: EOM = cash − ALL open bills.
    expect(series.eomProjected).toBe(Number((cashNow - openTotal).toFixed(2)));
    // Demo-seed absolute (screenshot: $16,374.72).
    expect(series.eomProjected).toBe(16374.72);
    expect(series.points).toHaveLength(31);

    // Month starts at full cash; the first step-down lands on TECO's day.
    expect(series.points[0]?.cash).toBe(cashNow);
    expect(series.points[1]?.dateISO).toBe(TODAY);
    expect(series.points[1]?.cash).toBe(Number((cashNow - 112.4).toFixed(2)));
    // Flat between bill days.
    expect(series.points[2]?.cash).toBe(series.points[1]?.cash);
    expect(series.points[3]?.cash).toBe(series.points[1]?.cash);
    // Steps down by rent on its due day.
    expect(series.points[4]?.dateISO).toBe(RENT_DAY);
    expect(series.points[4]?.cash).toBe(Number((cashNow - 112.4 - 1850).toFixed(2)));
    // Last day of month: every demo bill has hit, so cash === EOM.
    expect(series.points[30]?.cash).toBe(series.eomProjected);
  });
});

describe("projectedCashOn — selected-day Proj $", () => {
  it("+5d (Spectrum day) = $16,678.21 — bills due on/before that day", () => {
    // Screenshot cal-ultra-addbill.png: "Proj $16,678.21".
    expect(projectedCashOn(SPECTRUM_DAY, cashNow, bills)).toBe(16678.21);
  });

  it("+8d (Netflix day) = $16,662.72", () => {
    // Screenshot cal-final-inspector.png: "Proj $16,662.72".
    expect(projectedCashOn(NETFLIX_DAY, cashNow, bills)).toBe(16662.72);
  });
});

describe("dayRollup — DAY IMPACT", () => {
  it("today: TECO $112.40 → impact −$112.40", () => {
    const r = dayRollup(TODAY, bills, transactions);
    expect(r.in).toBe(0);
    expect(r.out).toBe(0);
    expect(r.bills).toBe(112.4);
    expect(r.impact).toBe(-112.4);
    expect(r.pressure).toBe(112.4);
    expect(r.billItems).toHaveLength(1);
    expect(r.billItems[0]?.name).toBe("TECO electric");
  });

  it("rent day: $1,850 → impact −$1,850", () => {
    const r = dayRollup(RENT_DAY, bills, transactions);
    expect(r.bills).toBe(1850);
    expect(r.impact).toBe(-1850);
  });
});

describe("billState transitions", () => {
  const base: Bill = {
    id: "b1",
    name: "Test",
    amount: 10,
    category: "utilities",
    dueDate: TODAY,
    status: "upcoming",
    frequency: "monthly",
    autopay: false,
    source: "manual",
    paidAt: null,
  };
  const day = (offset: number) => {
    const d = new Date(`${TODAY}T12:00:00`);
    d.setDate(d.getDate() + offset);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  it("past-due unpaid → overdue, even when the stored status lags", () => {
    expect(billState({ ...base, dueDate: day(-1), status: "overdue" }, TODAY)).toBe("overdue");
    expect(billState({ ...base, dueDate: day(-1), status: "upcoming" }, TODAY)).toBe("overdue");
  });

  it("due today → due; +3d → upcoming; +18d autopay → scheduled", () => {
    expect(billState({ ...base, dueDate: TODAY, status: "due" }, TODAY)).toBe("due");
    expect(billState({ ...base, dueDate: day(3), status: "upcoming" }, TODAY)).toBe("upcoming");
    expect(
      billState({ ...base, dueDate: day(18), status: "scheduled", autopay: true }, TODAY),
    ).toBe("scheduled");
  });

  it("paidAt alone is enough → paid", () => {
    expect(
      billState(
        { ...base, dueDate: day(18), status: "paid", paidAt: `${TODAY}T00:00:00.000Z` },
        TODAY,
      ),
    ).toBe("paid");
    expect(
      billState({ ...base, dueDate: TODAY, status: "due", paidAt: `${TODAY}T00:00:00.000Z` }, TODAY),
    ).toBe("paid");
  });
});

describe("forward-looking month window", () => {
  it("counts only events from today through month end (screenshot: $0.00 / 0)", () => {
    // Every demo ledger row predates the seed's "today", so the window is
    // empty even though the month holds plenty of history.
    const stats = monthWindowStats(monthOfISO(TODAY), bills, transactions, TODAY);
    expect(stats.monthIncome).toBe(0);
    expect(stats.monthSpend).toBe(0);
    expect(stats.incomeEvents).toBe(0);
    expect(stats.spendEvents).toBe(0);
    expect(stats.netCashFlow).toBe(0);
    // Open-bill tiles are date-independent: all 6 open bills, $2,345.88.
    expect(stats.billsOpenCount).toBe(6);
    expect(stats.billsOpenTotal).toBe(2345.88);
    // Due within 7 days of today: TECO (+0), rent (+3), Spectrum (+5).
    expect(stats.billsDueSoon).toBe(3);
  });
});

describe("buildAgendaDays", () => {
  it("lists the 6 bill days in the next 21 days, in due order", () => {
    const days = buildAgendaDays(bills, transactions, TODAY, 21);
    expect(days).toHaveLength(6);
    expect(days[0]?.dateISO).toBe(TODAY);
    expect(days[0]?.offsetDays).toBe(0);
    expect(days[0]?.billsTotal).toBe(112.4);
    expect(days.map((d) => d.offsetDays)).toEqual([0, 3, 5, 8, 12, 18]);
  });
});
