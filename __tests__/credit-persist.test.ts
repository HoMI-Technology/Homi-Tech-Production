import { describe, expect, it } from "vitest";
import { mapCreditRow } from "@/lib/credit/persist";

describe("mapCreditRow", () => {
  it("maps a production credit_snapshots row", () => {
    expect(
      mapCreditRow({
        id: "c1",
        score: 710,
        utilization: 22,
        on_time_streak_months: 18,
        completed_at: "2026-08-12T00:00:00.000Z",
      }),
    ).toEqual({ score: 710, utilization: 22, onTimeStreakMonths: 18 });
  });
});
