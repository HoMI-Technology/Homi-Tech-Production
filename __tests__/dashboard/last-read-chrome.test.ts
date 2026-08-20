import { describe, expect, it } from "vitest";
import {
  LAST_READ_STRONGER,
  LAST_READ_WEAKER,
  lastReadAgeFrom,
  moneyPictureDirection,
  moneyPictureDirectionLine,
  publicVerdictLabel,
} from "@/lib/dashboard/last-read-chrome";

describe("last-read chrome — Lock 1", () => {
  it("uses Brand verdict words and calendar age", () => {
    expect(publicVerdictLabel("NOT_YET")).toBe("DO NOT PROCEED");
    expect(publicVerdictLabel("READY")).toBe("READY");
    expect(lastReadAgeFrom("2026-03-15T12:00:00.000Z")).toBe("from March 15.");
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

  it("emits weaker only when all three moved weaker", () => {
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
    expect(
      moneyPictureDirection({
        lastDtiRatio: 0.3,
        lastEmergencyFundMonths: 4,
        lastSavingsRateRatio: 0.12,
        currentDtiPercent: 32,
        currentEmergencyFundMonths: 4.5,
        currentSavingsRatePercent: 11,
      }),
    ).toBeNull();
    expect(moneyPictureDirectionLine(null)).toBeNull();
    expect(LAST_READ_STRONGER).not.toMatch(/closer to/i);
    expect(LAST_READ_WEAKER).not.toMatch(/closer to/i);
  });
});
