import { describe, expect, it } from "vitest";
import {
  capacityAfterRecurring,
  recurringDragRatio,
  totalRecurringMonthly,
  type RecurringCapacityState,
} from "@/lib/readiness";

describe("recurring capacity", () => {
  it("sums monthly items", () => {
    const state: RecurringCapacityState = {
      items: [
        { id: "1", name: "Childcare", amount: 1200, category: "fixed" },
        { id: "2", name: "Gym", amount: 40, category: "fixed" },
      ],
      updatedAt: new Date().toISOString(),
    };
    expect(totalRecurringMonthly(state)).toBe(1240);
  });

  it("computes capacity after drag", () => {
    expect(capacityAfterRecurring(8000, 4000, 500, 1200)).toBe(2300);
    expect(capacityAfterRecurring(4000, 3500, 600, 200)).toBeLessThan(0);
  });

  it("drag ratio caps at 1", () => {
    expect(recurringDragRatio(5000, 1000)).toBeCloseTo(0.2);
    expect(recurringDragRatio(1000, 5000)).toBe(1);
    expect(recurringDragRatio(0, 100)).toBeNull();
  });
});
