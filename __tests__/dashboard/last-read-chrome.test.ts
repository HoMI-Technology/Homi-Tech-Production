import { describe, expect, it } from "vitest";
import type { VerdictKey } from "@/lib/brand";
import {
  LAST_READ_STRONGER,
  LAST_READ_WEAKER,
  PUBLIC_VERDICT_LABELS,
  compactScoreAgeLine,
  lastReadAgeCompact,
  lastReadAgeFrom,
  lastReadHeadline,
  moneyPictureDirection,
  moneyPictureDirectionLine,
  publicVerdictLabel,
} from "@/lib/dashboard/last-read-chrome";

describe("last-read chrome — MEASURE_ACT_W1", () => {
  it("uses Brand verdict words and calendar age", () => {
    const keys: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];
    const labels = keys.map(publicVerdictLabel);
    expect(labels).toEqual(["READY", "ALMOST THERE", "BUILD FIRST", "DO NOT PROCEED"]);
    expect(labels).toEqual([...PUBLIC_VERDICT_LABELS]);
    for (const label of labels) {
      expect(label).not.toBe("NOT_YET");
      expect(label).not.toMatch(/^Not yet$/i);
    }
    expect(lastReadAgeFrom("2026-03-15T12:00:00.000Z")).toBe("from March 15.");
    expect(lastReadHeadline("BUILD_FIRST", "from March 15.")).toBe(
      "Last read: BUILD FIRST from March 15.",
    );
    expect(lastReadHeadline("READY", null)).toBe("Last read: READY");
    expect(lastReadHeadline("NOT_YET", "from March 15.")).toBe(
      "Last read: DO NOT PROCEED from March 15.",
    );
    expect(lastReadHeadline("BUILD_FIRST", "from March 15.")).not.toMatch(/closer to/i);
  });

  it("compact Home line is score · from {Mon D} — never Last read + verdict", () => {
    expect(lastReadAgeCompact("2026-08-29T12:00:00.000Z")).toBe("from Aug 29");
    expect(lastReadAgeCompact("2026-03-15T12:00:00.000Z")).toBe("from Mar 15");
    expect(compactScoreAgeLine(61, "from Aug 29")).toBe("61 · from Aug 29");
    expect(compactScoreAgeLine(61, null)).toBe("61");
    expect(compactScoreAgeLine(61, "from Aug 29")).not.toMatch(/Last read/i);
    expect(compactScoreAgeLine(61, "from Aug 29")).not.toMatch(/DO NOT PROCEED/);
    expect(compactScoreAgeLine(61, "from Aug 29")).not.toMatch(/NOT_YET/);
    expect(compactScoreAgeLine(61, "from Aug 29")).not.toMatch(/closer to/i);
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
    expect(
      moneyPictureDirection({
        lastDtiRatio: 0.4,
        lastEmergencyFundMonths: 2,
        lastSavingsRateRatio: 0.06,
        currentDtiPercent: 27,
        currentEmergencyFundMonths: 2,
        currentSavingsRatePercent: 6,
      }),
    ).toBeNull();
    expect(moneyPictureDirectionLine(null)).toBeNull();
    expect(LAST_READ_STRONGER).not.toMatch(/closer to/i);
    expect(LAST_READ_WEAKER).not.toMatch(/closer to/i);
  });
});
