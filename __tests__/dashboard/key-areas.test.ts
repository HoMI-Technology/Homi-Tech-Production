import { describe, expect, it } from "vitest";
import { KEY_AREA_STATUS, keyAreaStatus, keyAreasFromReading } from "@/lib/dashboard/key-areas";

describe("Home Key Areas", () => {
  it("caps at 4 SSOT tiles and never says On track while a hard stop is active", () => {
    const areas = keyAreasFromReading({
      financialScore: 18,
      emotionalScore: 28,
      timingScore: 22,
      runwayMonths: 0.5,
      stopCode: "RUNWAY_UNDER_1_MONTH",
      hardStopActive: true,
    });
    expect(areas).toHaveLength(4);
    expect(areas.map((a) => a.title)).toEqual([
      "Runway",
      "Financial Reality",
      "Emotional Truth",
      "Perfect Timing",
    ]);
    expect(areas[0].status).toBe(KEY_AREA_STATUS.needsWork);
    expect(areas[1].status).toBe(KEY_AREA_STATUS.needsWork);
    expect(areas[2].status).toBe(KEY_AREA_STATUS.strong);
    expect(areas[3].status).toBe(KEY_AREA_STATUS.strong);
    expect(areas.map((a) => a.status).join(" ")).not.toMatch(/On track|READY/i);
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
    expect(areas.map((a) => a.id)).toEqual(["runway", "financial", "emotional", "timing"]);
    expect(areas).toHaveLength(4);
    expect(areas.find((a) => a.id === "emotional")?.status).toBe(KEY_AREA_STATUS.notAssessed);
    expect(areas.find((a) => a.id === "emotional")?.note).toBe("Not scored on this reading.");
    expect(areas.find((a) => a.id === "timing")?.status).toBe(KEY_AREA_STATUS.strong);
  });
});
