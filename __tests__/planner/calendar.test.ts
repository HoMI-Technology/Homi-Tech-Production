import { describe, it, expect } from "vitest";
import {
  billState,
  daysInMonth,
  monthEndISO,
  monthStartISO,
  shiftMonth,
  toISO,
} from "@/lib/planner/calendar";
import type { Bill } from "@/lib/planner/types";

describe("planner calendar pure helpers", () => {
  it("computes month bounds for August 2026", () => {
    const ref = { year: 2026, month: 7 }; // 0-based August
    expect(monthStartISO(ref)).toBe("2026-08-01");
    expect(monthEndISO(ref)).toBe("2026-08-31");
    expect(daysInMonth(2026, 7)).toBe(31);
  });

  it("shifts months across year boundaries", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({
      year: 2027,
      month: 0,
    });
  });

  it("classifies bill visual states", () => {
    const base: Bill = {
      id: "b1",
      name: "Rent",
      amount: 1800,
      category: "housing",
      dueDate: "2026-08-05",
      status: "upcoming",
      frequency: "monthly",
      autopay: false,
    };
    expect(billState({ ...base, status: "paid" }, "2026-08-01")).toBe("paid");
    expect(
      billState(
        { ...base, status: "overdue", dueDate: "2026-07-01" },
        "2026-08-01",
      ),
    ).toBe("overdue");
    expect(
      billState(
        { ...base, status: "due", dueDate: "2026-08-01" },
        "2026-08-01",
      ),
    ).toBe("due");
  });

  it("toISO pads month and day", () => {
    expect(toISO(2026, 0, 5)).toBe("2026-01-05");
  });
});
