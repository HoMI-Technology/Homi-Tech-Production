import { describe, expect, it } from "vitest";
import type { VerdictKey } from "@/lib/brand";
import {
  LAST_READ_STRONGER,
  LAST_READ_WEAKER,
  PUBLIC_VERDICT_LABELS,
  lastReadAgeDays,
  lastReadAgeFrom,
  lastReadHeadline,
  moneyPictureDirection,
  moneyPictureDirectionLine,
  publicVerdictLabel,
} from "@/lib/dashboard/last-read-chrome";

describe("last-read chrome — MEASURE_ACT_W1 + Phase 4", () => {
  it("uses Brand verdict words and omits age under 30 days", () => {
    const keys: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];
    const labels = keys.map(publicVerdictLabel);
    expect(labels).toEqual(["READY", "ALMOST THERE", "BUILD FIRST", "DO NOT PROCEED"]);
    expect(labels).toEqual([...PUBLIC_VERDICT_LABELS]);
    for (const label of labels) {
      expect(label).not.toBe("NOT_YET");
      expect(label).not.toMatch(/^Not yet$/i);
    }
    expect(lastReadAgeFrom("2026-03-15T12:00:00.000Z")).toBe("from March 15.");
    expect(lastReadHeadline("BUILD_FIRST", 2, "from March 15.")).toBeNull();
    expect(lastReadHeadline("READY", 0, "from March 15.")).toBeNull();
    expect(lastReadHeadline("NOT_YET", 45, "from March 15.")).toBe("from March 15.");
    expect(lastReadHeadline("BUILD_FIRST", 45, "from March 15.")).not.toMatch(/BUILD FIRST|Last read:/i);
    expect(lastReadHeadline("BUILD_FIRST", 45, "from March 15.")).not.toMatch(/closer to/i);
  });

  it("counts calendar age without inventing 0d chrome", () => {
    const now = Date.parse("2026-04-14T12:00:00.000Z");
    expect(lastReadAgeDays("2026-04-14T08:00:00.000Z", now)).toBe(0);
    expect(lastReadAgeDays("2026-03-15T12:00:00.000Z", now)).toBe(30);
    expect(lastReadHeadline("BUILD_FIRST", lastReadAgeDays("2026-04-14T08:00:00.000Z", now), lastReadAgeFrom("2026-04-14T08:00:00.000Z"))).toBeNull();
    expect(lastReadHeadline("BUILD_FIRST", lastReadAgeDays("2026-03-15T12:00:00.000Z", now), lastReadAgeFrom("2026-03-15T12:00:00.000Z"))).toBe(
      "from March 15.",
    );
  });

  it("emits stronger only when DTI, EF, and savings-rate all moved the same way", () => {
    const direction = moneyPictureDirection({
      lastDtiRatio: 0.4,
      lastEmergencyFundMonths: 2,
      lastSavingsRateRatio: 0.06,
      currentDtiPercent: 27,
      currentEmergencyFundMonths: 6,
      currentSavingsRatePercent: 21,
    });
    expect(direction).toBe("stronger");
    expect(moneyPictureDirectionLine(direction)).toBe(LAST_READ_STRONGER);
  });

  it("emits weaker only when all three moved weaker — including READY", () => {
    const direction = moneyPictureDirection({
      lastDtiRatio: 0.2,
      lastEmergencyFundMonths: 6,
      lastSavingsRateRatio: 0.22,
      currentDtiPercent: 44,
      currentEmergencyFundMonths: 2,
      currentSavingsRatePercent: 4,
    });
    expect(direction).toBe("weaker");
    expect(moneyPictureDirectionLine(direction)).toBe(LAST_READ_WEAKER);
  });

  it("omits mixed or unchanged — no closer-to band claim", () => {
    expect(
      moneyPictureDirection({
        lastDtiRatio: 0.4,
        lastEmergencyFundMonths: 2,
        lastSavingsRateRatio: 0.06,
        currentDtiPercent: 27,
        currentEmergencyFundMonths: 1.2,
        currentSavingsRatePercent: 21,
      }),
    ).toBeNull();
    expect(moneyPictureDirectionLine(null)).toBeNull();
    expect(LAST_READ_STRONGER).not.toMatch(/closer to/i);
    expect(LAST_READ_WEAKER).not.toMatch(/closer to/i);
  });
});
