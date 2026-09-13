import { describe, expect, it } from "vitest";
import { KEY_AREA_STATUS, keyAreaStatus, keyAreasFromReading } from "@/lib/dashboard/key-areas";

describe("Home Key Factors", () => {
  it("caps at 6 LOOK tiles and never says On track while a hard stop is active", () => {
    const areas = keyAreasFromReading({
      financialScore: 18,
      emotionalScore: 28,
      timingScore: 22,
      runwayMonths: 0.5,
      stopCode: "RUNWAY_UNDER_1_MONTH",
      hardStopActive: true,
    });
    expect(areas).toHaveLength(6);
    expect(areas.map((a) => a.title)).toEqual([
      "Emergency Runway",
      "Income Stability",
      "Debt Management",
      "Housing Affordability",
      "Emotional Readiness",
      "Perfect Timing",
    ]);
    expect(areas[0].status).toBe(KEY_AREA_STATUS.needsWork);
    expect(areas[1].status).toBe(KEY_AREA_STATUS.needsWork);
    expect(areas[2].status).toBe(KEY_AREA_STATUS.notAssessed);
    expect(areas[3].status).toBe(KEY_AREA_STATUS.notAssessed);
    expect(areas[4].status).toBe(KEY_AREA_STATUS.strong);
    expect(areas[5].status).toBe(KEY_AREA_STATUS.strong);
    expect(areas.map((a) => a.status).join(" ")).not.toMatch(/On track|READY/i);
    expect(areas[2].note).toBe("No DTI stop · no invent.");
    expect(areas[3].note).toBe("No housing-ratio stop.");
    expect(keyAreaStatus(90, true)).toBe(KEY_AREA_STATUS.strong);
    expect(keyAreaStatus(90, true)).not.toBe("On track");
    expect(keyAreaStatus(null, true)).toBe(KEY_AREA_STATUS.notAssessed);
  });

  it("marks unmeasured pillars Not assessed instead of inventing Strong", () => {
    const areas = keyAreasFromReading({
      financialScore: 20,
      emotionalScore: null,
      timingScore: 22,
      runwayMonths: 2,
      stopCode: null,
      hardStopActive: false,
    });
    expect(areas.map((a) => a.id)).toEqual([
      "runway",
      "income",
      "debt",
      "housing",
      "emotional",
      "timing",
    ]);
    expect(areas).toHaveLength(6);
    expect(areas.find((a) => a.id === "emotional")?.status).toBe(KEY_AREA_STATUS.notAssessed);
    expect(areas.find((a) => a.id === "emotional")?.note).toBe("Not scored on this reading.");
    expect(areas.find((a) => a.id === "timing")?.status).toBe(KEY_AREA_STATUS.strong);
    expect(areas.find((a) => a.id === "income")?.status).toBe(KEY_AREA_STATUS.needsWork);
  });

  it("paints DTI and housing Needs work only from live hard_stops — never invent Strong", () => {
    const areas = keyAreasFromReading({
      financialScore: 30,
      emotionalScore: 20,
      timingScore: 20,
      runwayMonths: 3,
      stopCode: "DTI_OVER_50",
      stopCodes: ["DTI_OVER_50", "HOUSING_RATIO_OVER_45"],
      hardStopActive: true,
    });
    expect(areas.find((a) => a.id === "debt")?.status).toBe(KEY_AREA_STATUS.needsWork);
    expect(areas.find((a) => a.id === "housing")?.status).toBe(KEY_AREA_STATUS.needsWork);
    expect(areas.find((a) => a.id === "runway")?.status).toBe(KEY_AREA_STATUS.strong);
    expect(areas.map((a) => a.status).join(" ")).not.toMatch(/On track|READY/i);
  });
});
